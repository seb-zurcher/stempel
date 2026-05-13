import type { TimeEntry } from '../lib/db'
import { formatTime, entryDurationMinutes, formatMinutes } from '../lib/time'

interface Props {
  entries: TimeEntry[]
}

export function EntryList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm font-mono py-4" style={{ color: 'var(--muted)' }}>
        Noch kein Eintrag heute.
      </p>
    )
  }

  const sorted = [...entries].sort((a, b) => b.clockIn.localeCompare(a.clockIn))

  return (
    <div
      className="rounded text-sm"
      style={{ border: '1px solid var(--border)' }}
    >
      {sorted.map((entry) => {
        const isOpen = entry.clockOut === null
        const duration = entryDurationMinutes(entry.clockIn, entry.clockOut)

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-3 py-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="font-mono tabular-nums text-sm w-20 shrink-0">
              {formatTime(entry.clockIn)}
              {' → '}
              {isOpen ? (
                <span style={{ color: 'var(--accent)' }}>läuft</span>
              ) : (
                formatTime(entry.clockOut!)
              )}
            </span>

            <span
              className="font-mono tabular-nums text-xs w-16 shrink-0"
              style={{ color: 'var(--muted)' }}
            >
              {formatMinutes(duration)}
            </span>

            {entry.note && (
              <span
                className="text-xs truncate"
                style={{ color: 'var(--muted)' }}
                title={entry.note}
              >
                {entry.note}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
