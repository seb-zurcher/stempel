import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { TimeEntry } from './db'
import { entryDurationMinutes, formatDate, formatTime } from './time'

// ── Helpers ────────────────────────────────────────────────────────────────

function csvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

interface ExportRow {
  datum: string
  von: string
  bis: string
  dauer: string
  delta: string
  notiz: string
}

function buildRows(
  entries: TimeEntry[],
  from: string,
  to: string,
  targetMinutes: number,
): ExportRow[] {
  // Only completed entries within range
  const filtered = entries.filter(
    (e) => e.date >= from && e.date <= to && e.clockOut !== null,
  )

  // Daily totals for delta calculation
  const byDate = new Map<string, number>()
  for (const e of filtered) {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + entryDurationMinutes(e.clockIn, e.clockOut))
  }

  const sorted = [...filtered].sort((a, b) => a.clockIn.localeCompare(b.clockIn))

  return sorted.map((entry) => {
    const duration = entryDurationMinutes(entry.clockIn, entry.clockOut)
    const dayTotal = byDate.get(entry.date) ?? 0
    const delta = dayTotal - targetMinutes

    return {
      datum: formatDate(entry.date),
      von: formatTime(entry.clockIn),
      bis: entry.clockOut ? formatTime(entry.clockOut) : '',
      dauer: formatDuration(duration),
      delta: `${delta >= 0 ? '+' : ''}${delta}`,
      notiz: entry.note,
    }
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── CSV ────────────────────────────────────────────────────────────────────

export function exportCSV(
  entries: TimeEntry[],
  from: string,
  to: string,
  targetMinutes: number,
): void {
  const rows = buildRows(entries, from, to, targetMinutes)
  const headers = ['Datum', 'Einstempeln', 'Ausstempeln', 'Dauer (h:mm)', 'Soll-Differenz (min)', 'Notiz']

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [r.datum, r.von, r.bis, r.dauer, r.delta, r.notiz].map(csvCell).join(','),
    ),
  ]

  // BOM prefix for correct Excel handling of UTF-8
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `stempel-export-${from}_bis_${to}.csv`)
}

// ── PDF ────────────────────────────────────────────────────────────────────

export function exportPDF(
  entries: TimeEntry[],
  from: string,
  to: string,
  targetMinutes: number,
): void {
  const rows = buildRows(entries, from, to, targetMinutes)

  const grandTotal = entries
    .filter((e) => e.date >= from && e.date <= to && e.clockOut !== null)
    .reduce((sum, e) => sum + entryDurationMinutes(e.clockIn, e.clockOut), 0)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header block
  doc.setFont('courier', 'bold')
  doc.setFontSize(14)
  doc.text('Stempel', 15, 18)

  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  doc.text(`Zeitraum:  ${formatDate(from)} – ${formatDate(to)}`, 15, 26)
  doc.text(
    `Gesamt:    ${Math.floor(grandTotal / 60)}h ${String(grandTotal % 60).padStart(2, '0')}min`,
    15,
    31,
  )

  autoTable(doc, {
    startY: 38,
    head: [['Datum', 'Von', 'Bis', 'Dauer', 'Differenz (min)', 'Notiz']],
    body: rows.map((r) => [r.datum, r.von, r.bis, r.dauer, r.delta, r.notiz]),
    styles: { font: 'courier', fontSize: 8 },
    headStyles: { fillColor: [30, 42, 74], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 14 },
      2: { cellWidth: 14 },
      3: { cellWidth: 16 },
      4: { cellWidth: 26 },
    },
  })

  doc.save(`stempel-export-${from}_bis_${to}.pdf`)
}
