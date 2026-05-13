import { useState } from 'react'
import { Dialog } from './Dialog'
import { todayISO } from '../lib/time'
import { strings } from '../lib/strings.de'

interface Fields {
  date: string
  clockIn: string   // "HH:mm"
  clockOut: string  // "HH:mm"
  note: string
}

interface Props {
  onSave: (fields: Fields) => void
  onClose: () => void
}

const inputStyle = {
  backgroundColor: 'var(--surface)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
}

export function ManualEntryDialog({ onSave, onClose }: Props) {
  const [date, setDate] = useState(todayISO())
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    if (!date || !clockIn || !clockOut) {
      setError('Datum, Von und Bis sind erforderlich.')
      return
    }
    if (clockOut <= clockIn) {
      setError('Ausstempelzeit muss nach der Einstempelzeit liegen.')
      return
    }
    onSave({ date, clockIn, clockOut, note })
  }

  return (
    <Dialog onClose={onClose}>
      <h3 className="font-semibold text-sm">{strings.manualEntry}</h3>

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
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Von</span>
            <input
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Bis</span>
            <input
              type="time"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
              style={inputStyle}
            />
          </label>
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
          <p className="text-xs" style={{ color: 'var(--accent)' }}>{error}</p>
        )}
      </div>

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
