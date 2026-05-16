import { useState } from 'react'
import type { TimeEntry } from '../lib/db'
import { Dialog } from './Dialog'
import { strings } from '../lib/strings.de'

interface Props {
  entry: TimeEntry
  onSave: (updated: TimeEntry) => void
  onClose: () => void
}

const inputStyle = {
  backgroundColor: 'var(--surface)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
}

export function EditEntryDialog({ entry, onSave, onClose }: Props) {
  const [date, setDate] = useState(entry.date)
  const [clockInTime, setClockInTime] = useState(entry.clockIn.slice(11, 16))
  const [clockOutTime, setClockOutTime] = useState(entry.clockOut?.slice(11, 16) ?? '')
  const [note, setNote] = useState(entry.note)
  const [error, setError] = useState('')

  function handleSave() {
    if (!date || !clockInTime) {
      setError('Datum und Einstempelzeit sind erforderlich.')
      return
    }
    if (entry.clockOut !== null && clockOutTime && clockOutTime < clockInTime) {
      setError('Ausstempelzeit muss nach der Einstempelzeit liegen.')
      return
    }

    const updated: TimeEntry = {
      ...entry,
      date,
      clockIn: `${date}T${clockInTime}`,
      clockOut: entry.clockOut !== null ? `${date}T${clockOutTime}` : null,
      note,
      updatedAt: new Date().toISOString(),
    }
    onSave(updated)
  }

  return (
    <Dialog onClose={onClose}>
      <h3 className="font-semibold text-sm">{strings.edit}</h3>

      <div className="flex flex-col gap-3">
        {/* Date */}
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Datum</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
            style={inputStyle}
          />
        </label>

        {/* Times */}
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Von</span>
            <input
              type="time"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
              className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
              style={inputStyle}
            />
          </label>

          {entry.clockOut !== null && (
            <label className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Bis</span>
              <input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
                style={inputStyle}
              />
            </label>
          )}
        </div>

        {/* Note */}
        <label className="flex flex-col gap-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Notiz</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={strings.notePlaceholder}
            rows={2}
            className="rounded px-3 py-1.5 text-sm font-sans outline-none resize-none w-full"
            style={inputStyle}
          />
        </label>

        {error && (
          <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-sm rounded"
          style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-1.5 text-sm rounded font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          Speichern
        </button>
      </div>
    </Dialog>
  )
}
