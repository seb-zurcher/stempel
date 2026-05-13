import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { TimeEntry } from '../lib/db'
import { formatDate } from '../lib/time'
import { strings } from '../lib/strings.de'
import { useStore } from '../store/useStore'

interface Props {
  entry: TimeEntry // open entry from a previous day
}

export function ForgottenClockOutBanner({ entry }: Props) {
  const updateEntry = useStore((s) => s.updateEntry)
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  async function handleSave() {
    if (!time) {
      setError('Bitte Ausstempelzeit angeben.')
      return
    }
    const updated: TimeEntry = {
      ...entry,
      clockOut: `${entry.date}T${time}`,
      updatedAt: new Date().toISOString(),
    }
    await updateEntry(updated)
  }

  return (
    <div
      className="rounded px-4 py-3 flex flex-col gap-3 animate-fade-in"
      style={{
        backgroundColor: 'var(--surface)',
        borderLeft: '3px solid var(--accent)',
        border: '1px solid var(--border)',
        borderLeftColor: 'var(--destructive)',
      }}
    >
      <div className="flex items-start gap-2">
        <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--destructive)' }} />
        <p className="text-sm leading-snug">
          {strings.toastForgottenClockOut(formatDate(entry.date))}
        </p>
      </div>

      <div className="flex gap-2 items-start">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs" style={{ color: 'var(--muted)' }}>Ausstempelzeit</label>
          <input
            type="time"
            value={time}
            onChange={(e) => { setTime(e.target.value); setError('') }}
            className="rounded px-3 py-1.5 text-sm font-mono outline-none"
            style={{
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
            }}
          />
          {error && <p className="text-xs" style={{ color: 'var(--accent)' }}>{error}</p>}
        </div>
        <button
          onClick={handleSave}
          className="self-end px-4 py-1.5 text-sm rounded font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Korrigieren
        </button>
      </div>
    </div>
  )
}
