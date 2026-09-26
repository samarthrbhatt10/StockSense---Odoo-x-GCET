import { DataTable, type Column } from '@/components/common'
import { formatQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Operation, OperationLine } from '../types'
import { adjustmentDifference, formatDifference } from '../utils'

interface AdjustmentLinesProps {
  operation: Operation
}

/**
 * Product · Recorded · Counted · Difference. Before DONE the recorded column is
 * the live stock at the counted location; after DONE it is what the server
 * stored at validation time (CONTRACT §3).
 */
export function AdjustmentLines({ operation }: AdjustmentLinesProps) {
  const isDone = operation.status === 'DONE'

  const columns: Column<OperationLine>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (line) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{line.product.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{line.product.sku}</p>
        </div>
      ),
    },
    {
      key: 'recorded',
      header: 'Recorded',
      align: 'right',
      cell: (line) => {
        const recorded = isDone ? line.quantity : (line.available ?? 0)
        return <span className="whitespace-nowrap tabular-nums">{formatQty(recorded, line.product.uom)}</span>
      },
    },
    {
      key: 'counted',
      header: 'Counted',
      align: 'right',
      cell: (line) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatQty(line.countedQuantity ?? 0, line.product.uom)}
        </span>
      ),
    },
    {
      key: 'difference',
      header: 'Difference',
      align: 'right',
      cell: (line) => {
        const difference = adjustmentDifference(line)
        return (
          <span
            className={cn(
              'whitespace-nowrap font-medium tabular-nums',
              difference > 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {formatDifference(difference, line.product.uom)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        rows={operation.lines}
        rowKey={(line) => line.id}
        emptyMessage="This adjustment has no lines"
      />
      <p className="text-xs text-muted-foreground">
        {isDone
          ? 'Recorded quantity at the time of validation.'
          : 'Recorded is the live stock at the counted location until the adjustment is validated.'}
      </p>
    </div>
  )
}
