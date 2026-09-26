import { ApiError } from '@/lib/api'
import { formatQty } from '@/lib/format'
import type { KindConfig } from './kinds'
import type { OperationFormValues } from './schemas'
import type { Operation, OperationLine, OperationSummary } from './types'
import type { OperationCreateBody } from './api'

const FIELDS = [
  'partnerName',
  'sourceLocationId',
  'destLocationId',
  'scheduledDate',
  'notes',
  'lines',
] as const

type FieldName = (typeof FIELDS)[number]

/** `?id=12` → 12, anything else → undefined. */
export function parseIdParam(value: string | undefined): number | undefined {
  if (!value) return undefined
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

/** `?quantity=50` → 50, falling back when absent or unparseable. */
export function parseNumberParam(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Server dates are ISO; the date input wants `YYYY-MM-DD`. The calendar day is
 * read in local time, the same way `formatDate()` renders it in the list.
 */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

/** Today as the date input shows it: a local calendar day. */
export function todayInputValue(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Form values → request body. Only the side the user chose is sent. */
export function toApiBody(config: KindConfig, values: OperationFormValues): OperationCreateBody {
  return {
    type: config.type,
    ...(config.needsSource && values.sourceLocationId
      ? { sourceLocationId: values.sourceLocationId }
      : {}),
    ...(config.needsDest && values.destLocationId ? { destLocationId: values.destLocationId } : {}),
    ...(config.partnerLabel && values.partnerName.trim()
      ? { partnerName: values.partnerName.trim() }
      : {}),
    scheduledDate: values.scheduledDate,
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    lines: values.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      countedQuantity: line.countedQuantity,
    })),
  }
}

/**
 * Puts the server's `details.fieldErrors` (CONTRACT §5.1) onto the matching
 * fields. Returns false when nothing matched, so the caller shows a toast.
 */
export function applyServerFieldErrors(
  error: unknown,
  setError: (name: FieldName, message: string) => void,
): boolean {
  if (!(error instanceof ApiError) || error.status !== 400) return false
  const details = error.details as { fieldErrors?: Record<string, unknown> } | undefined
  const fieldErrors = details?.fieldErrors
  if (!fieldErrors || typeof fieldErrors !== 'object') return false

  let applied = false
  for (const [field, raw] of Object.entries(fieldErrors)) {
    if (!(FIELDS as readonly string[]).includes(field)) continue
    const message = Array.isArray(raw) ? raw[0] : raw
    if (typeof message !== 'string' || message === '') continue
    setError(field as FieldName, message)
    applied = true
  }
  return applied
}

/** The list's "From → To" cell. Adjustments have one real location. */
export function formatRoute(config: KindConfig, row: OperationSummary): string {
  if (config.singleLocation) return row.destLocation.fullName
  return `${row.sourceLocation.fullName} → ${row.destLocation.fullName}`
}

/** Counted − recorded, the net effect of validating an adjustment line. */
export function adjustmentDifference(line: OperationLine): number {
  const recorded = line.available ?? line.quantity
  return Math.round(((line.countedQuantity ?? 0) - recorded) * 1000) / 1000
}

/** "Steel: −3 kg at WH/Production Floor" */
export function formatDifference(value: number, uom: string): string {
  if (value === 0) return '—'
  return `${value > 0 ? '+' : '−'}${formatQty(Math.abs(value), uom)}`
}

/** One line per movement, for the validate confirmation dialog. */
export function describeValidationEffect(operation: Operation): string[] {
  const to = operation.destLocation.fullName
  const from = operation.sourceLocation.fullName

  switch (operation.type) {
    case 'RECEIPT':
      return operation.lines.map(
        (line) =>
          `Adds ${formatQty(line.quantity, line.product.uom)} of ${line.product.name} to ${to}`,
      )
    case 'DELIVERY':
      return operation.lines.map(
        (line) =>
          `Removes ${formatQty(line.quantity, line.product.uom)} of ${line.product.name} from ${from}`,
      )
    case 'INTERNAL':
      return operation.lines.map(
        (line) =>
          `Moves ${formatQty(line.quantity, line.product.uom)} of ${line.product.name} from ${from} to ${to}`,
      )
    default:
      return operation.lines.map(
        (line) =>
          `${line.product.name}: ${formatDifference(adjustmentDifference(line), line.product.uom)} at ${to}`,
      )
  }
}

/** "Adds 50 kg of Steel to WH/Stock. Stock changes immediately." */
export function describeValidationSummary(operation: Operation): string {
  const effects = describeValidationEffect(operation)
  if (effects.length === 0) return 'Stock quantities will change immediately.'
  const list = effects.join('. ')
  return `${list}. Stock changes immediately and cannot be undone.`
}
