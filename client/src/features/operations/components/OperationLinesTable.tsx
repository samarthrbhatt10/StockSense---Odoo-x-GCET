import { DataTable, type Column } from '@/components/common'
import { formatQty } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { KindConfig } from '../kinds'
import type { Operation, OperationLine } from '../types'

interface OperationLinesTableProps {
  operation: Operation
  config: KindConfig
}

/** Deliveries and transfers can be validated only if the source has the stock. */
function showsShortage(config: KindConfig, operation: Operation): boolean {
  return config.showsAvailability && operation.status !== 'DONE' && operation.status !== 'CANCELED'
}

function lineQuantity(line: OperationLine): string {
  if (line.countedQuantity === null) return formatQty(line.quantity, line.product.uom)
  return `${formatQty(line.countedQuantity, line.product.uom)} (system ${formatQty(line.quantity, line.product.uom)})`
}

export function OperationLinesTable({ operation, config }: OperationLinesTableProps) {
  const withAvailability = showsShortage(config, operation)

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
      key: 'quantity',
      header: config.singleLocation ? 'Counted' : 'Quantity',
      align: 'right',
      cell: (line) => <span className="whitespace-nowrap tabular-nums">{lineQuantity(line)}</span>,
    },
  ]

  if (withAvailability) {
    columns.push({
      key: 'available',
      header: 'Available at source',
      align: 'right',
      cell: (line) => {
        if (line.available === null) return <span className="text-muted-foreground">—</span>
        const short = line.available < line.quantity
        return (
          <span
            className={cn(
              'whitespace-nowrap tabular-nums',
              short ? 'font-medium text-red-600' : 'text-muted-foreground',
            )}
          >
            {formatQty(line.available, line.product.uom)}
            {short ? ' · not enough' : ''}
          </span>
        )
      },
    })
  }

  return (
    <DataTable
      columns={columns}
      rows={operation.lines}
      rowKey={(line) => line.id}
      emptyMessage="This operation has no lines"
    />
  )
}
