import { useMemo } from 'react'
import { DataTable, StatusBadge, type Column } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatQty } from '@/lib/format'
import type { KindConfig } from '../kinds'
import type { OperationSummary } from '../types'
import { formatRoute } from '../utils'

interface OperationsTableProps {
  config: KindConfig
  rows: OperationSummary[] | undefined
  isLoading: boolean
  onRowClick: (row: OperationSummary) => void
}

export function OperationsTable({ config, rows, isLoading, onRowClick }: OperationsTableProps) {
  const columns = useMemo<Column<OperationSummary>[]>(() => {
    const columns: Column<OperationSummary>[] = [
      {
        key: 'reference',
        header: 'Reference',
        cell: (row) => <span className="font-mono font-semibold whitespace-nowrap">{row.reference}</span>,
      },
    ]

    if (config.partnerLabel) {
      columns.push({
        key: 'partner',
        header: config.partnerLabel,
        cell: (row) => (
          <span className="block max-w-40 truncate">{row.partnerName || '—'}</span>
        ),
      })
    }

    columns.push(
      {
        key: 'route',
        header: config.singleLocation ? 'Location' : 'From → To',
        cell: (row) => (
          <span className="block max-w-56 truncate whitespace-nowrap text-muted-foreground">
            {formatRoute(config, row)}
          </span>
        ),
      },
      {
        key: 'scheduled',
        header: 'Scheduled',
        cell: (row) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span>{formatDate(row.scheduledDate)}</span>
            {row.isLate ? (
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                Late
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'items',
        header: 'Items',
        cell: (row) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {row.lineCount} {row.lineCount === 1 ? 'product' : 'products'} ·{' '}
            {formatQty(row.totalQuantity)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />,
      },
    )

    return columns
  }, [config])

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      onRowClick={onRowClick}
      emptyMessage="No operations match these filters"
    />
  )
}
