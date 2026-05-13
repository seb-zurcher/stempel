import { openDB, DBSchema, IDBPDatabase } from 'idb'

// ── Types ──────────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string          // uuid v4
  date: string        // ISO date "YYYY-MM-DD" — the work day this belongs to
  clockIn: string     // ISO datetime "YYYY-MM-DDTHH:mm" (local)
  clockOut: string | null  // null = currently clocked in
  note: string
  createdAt: string   // ISO datetime, for sync conflict resolution
  updatedAt: string
}

export interface Settings {
  theme: 'system' | 'light' | 'dark'
  dailyTargetMinutes: number  // default 498 (8h 18min)
  syncEnabled: boolean
  lastSyncAt: string | null
  googleRefreshToken: string | null
  deletedIds: string[]        // tombstone list for sync conflict resolution
}

// ── Internal DB schema ─────────────────────────────────────────────────────

interface StempelDB extends DBSchema {
  entries: {
    key: string
    value: TimeEntry
    indexes: { 'by-date': string }
  }
  settings: {
    key: string
    value: Settings & { id: string }
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const DB_NAME = 'stempel'
const DB_VERSION = 1
const SETTINGS_KEY = 'default'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  dailyTargetMinutes: 498,
  syncEnabled: false,
  lastSyncAt: null,
  googleRefreshToken: null,
  deletedIds: [],
}

// ── Connection (singleton) ─────────────────────────────────────────────────

let _db: IDBPDatabase<StempelDB> | null = null

async function getDb(): Promise<IDBPDatabase<StempelDB>> {
  if (_db) return _db
  _db = await openDB<StempelDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const entryStore = db.createObjectStore('entries', { keyPath: 'id' })
      entryStore.createIndex('by-date', 'date')
      db.createObjectStore('settings', { keyPath: 'id' })
    },
  })
  return _db
}

// ── Entries ────────────────────────────────────────────────────────────────

export async function getAllEntries(): Promise<TimeEntry[]> {
  return (await getDb()).getAll('entries')
}

export async function getEntry(id: string): Promise<TimeEntry | undefined> {
  return (await getDb()).get('entries', id)
}

export async function getEntriesByDate(date: string): Promise<TimeEntry[]> {
  return (await getDb()).getAllFromIndex('entries', 'by-date', date)
}

export async function getEntriesInRange(
  from: string,
  to: string,
): Promise<TimeEntry[]> {
  const range = IDBKeyRange.bound(from, to)
  return (await getDb()).getAllFromIndex('entries', 'by-date', range)
}

// Returns the single open entry (clockOut === null), or undefined.
// At most one open entry should exist at any time.
export async function getOpenEntry(): Promise<TimeEntry | undefined> {
  const all = await getAllEntries()
  return all.find((e) => e.clockOut === null)
}

export async function addEntry(entry: TimeEntry): Promise<void> {
  await (await getDb()).add('entries', entry)
}

export async function updateEntry(entry: TimeEntry): Promise<void> {
  await (await getDb()).put('entries', entry)
}

export async function deleteEntry(id: string): Promise<void> {
  await (await getDb()).delete('entries', id)
}

export async function replaceAllEntries(entries: TimeEntry[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction('entries', 'readwrite')
  await tx.objectStore('entries').clear()
  for (const entry of entries) await tx.objectStore('entries').add(entry)
  await tx.done
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const stored = await (await getDb()).get('settings', SETTINGS_KEY)
  if (!stored) return { ...DEFAULT_SETTINGS }
  const { id: _id, ...settings } = stored
  return settings
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await getDb()).put('settings', { ...settings, id: SETTINGS_KEY })
}
