import { Skeleton } from '@/components/ui/skeleton'

const KPI_COUNT = 6
const LOW_STOCK_ROWS = 5

/** Mirrors the loaded layout: KPI grid, then chart (2/3) beside the low-stock card (1/3). */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4">
        {Array.from({ length: KPI_COUNT }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-[260px] w-full" />
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: LOW_STOCK_ROWS }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
