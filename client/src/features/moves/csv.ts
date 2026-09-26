import { formatDateTime } from '@/lib/format'
import { OPERATION_LABELS } from '@/lib/types'
import { listRequest } from './listRequest'
import type { MoveFilters, MoveRow } from './types'

export const EXPORT_PAGE_SIZE = 100
export const EXPORT_MAX_PAGES = 20

const HEADER = ['Date', 'Reference', 'Type', 'Product', 'SKU', 'From', 'To', 'Direction', 'Quantity', 'UoM', 'User']
const SIGN: Record<MoveRow['direction'], number> = { IN: 1, OUT: -1, INTERNAL: 1 }

/** Quotes a cell when needed and neutralises spreadsheet formulas in text. */
function cell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function movesToCsv(rows: MoveRow[]): string {
  const lines = rows.map((row) =>
    [
      formatDateTime(row.createdAt),
      row.reference,
      OPERATION_LABELS[row.type].singular,
      row.product.name,
      row.product.sku,
      row.from.fullName,
      row.to.fullName,
      row.direction,
      SIGN[row.direction] * row.quantity,
      row.product.uom,
      row.createdBy.name,
    ]
      .map(cell)
      .join(','),
  )
  return [HEADER.join(','), ...lines].join('\r\n')
}

/** Fetches every page of the filtered ledger (at most EXPORT_MAX_PAGES × EXPORT_PAGE_SIZE rows). */
export async function fetchMovesForExport(filters: MoveFilters): Promise<{ rows: MoveRow[]; total: number }> {
  const rows: MoveRow[] = []
  let total = 0
  for (let page = 1; page <= EXPORT_MAX_PAGES; page += 1) {
    const result = await listRequest<MoveRow>('/moves', { ...filters, page, pageSize: EXPORT_PAGE_SIZE })
    total = result.meta.total
    rows.push(...result.items)
    if (rows.length >= total || result.items.length < EXPORT_PAGE_SIZE) break
  }
  return { rows, total }
}

function localDateStamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function downloadCsv(csv: string, now: Date = new Date()): void {
  // The BOM makes Excel read the file as UTF-8 (arrows, accents).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `stock-moves-${localDateStamp(now)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
