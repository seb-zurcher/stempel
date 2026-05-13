import { useState } from 'react'
import { useStore } from '../store/useStore'
import { strings } from '../lib/strings.de'

function nowRoundedTo5(): string {
  const d = new Date()
  const h = d.getHours()
  const m = Math.floor(d.getMinutes() / 5) * 5
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const inputStyle = {
  backgroundColor: 'var(--surface)',
  color: 'var(--fg)',
  border: '1px solid var(--border)',
}

export default function Rechner() {
  const settings = useStore((s) => s.settings)

  const [clockIn, setClockIn] = useState(nowRoundedTo5)
  const [breakMin, setBreakMin] = useState(30)
  // Initialise from settings; user can adjust freely without affecting global settings
  const [targetMin, setTargetMin] = useState(() => settings.dailyTargetMinutes)
  const [overtimeMode, setOvertimeMode] = useState(false)
  const [overtimeMin, setOvertimeMin] = useState(0)

  const extraMin = overtimeMode ? overtimeMin : 0
  const totalSpan = targetMin + breakMin + extraMin
  const finishTime = clockIn ? addMinutes(clockIn, totalSpan) : '--:--'

  const th = Math.floor(totalSpan / 60)
  const tm = totalSpan % 60

  return (
    <div className="flex flex-col gap-8">

      {/* Result — shown first so it's always visible */}
      <div
        className="flex flex-col items-center py-8 rounded"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--muted)' }}
        >
          {strings.calcResult}
        </p>
        <p
          className="font-mono tabular-nums font-medium"
          style={{ fontSize: '4rem', lineHeight: 1, color: 'var(--accent)' }}
        >
          {finishTime}
        </p>
        <p className="text-xs mt-4 text-center" style={{ color: 'var(--muted)' }}>
          Du arbeitest bis dahin{' '}
          <span className="font-mono">{th}h {String(tm).padStart(2, '0')}min</span>
          {' '}inkl.{' '}
          <span className="font-mono">{breakMin}min</span>
          {' '}Pause.
        </p>
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-5">

        {/* Einstempelzeit + Jetzt */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {strings.calcClockIn}
          </span>
          <div className="flex gap-2">
            <input
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="flex-1 rounded px-3 py-2 text-sm font-mono outline-none"
              style={inputStyle}
            />
            <button
              onClick={() => setClockIn(nowRoundedTo5())}
              className="px-4 py-2 text-xs font-medium rounded transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              Jetzt
            </button>
          </div>
        </div>

        {/* Pausenlänge */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {strings.calcBreak}
          </span>
          <input
            type="number"
            value={breakMin}
            min={0}
            onChange={(e) => setBreakMin(Math.max(0, Number(e.target.value)))}
            className="rounded px-3 py-2 text-sm font-mono outline-none"
            style={inputStyle}
          />
        </label>

        {/* Sollarbeitszeit */}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {strings.calcTarget}
          </span>
          <input
            type="number"
            value={targetMin}
            min={0}
            onChange={(e) => setTargetMin(Math.max(0, Number(e.target.value)))}
            className="rounded px-3 py-2 text-sm font-mono outline-none"
            style={inputStyle}
          />
        </label>

        {/* Überstunden-Modus */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overtimeMode}
            onChange={(e) => setOvertimeMode(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-sm">{strings.calcOvertimeMode}</span>
        </label>

        {overtimeMode && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              {strings.calcOvertimeInput}
            </span>
            <input
              type="number"
              value={overtimeMin}
              min={0}
              onChange={(e) => setOvertimeMin(Math.max(0, Number(e.target.value)))}
              className="rounded px-3 py-2 text-sm font-mono outline-none"
              style={inputStyle}
            />
          </label>
        )}
      </div>
    </div>
  )
}
