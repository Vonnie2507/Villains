/** Get Monday of the week containing the given date */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  // Sunday = 0, Monday = 1 ... Saturday = 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return toDateString(d)
}

/** Get all 7 dates (Mon-Sun) for the week starting at weekStart */
export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = []
  const start = new Date(weekStart + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(toDateString(d))
  }
  return dates
}

/** Format YYYY-MM-DD */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** Get day name from YYYY-MM-DD */
export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long' })
}

/** Get short day name from YYYY-MM-DD */
export function getShortDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short' })
}

/** Get formatted date like "Mon 24 Mar" */
export function getFormattedDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Navigate weeks: add or subtract weeks from a weekStart string */
export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + (weeks * 7))
  return toDateString(d)
}

/** Check if a weekStart is the current week */
export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getWeekStart()
}

/** Format week range like "24 Mar – 30 Mar 2026" */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const startStr = start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr} – ${endStr}`
}
