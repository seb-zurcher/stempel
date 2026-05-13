import type { TimeEntry } from './db'

export interface SyncData {
  version: 1
  entries: TimeEntry[]
  settings: { dailyTargetMinutes: number }
  lastModified: string
  deletedIds: string[]
}

const FILES = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FILE_NAME = 'stempel-data.json'

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function findFileId(token: string): Promise<string | null> {
  const res = await fetch(
    `${FILES}?spaces=appDataFolder&q=name%3D'${FILE_NAME}'&fields=files(id)`,
    { headers: auth(token) },
  )
  if (!res.ok) throw new Error(`Drive list error ${res.status}`)
  const data = (await res.json()) as { files: { id: string }[] }
  return data.files?.[0]?.id ?? null
}

export async function pullFromDrive(token: string): Promise<SyncData | null> {
  const id = await findFileId(token)
  if (!id) return null
  const res = await fetch(`${FILES}/${id}?alt=media`, { headers: auth(token) })
  if (!res.ok) return null
  return res.json() as Promise<SyncData>
}

export async function pushToDrive(token: string, data: SyncData): Promise<void> {
  const body = JSON.stringify(data)
  const id = await findFileId(token)

  if (id) {
    const res = await fetch(`${UPLOAD}/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body,
    })
    if (!res.ok) throw new Error(`Drive update error ${res.status}`)
  } else {
    // Multipart create in App Folder
    const boundary = 'stempel_mp_boundary'
    const meta = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
    const multipart = [
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}`,
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}`,
      `\r\n--${boundary}--`,
    ].join('')

    const res = await fetch(`${UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        ...auth(token),
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body: multipart,
    })
    if (!res.ok) throw new Error(`Drive create error ${res.status}`)
  }
}

// Per-entry updatedAt wins; deletedIds is the union of both sides.
export function mergeSyncData(local: SyncData, remote: SyncData): SyncData {
  const deletedIds = [...new Set([...local.deletedIds, ...remote.deletedIds])]

  const localMap = new Map(local.entries.map((e) => [e.id, e]))
  const remoteMap = new Map(remote.entries.map((e) => [e.id, e]))
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

  const entries: TimeEntry[] = []
  for (const id of allIds) {
    if (deletedIds.includes(id)) continue
    const l = localMap.get(id)
    const r = remoteMap.get(id)
    if (!l) { entries.push(r!); continue }
    if (!r) { entries.push(l); continue }
    entries.push(l.updatedAt >= r.updatedAt ? l : r)
  }

  return {
    version: 1,
    entries,
    settings: local.settings, // local settings always win
    lastModified: new Date().toISOString(),
    deletedIds,
  }
}
