import { Link } from 'react-router'
import { PackagePlusIcon } from 'lucide-react'
import { DataTable, StockStatusBadge, type Column } from '@/components/common'
import { Button } from '@/components/ui/button'
import { formatQty } from '@/lib/format'
import { useLookupLocations } from '@/lib/lookups'
import type { LookupLocation } from '@/lib/types'
import type { StockAlert } from '../types'

/** The warehouse's "Stock" location, else its first INTERNAL location. */
function receiptLocationId(locations: LookupLocation[], warehouseId: number | null): number | undefined {
  if (warehouseId === null) return undefined
  const inWarehouse = locations.filter((location) => location.warehouseId === warehouseId)
  return (inWarehouse.find((location) => location.name === 'Stock') ?? inWarehouse[0])?.id
}

function receiptUrl(alert: StockAlert, locations: LookupLocation[]): string {
  const params = new URLSearchParams({
    productId: String(alert.productId),
    quantity: String(alert.suggestedQty && alert.suggestedQty > 0 ? alert.suggestedQty : 1),
  })
  const locationId = receiptLocationId(locations, alert.warehouseId)
  if (locationId !== undefined) params.set('locationId', String(locationId))
  return `/operations/receipts/new?${params.toString()}`
}

const qty = (value: number | null, uom?: string) =>
  value === null ? <span className="text-muted-foreground">—</span> : formatQty(value, uom)

export function AlertsTable({
  alerts,
  isLoading,
  warehouseId,
}: {
  alerts: StockAlert[] | undefined
  isLoading: boolean
  warehouseId?: number
}) {
  const locations = useLookupLocations({ warehouseId, type: 'INTERNAL' })

  const columns: Column<StockAlert>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (row) => (
        <Link to={`/products/${row.productId}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: 'sku', header: 'SKU', cell: (row) => <span className="text-muted-foreground">{row.sku}</span> },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (row) => (row.warehouseCode ? `${row.warehouseCode} · ${row.warehouseName}` : 'All warehouses'),
    },
    { key: 'onHand', header: 'On hand', align: 'right', cell: (row) => qty(row.onHand, row.uom) },
    { key: 'min', header: 'Min', align: 'right', cell: (row) => qty(row.minQty) },
    { key: 'max', header: 'Max', align: 'right', cell: (row) => qty(row.maxQty) },
    { key: 'status', header: 'Status', cell: (row) => <StockStatusBadge status={row.status} /> },
    { key: 'suggested', header: 'Suggested', align: 'right', cell: (row) => qty(row.suggestedQty, row.uom) },
    {
      key: 'action',
      header: '',
      align: 'right',
      cell: (row) => (
        <Button asChild size="sm" variant="outline">
          <Link to={receiptUrl(row, locations.data ?? [])}>
            <PackagePlusIcon className="size-4" />
            Create receipt
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={alerts}
      rowKey={(row) => `${row.productId}-${row.warehouseId ?? 'all'}`}
      isLoading={isLoading}
      emptyMessage="All products are above their reorder levels."
    />
  )
}
