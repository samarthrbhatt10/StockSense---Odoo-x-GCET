import { ErrorState } from '@/components/common'
import { ActivityChart } from '../components/ActivityChart'
import { DashboardFilters } from '../components/DashboardFilters'
import { DashboardHeader } from '../components/DashboardHeader'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { KpiCards } from '../components/KpiCards'
import { LateBanner } from '../components/LateBanner'
import { LowStockCard } from '../components/LowStockCard'
import { OperationsTable } from '../components/OperationsTable'
import { PENDING_STATUS_PARAM, useDashboardFilters, useDashboardSummary } from '../hooks'

export default function DashboardPage() {
  const { filters, scope, hasFilters, setFilters, clearFilters } = useDashboardFilters()
  const summary = useDashboardSummary(scope)
  const lateOperations = summary.data?.kpis.lateOperations ?? 0

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardFilters
        filters={filters}
        hasFilters={hasFilters}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {summary.isPending ? (
        <DashboardSkeleton />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <>
          <KpiCards kpis={summary.data.kpis} scope={scope} />
          <div className="grid gap-4 lg:grid-cols-3">
            <ActivityChart data={summary.data.activity} className="lg:col-span-2" />
            <LowStockCard alerts={summary.data.lowStockPreview} warehouseId={scope.warehouseId} />
          </div>
        </>
      )}

      <div className="space-y-3">
        {lateOperations > 0 ? (
          <LateBanner
            count={lateOperations}
            onShowPending={() => setFilters({ status: PENDING_STATUS_PARAM })}
          />
        ) : null}
        <OperationsTable key={JSON.stringify(filters)} filters={filters} />
      </div>
    </div>
  )
}
