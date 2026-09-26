type ParamValue = string | number | null | undefined

/** Builds `path?key=value…`, dropping empty values. Commas stay readable (`status=DRAFT,READY`). */
export function withParams(path: string, params: Record<string, ParamValue>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value)).replace(/%2C/g, ',')}`)
    .join('&')
  return query ? `${path}?${query}` : path
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const shortDayFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

/** "Saturday, 26 September 2026" */
export function formatLongDate(date: Date): string {
  return longDateFormatter.format(date)
}

/** "2026-09-26" → "26 Sep" (parsed as a local calendar day). */
export function formatShortDay(isoDay: string): string {
  const [year, month, day] = isoDay.split('-').map(Number)
  if (!year || !month || !day) return isoDay
  return shortDayFormatter.format(new Date(year, month - 1, day))
}
