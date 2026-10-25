// All dates and times are shown in India time, whatever the phone's setting.
const TZ = 'Asia/Kolkata'

const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
const dateFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short' })
const longDateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** YYYY-MM-DD in India time. */
export function dayKey(ms: number = Date.now()): string {
  return dayKeyFmt.format(ms)
}

/** A moment today (India time), e.g. at(today, '09:08'). */
export function at(day: string, hhmm: string): number {
  return new Date(`${day}T${hhmm}:00+05:30`).getTime()
}

export function addDays(day: string, n: number): string {
  return dayKey(at(day, '12:00') + n * 86_400_000)
}

export const fmtTime = (ms: number) => timeFmt.format(ms)
export const fmtDate = (ms: number) => dateFmt.format(ms)
export const fmtLongDate = (ms: number) => longDateFmt.format(ms)
export const fmtDay = (day: string) => dateFmt.format(at(day, '12:00'))

/** HH:MM (24h) in India time, for time inputs. */
export function hhmm(ms: number): string {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
  return p.format(ms)
}

export function rupees(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

export function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID()
    } catch {
      // not a secure context (plain http on the local network)
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
