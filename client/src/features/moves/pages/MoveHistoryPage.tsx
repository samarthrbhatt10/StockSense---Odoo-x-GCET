import { ErrorState, PageHeader, Pagination } from '@/components/common'
import { ExportCsvButton } from '../components/ExportCsvButton'
import { MoveFilters } from '../components/MoveFilters'
import { MovesTable } from '../components/MovesTable'
import { MOVES_PAGE_SIZE, useMoveFilters, useMoves } from '../hooks'

export default function MoveHistoryPage() {
  const { filters, page, hasFilters, setFilters, setPage, clearFilters } = useMoveFilters()
  const moves = useMoves(filters, page)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move History"
        description="Every stock movement, in order. Nothing is edited or deleted."
        actions={<ExportCsvButton filters={filters} />}
      />
      <MoveFilters filters={filters} hasFilters={hasFilters} onChange={setFilters} onClear={clearFilters} />
      {moves.isError ? (
        <ErrorState error={moves.error} onRetry={() => void moves.refetch()} />
      ) : (
        <div className="space-y-3">
          <MovesTable rows={moves.data?.items} isLoading={moves.isPending} />
          {moves.data && moves.data.meta.total > 0 ? (
            <Pagination
              page={page}
              pageSize={MOVES_PAGE_SIZE}
              total={moves.data.meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
