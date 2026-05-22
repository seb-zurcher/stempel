import { create } from 'zustand'
import * as db from '../lib/db'
import type { TimeEntry, Settings } from '../lib/db'
import type { StempelData } from '../lib/json-data'
import type { SyncData } from '../lib/sync'
import { nowLocalISO, todayISO } from '../lib/time'
import { startOAuthFlow, exchangeCode, refreshAccessToken, revokeToken } from '../lib/auth'
import { pullFromDrive, pushToDrive, mergeSyncData } from '../lib/sync'
import { useToastStore } from './useToastStore'
import { formatTime } from '../lib/time'
import { strings } from '../lib/strings.de'

// ── Types ──────────────────────────────────────────────────────────────────

interface Store {
  entries: TimeEntry[]
  settings: Settings
  isLoaded: boolean

  // Sync state (in memory only — not persisted)
  accessToken: string | null
  tokenExpiresAt: number | null
  syncStatus: 'idle' | 'syncing' | 'error'
  syncError: string | null

  getValidAccessToken: () => Promise<string | null>
  init: () => Promise<void>
  clockIn: (note: string) => Promise<void>
  clockOut: (note: string) => Promise<void>
  updateEntry: (entry: TimeEntry) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  createEntry: (fields: Pick<TimeEntry, 'date' | 'clockIn' | 'clockOut' | 'note'>) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  importData: (data: StempelData, mode: 'merge' | 'replace') => Promise<void>

  enableSync: () => Promise<void>
  handleSyncCallback: (code: string) => Promise<void>
  syncNow: () => Promise<void>
  performPush: () => Promise<void>
  signOut: () => Promise<void>
}

// ── Retry guards (prevent infinite 401 loops) ──────────────────────────────

let _syncRetry = false
let _pushRetry = false

// ── Debounced push ─────────────────────────────────────────────────────────

let _pushTimer: ReturnType<typeof setTimeout> | null = null

