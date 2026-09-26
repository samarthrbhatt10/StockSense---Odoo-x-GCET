import { PENDING_STATUSES, type OperationStatus } from './types'

const qtyFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "1,234.5 kg" — at most 2 decimals, followed by the unit of measure. */
export function formatQty(value: number, uom?: string): string {
  const amount = qtyFormatter.format(Number.isFinite(value) ? value : 0)
  return uom ? `${amount} ${uom}` : amount
}

/** "26 Sep 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return dateFormatter.format(date)
}

/** "26 Sep 2026, 14:05" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Date(value)
}

/** Pending work whose scheduled date has already passed. */
export function isLate(scheduledDate: string, status: OperationStatus): boolean {
  if (!PENDING_STATUSES.includes(status)) return false
  if (!scheduledDate) return false

  const scheduled = parseDateOnly(scheduledDate)
  if (Number.isNaN(scheduled.getTime())) return false

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return scheduled.getTime() < startOfToday.getTime()
}
