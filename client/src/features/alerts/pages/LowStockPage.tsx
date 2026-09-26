import { ErrorState, PageHeader } from '@/components/common'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueryParams } from '@/lib/hooks'
import { useLookupWarehouses } from '@/lib/lookups'
import { cn } from '@/lib/utils'
import { AlertsTable } from '../components/AlertsTable'
import { useLowStock } from '../hooks'

const ALL = 'all'

function CountChip({ label, count, className }: { label: string; count?: number; className: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium', className)}>
      {label}
      <span className="tabular-nums">{count ?? '–'}</span>
    </span>
  )
}

export default function LowStockPage() {
  const [params, setParams] = useQueryParams()
  const parsed = Number(params.warehouseId)
  const warehouseId = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  const warehouses = useLookupWarehouses()
  const lowStock = useLowStock({ warehouseId })

  return (
    <div className="space-y-6">
      <PageHeader title="Low Stock" description="Products below their reorder minimum or out of stock." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={warehouseId ? String(warehouseId) : ALL}
          onValueChange={(value) => setParams({ warehouseId: value === ALL ? null : value })}
        >
          <SelectTrigger aria-label="Warehouse" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All warehouses</SelectItem>
            {(warehouses.data ?? []).map((warehouse) => (
              <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                {warehouse.code} · {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <CountChip label="Out" count={lowStock.data?.counts.out} className="border-red-200 bg-red-50 text-red-700" />
          <CountChip label="Low" count={lowStock.data?.counts.low} className="border-amber-200 bg-amber-50 text-amber-700" />
        </div>
      </div>
      {lowStock.isError ? (
        <ErrorState error={lowStock.error} onRetry={() => void lowStock.refetch()} />
      ) : (
        <AlertsTable alerts={lowStock.data?.items} isLoading={lowStock.isPending} warehouseId={warehouseId} />
      )}
    </div>
  )
}