function schedulePush() {
  if (_pushTimer) clearTimeout(_pushTimer)
  _pushTimer = setTimeout(() => {
    _pushTimer = null
    useStore.getState().performPush().catch(console.error)
  }, 5_000)
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useStore = create<Store>((set, get) => ({
  entries: [],
  settings: db.DEFAULT_SETTINGS,
  isLoaded: false,
  accessToken: null,
  tokenExpiresAt: null,
  syncStatus: 'idle',
  syncError: null,

  async getValidAccessToken() {
    const { accessToken, tokenExpiresAt, settings } = get()
    if (!settings.syncEnabled || !settings.googleRefreshToken) return null
    // Refresh if: no token, expiry unknown, or expiry within 5 minutes
    const needsRefresh = !accessToken || !tokenExpiresAt || Date.now() > tokenExpiresAt - 5 * 60 * 1000
    if (!needsRefresh) return accessToken
    try {
      const { accessToken: newToken, expiresAt } = await refreshAccessToken(settings.googleRefreshToken)
      set({ accessToken: newToken, tokenExpiresAt: expiresAt })
      return newToken
    } catch {
      set({ syncStatus: 'error', syncError: 'Sitzung abgelaufen. Bitte neu anmelden.' })
      return null
    }
  },

  async init() {
    if (get().isLoaded) return
    const [entries, settings] = await Promise.all([db.getAllEntries(), db.getSettings()])
    set({ entries, settings, isLoaded: true })

    // Kick off initial sync if enabled — getValidAccessToken handles the refresh
    if (settings.syncEnabled && settings.googleRefreshToken) {
      get().syncNow().catch(console.error)
    }
  },

  // ── Entry mutations ──────────────────────────────────────────────────────

  async clockIn(note) {
    if (get().entries.some((e) => e.clockOut === null)) return
    const now = new Date().toISOString()
    const clockInTime = nowLocalISO()
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      date: todayISO(),
      clockIn: clockInTime,
      clockOut: null,
      note,
      createdAt: now,
      updatedAt: now,
    }
    await db.addEntry(entry)
    set((s) => ({ entries: [...s.entries, entry] }))
    useToastStore.getState().addToast(strings.toastClockedIn(formatTime(clockInTime)), 'info')
    schedulePush()
  },

  async clockOut(note) {
    const open = get().entries.find((e) => e.clockOut === null)
    if (!open) return
    const updated: TimeEntry = {
      ...open,
      clockOut: nowLocalISO(),
      note,
      updatedAt: new Date().toISOString(),
    }
    await db.updateEntry(updated)
    set((s) => ({ entries: s.entries.map((e) => (e.id === updated.id ? updated : e)) }))
    schedulePush()
  },

  async updateEntry(entry) {
    await db.updateEntry(entry)
    set((s) => ({ entries: s.entries.map((e) => (e.id === entry.id ? entry : e)) }))
    schedulePush()
  },

  async deleteEntry(id) {
    await db.deleteEntry(id)
    // Track tombstone so other devices know to remove this entry
    const updatedSettings = {
      ...get().settings,
      deletedIds: [...get().settings.deletedIds, id],
    }
    await db.saveSettings(updatedSettings)
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      settings: updatedSettings,
    }))
    schedulePush()
  },

  async createEntry(fields) {
    const now = new Date().toISOString()
    const entry: TimeEntry = { id: crypto.randomUUID(), ...fields, createdAt: now, updatedAt: now }
    await db.addEntry(entry)
    set((s) => ({ entries: [...s.entries, entry] }))
    schedulePush()
  },

  async updateSettings(patch) {
    const updated = { ...get().settings, ...patch }
    await db.saveSettings(updated)
    set({ settings: updated })
  },

  // ── JSON import ──────────────────────────────────────────────────────────

  async importData(data, mode) {
    if (mode === 'replace') {
      await db.replaceAllEntries(data.entries)
      const newSettings = { ...get().settings, dailyTargetMinutes: data.settings.dailyTargetMinutes }
      await db.saveSettings(newSettings)
      set({ entries: data.entries, settings: newSettings })
    } else {
      const localMap = new Map(get().entries.map((e) => [e.id, e]))
      const toAdd: TimeEntry[] = []
      const toUpdate: TimeEntry[] = []
      for (const imported of data.entries) {
        const local = localMap.get(imported.id)
        if (!local) { toAdd.push(imported); localMap.set(imported.id, imported) }
        else if (imported.updatedAt > local.updatedAt) { toUpdate.push(imported); localMap.set(imported.id, imported) }
      }
      for (const e of toAdd) await db.addEntry(e)
      for (const e of toUpdate) await db.updateEntry(e)
      set({ entries: [...localMap.values()] })
    }
  },

  // ── Sync ──────────────────────────────────────────────────────────────────

  async enableSync() {
    await startOAuthFlow() // redirects away; rest handled in handleSyncCallback
  },

  async handleSyncCallback(code) {
    set({ syncStatus: 'syncing', syncError: null })
    try {
      const { accessToken, refreshToken, expiresAt } = await exchangeCode(code)
      const updatedSettings = { ...get().settings, syncEnabled: true, googleRefreshToken: refreshToken }
      await db.saveSettings(updatedSettings)
      set({ accessToken, tokenExpiresAt: expiresAt, settings: updatedSettings })
      // Fire sync in background — caller navigates to Einstellungen first
      // so the success toast appears there, not on Stempeluhr.
      get().syncNow().catch(console.error)
    } catch (err) {
      set({
        syncStatus: 'error',
        syncError: err instanceof Error ? err.message : 'Authentifizierung fehlgeschlagen',
      })
    }
  },

  async syncNow() {
    const { settings, entries } = get()
    if (!settings.syncEnabled) return

    const token = await get().getValidAccessToken()
    if (!token) return

    set({ syncStatus: 'syncing', syncError: null })
    try {
      const remote = await pullFromDrive(token)

      const localData: SyncData = {
        version: 1,
        entries,
        settings: { dailyTargetMinutes: settings.dailyTargetMinutes },
        lastModified: settings.lastSyncAt ?? new Date(0).toISOString(),
        deletedIds: settings.deletedIds ?? [],
      }

      const merged = remote ? mergeSyncData(localData, remote) : localData
      await db.replaceAllEntries(merged.entries)
      await pushToDrive(token, merged)

      const updatedSettings = {
        ...get().settings,
        lastSyncAt: new Date().toISOString(),
        deletedIds: merged.deletedIds,
      }
      await db.saveSettings(updatedSettings)
      set({ entries: merged.entries, settings: updatedSettings, syncStatus: 'idle' })
      useToastStore.getState().addToast(strings.toastSyncSuccess, 'success')
      _syncRetry = false
    } catch (err) {
      const is401 = err instanceof Error && err.message.includes('401')
      if (is401 && !_syncRetry) {
        _syncRetry = true
        set({ tokenExpiresAt: null }) // force re-refresh on retry
        get().syncNow().catch(console.error)
        return
      }
      _syncRetry = false
      const msg = err instanceof Error ? err.message : 'Synchronisation fehlgeschlagen'
      set({ syncStatus: 'error', syncError: msg })
      useToastStore.getState().addToast(strings.toastSyncError, 'error')
    }
  },

  async performPush() {
    const { settings, entries } = get()
    if (!settings.syncEnabled) return

    const token = await get().getValidAccessToken()
    if (!token) return

    try {
      const data: SyncData = {
        version: 1,
        entries,
        settings: { dailyTargetMinutes: settings.dailyTargetMinutes },
        lastModified: new Date().toISOString(),
        deletedIds: settings.deletedIds ?? [],
      }
      await pushToDrive(token, data)
      const updatedSettings = { ...get().settings, lastSyncAt: new Date().toISOString() }
      await db.saveSettings(updatedSettings)
      set({ settings: updatedSettings })
      _pushRetry = false
    } catch (err) {
      const is401 = err instanceof Error && err.message.includes('401')
      if (is401 && !_pushRetry) {
        _pushRetry = true
        set({ tokenExpiresAt: null }) // force re-refresh on retry
        get().performPush().catch(console.error)
        return
      }
      _pushRetry = false
      set({
        syncStatus: 'error',
        syncError: err instanceof Error ? err.message : 'Push fehlgeschlagen',
      })
    }
  },

  async signOut() {
    const { accessToken } = get()
    if (accessToken) {
      try { await revokeToken(accessToken) } catch { /* best effort */ }
    }
    const updatedSettings = {
      ...get().settings,
      syncEnabled: false,
      googleRefreshToken: null,
      lastSyncAt: null,
    }
    await db.saveSettings(updatedSettings)
    set({ accessToken: null, tokenExpiresAt: null, settings: updatedSettings, syncStatus: 'idle', syncError: null })
  },
}))
