import { useEffect, useState } from 'react'
import type { TimeEntry } from '../lib/db'
import { entryDurationMinutes, formatMinutes } from '../lib/time'

interface Props {
  entries: TimeEntry[]
  targetMinutes: number
}

export function DailyProgress({ entries, targetMinutes }: Props) {
  const [, setTick] = useState(0)
  const hasOpen = entries.some((e) => e.clockOut === null)

  // Re-render every minute while an entry is open so elapsed time stays current
  useEffect(() => {
    if (!hasOpen) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [hasOpen])

  const workedMinutes = entries.reduce(
    (sum, e) => sum + entryDurationMinutes(e.clockIn, e.clockOut),
    0,
  )

  const delta = workedMinutes - targetMinutes
  const ratio = Math.min(workedMinutes / targetMinutes, 1)
  const isOver = delta >= 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm tabular-nums">
          <span style={{ color: 'var(--fg)' }}>{formatMinutes(workedMinutes)}</span>
          <span style={{ color: 'var(--muted)' }}> / {formatMinutes(targetMinutes)}</span>
        </span>

        {workedMinutes > 0 && (
          <span
            className="font-mono text-xs tabular-nums font-medium"
            style={{ color: isOver ? '#166534' : 'var(--destructive)' }}
          >
            {delta >= 0 ? '+' : '−'}
            {formatMinutes(Math.abs(delta))}
          </span>
        )}
      </div>

      {/* Thin progress bar — no border-radius for a precise look */}
      <div className="h-px w-full" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${ratio * 100}%`,
            backgroundColor: isOver ? '#166534' : 'var(--destructive)',
          }}
        />
      </div>
    </div>
  )
}
