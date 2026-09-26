import { Link } from 'react-router'
import { DataTable, type Column } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatQty } from '@/lib/format'
import { OPERATION_LABELS, TYPE_TO_KIND } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { MoveDirection, MoveRow } from '../types'

const QUANTITY_STYLE: Record<MoveDirection, { prefix: string; className: string }> = {
  IN: { prefix: '+', className: 'text-emerald-700' },
  OUT: { prefix: '−', className: 'text-red-600' },
  INTERNAL: { prefix: '↔ ', className: 'text-muted-foreground' },
}

const COLUMNS: Column<MoveRow>[] = [
  {
    key: 'date',
    header: 'Date',
    cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
  },
  {
    key: 'reference',
    header: 'Reference',
    cell: (row) =>
      row.operationId ? (
        <Link
          to={`/operations/${TYPE_TO_KIND[row.type]}/${row.operationId}`}
          className="font-medium text-primary hover:underline"
        >
          {row.reference}
        </Link>
      ) : (
        <span className="font-medium">{row.reference}</span>
      ),
  },
  {
    key: 'product',
    header: 'Product',
    cell: (row) => (
      <div className="min-w-0">
        <Link to={`/products/${row.product.id}`} className="font-medium hover:underline">
          {row.product.name}
        </Link>
        <p className="text-xs text-muted-foreground">{row.product.sku}</p>
      </div>
    ),
  },
  {
    key: 'route',
    header: 'From → To',
    cell: (row) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {row.from.fullName} → {row.to.fullName}
      </span>
    ),
  },
  {
    key: 'quantity',
    header: 'Quantity',
    align: 'right',
    cell: (row) => {
      const style = QUANTITY_STYLE[row.direction]
      return (
        <span className={cn('font-medium whitespace-nowrap tabular-nums', style.className)}>
          {style.prefix}
          {formatQty(row.quantity, row.product.uom)}
        </span>
      )
    },
  },
  {
    key: 'type',
    header: 'Type',
    cell: (row) => <Badge variant="secondary">{OPERATION_LABELS[row.type].singular}</Badge>,
  },
  { key: 'user', header: 'User', cell: (row) => row.createdBy.name },
]

export function MovesTable({ rows, isLoading }: { rows: MoveRow[] | undefined; isLoading: boolean }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      emptyMessage="No stock moves match these filters"
    />
  )
}
