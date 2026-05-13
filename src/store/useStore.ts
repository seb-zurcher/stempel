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
  syncStatus: 'idle' | 'syncing' | 'error'
  syncError: string | null

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
  syncStatus: 'idle',
  syncError: null,

  async init() {
    if (get().isLoaded) return
    const [entries, settings] = await Promise.all([db.getAllEntries(), db.getSettings()])
    set({ entries, settings, isLoaded: true })

    // Refresh access token and kick off initial sync if enabled
    if (settings.syncEnabled && settings.googleRefreshToken) {
      try {
        const accessToken = await refreshAccessToken(settings.googleRefreshToken)
        set({ accessToken })
        get().syncNow().catch(console.error)
      } catch {
        set({ syncStatus: 'error', syncError: 'Sitzung abgelaufen. Bitte neu anmelden.' })
      }
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
      const { accessToken, refreshToken } = await exchangeCode(code)
      const updatedSettings = { ...get().settings, syncEnabled: true, googleRefreshToken: refreshToken }
      await db.saveSettings(updatedSettings)
      set({ accessToken, settings: updatedSettings })
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
    const { accessToken, settings, entries } = get()
    if (!accessToken || !settings.syncEnabled) return

    set({ syncStatus: 'syncing', syncError: null })
    try {
      const remote = await pullFromDrive(accessToken)

      const localData: SyncData = {
        version: 1,
        entries,
        settings: { dailyTargetMinutes: settings.dailyTargetMinutes },
        lastModified: settings.lastSyncAt ?? new Date(0).toISOString(),
        deletedIds: settings.deletedIds ?? [],
      }

      const merged = remote ? mergeSyncData(localData, remote) : localData
      await db.replaceAllEntries(merged.entries)
      await pushToDrive(accessToken, merged)

      const updatedSettings = {
        ...settings,
        lastSyncAt: new Date().toISOString(),
        deletedIds: merged.deletedIds,
      }
      await db.saveSettings(updatedSettings)
      set({ entries: merged.entries, settings: updatedSettings, syncStatus: 'idle' })
      useToastStore.getState().addToast(strings.toastSyncSuccess, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synchronisation fehlgeschlagen'
      set({ syncStatus: 'error', syncError: msg })
      useToastStore.getState().addToast(strings.toastSyncError, 'error')
    }
  },

  async performPush() {
    const { accessToken, settings, entries } = get()
    if (!accessToken || !settings.syncEnabled) return
    try {
      const data: SyncData = {
        version: 1,
        entries,
        settings: { dailyTargetMinutes: settings.dailyTargetMinutes },
        lastModified: new Date().toISOString(),
        deletedIds: settings.deletedIds ?? [],
      }
      await pushToDrive(accessToken, data)
      const updatedSettings = { ...settings, lastSyncAt: new Date().toISOString() }
      await db.saveSettings(updatedSettings)
      set({ settings: updatedSettings })
    } catch (err) {
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
    set({ accessToken: null, settings: updatedSettings, syncStatus: 'idle', syncError: null })
  },
}))
