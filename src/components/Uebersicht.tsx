import { useEffect, useState } from 'react'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, parseISO } from 'date-fns'
import { Clock, Download, Pencil, Plus, Trash2 } from 'lucide-react'
import type { TimeEntry } from '../lib/db'
import { entryDurationMinutes, formatMinutes, formatTime, todayISO } from '../lib/time'
import { strings } from '../lib/strings.de'
import { useStore } from '../store/useStore'
import { EditEntryDialog } from './EditEntryDialog'
import { ManualEntryDialog } from './ManualEntryDialog'
import { ExportDialog } from './ExportDialog'
import { Dialog } from './Dialog'

type View = 'tag' | 'woche' | 'monat'

interface Props {
  entries: TimeEntry[]
  targetMinutes: number
}

interface DateGroup {
  date: string
  entries: TimeEntry[]
}

const VIEWS: { key: View; label: string }[] = [
  { key: 'tag', label: strings.day },
  { key: 'woche', label: strings.week },
  { key: 'monat', label: strings.month },
]

function filterByView(entries: TimeEntry[], view: View): TimeEntry[] {
  const today = new Date()
  let from: string
  let to: string

  if (view === 'tag') {
    from = to = format(today, 'yyyy-MM-dd')
  } else if (view === 'woche') {
    from = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    to = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  } else {
    from = format(startOfMonth(today), 'yyyy-MM-dd')
    to = format(endOfMonth(today), 'yyyy-MM-dd')
  }

  return entries.filter((e) => e.date >= from && e.date <= to)
}

function groupByDate(entries: TimeEntry[]): DateGroup[] {
  const map = new Map<string, TimeEntry[]>()
  for (const entry of entries) {
    const group = map.get(entry.date) ?? []
    group.push(entry)
    map.set(entry.date, group)
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, es]) => ({
      date,
      entries: [...es].sort((a, b) => b.clockIn.localeCompare(a.clockIn)),
    }))
}

function formatDateHeader(isoDate: string, today: string): string {
  if (isoDate === today) return 'Heute'
  return parseISO(isoDate).toLocaleDateString('de-CH', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function Uebersicht({ entries, targetMinutes }: Props) {
  const { updateEntry, deleteEntry, createEntry } = useStore()
  const [view, setView] = useState<View>('tag')
  const [, setTick] = useState(0)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const hasOpen = entries.some((e) => e.clockOut === null)
  useEffect(() => {
    if (!hasOpen) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [hasOpen])

  const today = todayISO()
  const filtered = filterByView(entries, view)
  const groups = groupByDate(filtered)

  const aggTotal = filtered.reduce(
    (sum, e) => sum + entryDurationMinutes(e.clockIn, e.clockOut),
    0,
  )
  const aggTarget = groups.length * targetMinutes
  const aggDelta = aggTotal - aggTarget

  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: heading + toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {strings.overview}
        </h2>
        <div className="flex">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className="px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
              style={{
                borderBottomColor: view === v.key ? 'var(--accent)' : 'transparent',
                color: view === v.key ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setManualOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <Plus size={13} />
          {strings.manualEntry}
        </button>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm rounded transition-opacity hover:opacity-80"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <Download size={13} />
          {strings.export}
        </button>
      </div>

      {/* Aggregate banner — week / month only */}
      {view !== 'tag' && groups.length > 0 && (
        <div
          className="flex items-baseline justify-between px-3 py-2 rounded"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <span className="font-mono tabular-nums text-sm">
            <span style={{ color: 'var(--fg)' }}>{formatMinutes(aggTotal)}</span>
            <span style={{ color: 'var(--muted)' }}> / {formatMinutes(aggTarget)}</span>
            <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
              ({groups.length} {groups.length === 1 ? 'Tag' : 'Tage'})
            </span>
          </span>
          <span
            className="font-mono text-xs tabular-nums font-medium"
            style={{ color: aggDelta >= 0 ? '#166534' : 'var(--destructive)' }}
          >
            {aggDelta >= 0 ? '+' : '−'}
            {formatMinutes(Math.abs(aggDelta))}
          </span>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 animate-fade-in">
          <Clock size={28} style={{ color: 'var(--border)' }} />
          <p className="text-sm font-mono" style={{ color: 'var(--muted)' }}>
            Keine Einträge.
          </p>
        </div>
      )}

      {/* Date groups */}
      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const groupTotal = group.entries.reduce(
            (sum, e) => sum + entryDurationMinutes(e.clockIn, e.clockOut),
            0,
          )
          const groupDelta = groupTotal - targetMinutes

          return (
            <div key={group.date}>
              {/* Date header with daily total */}
              <div
                className="flex items-baseline justify-between pb-1 mb-1"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--muted)' }}
                >
                  {formatDateHeader(group.date, today)}
                </span>
                <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                  {formatMinutes(groupTotal)}{' '}
                  <span style={{ color: groupDelta >= 0 ? '#166534' : 'var(--destructive)' }}>
                    {groupDelta >= 0 ? '+' : '−'}
                    {formatMinutes(Math.abs(groupDelta))}
                  </span>
                </span>
              </div>

              {/* Entry rows */}
              {group.entries.map((entry) => {
                const isOpen = entry.clockOut === null
                const duration = entryDurationMinutes(entry.clockIn, entry.clockOut)

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-1.5 text-sm"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <span className="font-mono tabular-nums text-xs shrink-0 w-[5.5rem]">
                      {formatTime(entry.clockIn)}
                      {' → '}
                      {isOpen ? (
                        <span style={{ color: 'var(--accent)' }}>läuft</span>
                      ) : (
                        formatTime(entry.clockOut!)
                      )}
                    </span>
                    <span
                      className="font-mono tabular-nums text-xs shrink-0 w-14"
                      style={{ color: 'var(--muted)' }}
                    >
                      {formatMinutes(duration)}
                    </span>
                    {entry.note && (
                      <span
                        className="text-xs truncate flex-1"
                        style={{ color: 'var(--muted)' }}
                        title={entry.note}
                      >
                        {entry.note}
                      </span>
                    )}

                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      {/* Edit only available after clock-out */}
                      {!isOpen && (
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-2.5 rounded opacity-40 hover:opacity-100 transition-opacity"
                          title={strings.edit}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-2.5 rounded opacity-40 hover:opacity-100 transition-opacity"
                        title={strings.delete}
                        style={{ color: 'var(--destructive)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Export dialog */}
      {exportOpen && (
        <ExportDialog
          entries={entries}
          targetMinutes={targetMinutes}
          onClose={() => setExportOpen(false)}
        />
      )}

      {/* Manual entry dialog */}
      {manualOpen && (
        <ManualEntryDialog
          onSave={async ({ date, clockIn, clockOut, note }) => {
            await createEntry({
              date,
              clockIn: `${date}T${clockIn}`,
              clockOut: `${date}T${clockOut}`,
              note,
            })
            setManualOpen(false)
          }}
          onClose={() => setManualOpen(false)}
        />
      )}

      {/* Edit dialog */}
      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          onSave={async (updated) => {
            await updateEntry(updated)
            setEditingEntry(null)
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <Dialog onClose={() => setDeletingId(null)}>
          <p className="text-sm font-medium">{strings.confirmDelete}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setDeletingId(null)}
              className="px-4 py-1.5 text-sm rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              Abbrechen
            </button>
            <button
              onClick={async () => {
                await deleteEntry(deletingId)
                setDeletingId(null)
              }}
              className="px-4 py-1.5 text-sm rounded font-medium text-white"
              style={{ backgroundColor: 'var(--destructive)' }}
            >
              {strings.delete}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
