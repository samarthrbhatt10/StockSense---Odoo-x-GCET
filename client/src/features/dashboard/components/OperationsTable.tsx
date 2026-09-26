import { useState } from 'react'
import { useNavigate } from 'react-router'
import { DataTable, ErrorState, Pagination, StatusBadge, type Column } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { OPERATION_LABELS, TYPE_TO_KIND } from '@/lib/types'
import { OPERATIONS_PAGE_SIZE, useDashboardOperations } from '../hooks'
import type { DashboardFilters, DashboardOperation } from '../types'

const COLUMNS: Column<DashboardOperation>[] = [
  {
    key: 'reference',
    header: 'Reference',
    cell: (row) => <span className="font-medium">{row.reference}</span>,
  },
  { key: 'type', header: 'Type', cell: (row) => OPERATION_LABELS[row.type].singular },
  {
    key: 'partner',
    header: 'Partner',
    cell: (row) => row.partnerName ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: 'route',
    header: 'From → To',
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.sourceName} → {row.destName}
      </span>
    ),
  },
  {
    key: 'scheduled',
    header: 'Scheduled',
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        {formatDate(row.scheduledDate)}
        {row.isLate ? (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            Late
          </Badge>
        ) : null}
      </span>
    ),
  },
  { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
]

/** Remount (via `key`) when the filters change so the page resets to 1. */
export function OperationsTable({ filters }: { filters: DashboardFilters }) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const operations = useDashboardOperations(filters, page)

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Operations</h2>
        {operations.data ? (
          <span className="text-sm text-muted-foreground">{operations.data.meta.total} total</span>
        ) : null}
      </div>
      {operations.isError ? (
        <ErrorState error={operations.error} onRetry={() => void operations.refetch()} />
      ) : (
        <>
          <DataTable
            columns={COLUMNS}
            rows={operations.data?.items}
            rowKey={(row) => row.id}
            isLoading={operations.isPending}
            emptyMessage="No operations match these filters"
            onRowClick={(row) => navigate(`/operations/${TYPE_TO_KIND[row.type]}/${row.id}`)}
          />
          {operations.data && operations.data.meta.total > 0 ? (
            <Pagination
              page={page}
              pageSize={OPERATIONS_PAGE_SIZE}
              total={operations.data.meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </section>
  )
}
