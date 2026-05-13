import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { ClockButton } from '../components/ClockButton'
import { DailyProgress } from '../components/DailyProgress'
import { Uebersicht } from '../components/Uebersicht'
import { ForgottenClockOutBanner } from '../components/ForgottenClockOutBanner'
import { todayISO, formatDate } from '../lib/time'
import { strings } from '../lib/strings.de'

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="flex flex-col items-center">
      <div className="font-mono tabular-nums text-5xl font-medium" style={{ color: 'var(--fg)' }}>
        {now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <p className="text-xs font-mono mt-1" style={{ color: 'var(--muted)' }}>
        {formatDate(todayISO())}
      </p>
    </div>
  )
}

export default function Stempeluhr() {
  const { entries, settings, isLoaded, clockIn, clockOut } = useStore()

  const today = todayISO()
  const openEntry = entries.find((e) => e.clockOut === null) ?? null
  const todayEntries = entries.filter((e) => e.date === today)
  const targetMinutes = settings.dailyTargetMinutes

  // Open entry from a previous day = forgotten clock-out
  const forgottenEntry = openEntry && openEntry.date !== today ? openEntry : null

  // Note field: pre-filled from the open entry's note; cleared on clock-out
  const [note, setNote] = useState(openEntry?.note ?? '')
  useEffect(() => {
    setNote(openEntry?.note ?? '')
  }, [openEntry?.id])

  async function handleClock() {
    if (openEntry) {
      await clockOut(note)
    } else {
      await clockIn(note)
    }
  }

  if (!isLoaded) {
    return (
      <div className="font-mono text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>
        Lädt…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Forgotten clock-out banner — shown above everything when open entry is from a prior day */}
      {forgottenEntry && <ForgottenClockOutBanner entry={forgottenEntry} />}

      {/* 1. Clock button + live elapsed timer */}
      <ClockButton openEntry={openEntry} onClock={handleClock} />

      {/* 2. Current time */}
      <LiveClock />

      {/* 3. Daily progress */}
      <DailyProgress entries={todayEntries} targetMinutes={targetMinutes} />

      {/* 4. Note field */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={strings.notePlaceholder}
        rows={2}
        className="w-full resize-none rounded px-3 py-2 text-sm font-sans outline-none"
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
        }}
      />

      {/* 5. Overview with day / week / month toggle */}
      <Uebersicht entries={entries} targetMinutes={targetMinutes} />
    </div>
  )
}
