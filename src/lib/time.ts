import { format, differenceInMinutes, parseISO } from 'date-fns'

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function nowLocalISO(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm")
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), 'dd.MM.yyyy')
}

export function entryDurationMinutes(
  clockIn: string,
  clockOut: string | null,
): number {
  const end = clockOut ? parseISO(clockOut) : new Date()
  return Math.max(0, differenceInMinutes(end, parseISO(clockIn)))
}

export function formatMinutes(minutes: number): string {
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const sign = minutes < 0 ? '-' : ''
  if (h === 0) return `${sign}${m}min`
  return `${sign}${h}h ${String(m).padStart(2, '0')}min`
}

export function formatElapsedSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}
