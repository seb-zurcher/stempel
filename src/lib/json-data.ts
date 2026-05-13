import type { TimeEntry, Settings } from './db'

export interface StempelData {
  version: 1
  entries: TimeEntry[]
  settings: { dailyTargetMinutes: number }
  lastModified: string
}

export function createStempelData(entries: TimeEntry[], settings: Settings): StempelData {
  return {
    version: 1,
    entries,
    settings: { dailyTargetMinutes: settings.dailyTargetMinutes },
    lastModified: new Date().toISOString(),
  }
}

export function downloadStempelData(data: StempelData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const date = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stempel-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parseStempelData(raw: unknown): StempelData {
  if (!raw || typeof raw !== 'object') throw new Error('Ungültiges Format.')
  const d = raw as Record<string, unknown>
  if (d.version !== 1) throw new Error('Nicht unterstützte Version.')
  if (!Array.isArray(d.entries)) throw new Error('Einträge (entries) fehlen.')
  if (!d.settings || typeof d.settings !== 'object') throw new Error('Einstellungen fehlen.')
  return d as unknown as StempelData
}
