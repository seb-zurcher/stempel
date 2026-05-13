import { useEffect, useState } from 'react'
import type { TimeEntry } from '../lib/db'
import { formatElapsedSeconds } from '../lib/time'
import { strings } from '../lib/strings.de'

interface Props {
  openEntry: TimeEntry | null
  onClock: () => void
}

export function ClockButton({ openEntry, onClock }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!openEntry) {
      setElapsed(0)
      return
    }
    const start = new Date(openEntry.clockIn).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [openEntry?.id])

  const isClocked = openEntry !== null

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onClock}
        className="w-full py-5 text-lg font-semibold tracking-wide rounded transition-all active:scale-[0.97] active:brightness-90"
        style={{
          backgroundColor: isClocked ? 'var(--destructive)' : 'var(--accent)',
          color: '#fff',
        }}
      >
        {isClocked ? strings.clockOut : strings.clockIn}
      </button>

      {isClocked && (
        <div className="font-mono text-4xl tabular-nums" style={{ color: 'var(--fg)' }}>
          {formatElapsedSeconds(elapsed)}
        </div>
      )}
    </div>
  )
}
