import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { PlusIcon } from 'lucide-react'
import { EmptyState, ErrorState, PageHeader, Pagination } from '@/components/common'
import { Button } from '@/components/ui/button'
import NotFoundPage from '@/app/NotFoundPage'
import type { OperationKind } from '@/lib/types'
import { OperationFilters } from '../components/OperationFilters'
import { OperationsTable } from '../components/OperationsTable'
import { OPERATIONS_PAGE_SIZE, useOperationFilters, useOperations } from '../hooks'
import { resolveKind, type KindConfig } from '../kinds'

export default function OperationListPage() {
  const { kind } = useParams()
  const resolved = resolveKind(kind)
  if (!resolved) return <NotFoundPage />

  return <OperationList kind={resolved.kind} config={resolved.config} />
}

function OperationList({ kind, config }: { kind: OperationKind; config: KindConfig }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { filters, statusTab, page, hasFilters, setStatusTab, setFilters, setPage, clearFilters } =
    useOperationFilters()
  const operations = useOperations(config.type, filters, page)
  // Detail links carry the list's filters, so "back to list" lands on the same view.
  const detailUrl = (id: number): string => `/operations/${kind}/${id}${location.search}`

  const items = operations.data?.items
  const showEmpty =
    !operations.isPending &&
    !operations.isError &&
    !operations.isPlaceholderData &&
    (items?.length ?? 0) === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.labels.plural}
        description={config.description}
        actions={
          <Button asChild>
            <Link to={`/operations/${kind}/new`}>
              <PlusIcon />
              New {config.labels.singular}
            </Link>
          </Button>
        }
      />

      <OperationFilters
        statusTab={statusTab}
        onStatusTabChange={setStatusTab}
        warehouseId={filters.warehouseId}
        onWarehouseChange={(warehouseId) => setFilters({ warehouseId: warehouseId ?? null })}
        search={filters.search}
        onSearch={(search) => setFilters({ search: search ?? null })}
        hasFilters={hasFilters}
        onClear={clearFilters}
      />

      {operations.isError ? (
        <ErrorState error={operations.error} onRetry={() => void operations.refetch()} />
      ) : showEmpty ? (
        <div className="rounded-lg border border-border">
          <EmptyState
            title={hasFilters ? 'Nothing matches these filters' : config.emptyTitle}
            description={
              hasFilters
                ? 'Try another status tab, warehouse or search term.'
                : config.emptyDescription
            }
            action={
              <Button asChild>
                <Link to={`/operations/${kind}/new`}>
                  <PlusIcon />
                  New {config.labels.singular}
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <OperationsTable
            config={config}
            rows={items}
            isLoading={operations.isPending}
            onRowClick={(row) => navigate(detailUrl(row.id))}
          />
          {operations.data && operations.data.meta.total > 0 ? (
            <Pagination
              page={page}
              pageSize={OPERATIONS_PAGE_SIZE}
              total={operations.data.meta.total}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
