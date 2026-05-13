import { useState } from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Dialog } from './Dialog'
import type { TimeEntry } from '../lib/db'
// Lazy-imported so jsPDF (~650 kB) only loads when the dialog is first opened
const getExport = () => import('../lib/export')
import { strings } from '../lib/strings.de'

interface Props {
  entries: TimeEntry[]
  targetMinutes: number
  onClose: () => void
}

type ExportFormat = 'csv' | 'pdf'

const inputStyle = {
  backgroundColor: 'var(--surface)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
}

export function ExportDialog({ entries, targetMinutes, onClose }: Props) {
  const today = new Date()
  const [from, setFrom] = useState(
    format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  )
  const [to, setTo] = useState(
    format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  )
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [error, setError] = useState('')

  async function handleExport() {
    if (!from || !to) { setError('Bitte Zeitraum auswählen.'); return }
    if (from > to) { setError('Von muss vor Bis liegen.'); return }
    const { exportCSV, exportPDF } = await getExport()
    if (exportFormat === 'csv') {
      exportCSV(entries, from, to, targetMinutes)
    } else {
      exportPDF(entries, from, to, targetMinutes)
    }
    onClose()
  }

  return (
    <Dialog onClose={onClose}>
      <h3 className="font-semibold text-sm">{strings.export}</h3>

      <div className="flex flex-col gap-4">
        {/* Date range */}
        <div className="flex gap-3">
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Von</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
              style={inputStyle}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Bis</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded px-3 py-1.5 text-sm font-mono outline-none w-full"
              style={inputStyle}
            />
          </label>
        </div>

        {/* Format selection */}
        <div className="flex gap-6">
          {(['csv', 'pdf'] as ExportFormat[]).map((fmt) => (
            <label key={fmt} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="export-format"
                checked={exportFormat === fmt}
                onChange={() => setExportFormat(fmt)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-sm font-mono uppercase">{fmt}</span>
            </label>
          ))}
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--accent)' }}>{error}</p>}
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
          onClick={handleExport}
          className="px-4 py-1.5 text-sm rounded font-medium text-white"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {strings.export}
        </button>
      </div>
    </Dialog>
  )
}
