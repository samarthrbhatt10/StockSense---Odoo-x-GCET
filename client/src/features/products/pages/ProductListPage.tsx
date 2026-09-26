import { useNavigate } from 'react-router'
import { PlusIcon } from 'lucide-react'
import { useQueryParams } from '@/lib/hooks'
import { useLookupCategories, useLookupWarehouses } from '@/lib/lookups'
import { formatQty } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DataTable,
  ErrorState,
  PageHeader,
  Pagination,
  StockStatusBadge,
  type Column,
} from '@/components/common'
import { useProducts } from '../hooks'
import { useProductSearchFilter } from '../useProductSearchFilter'
import { STOCK_STATUS_FILTERS, type ProductListItem, type StockStatusFilter } from '../types'

const ALL = 'all'

function numberParam(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default function ProductListPage() {
  const [params, setParams] = useQueryParams()
  const navigate = useNavigate()
  const search = useProductSearchFilter()

  const page = Number(params.page ?? '1') || 1
  const categoryId = numberParam(params.categoryId)
  const warehouseId = numberParam(params.warehouseId)
  const stockStatus = (params.stockStatus ?? '') as StockStatusFilter
  const includeInactive = params.includeInactive === 'true'

  const categories = useLookupCategories()
  const warehouses = useLookupWarehouses()

  const { data, isPending, isError, error, refetch } = useProducts({
    page,
    search: search.value || undefined,
    categoryId,
    warehouseId,
    stockStatus: stockStatus || undefined,
    includeInactive,
  })

  const columns: Column<ProductListItem>[] = [
    {
      key: 'sku',
      header: 'SKU',
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.sku}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.name}</span>
          {row.isActive ? null : (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (row) => row.category?.name ?? '—' },
    {
      key: 'onHand',
      header: 'On hand',
      align: 'right',
      cell: (row) => formatQty(row.onHand, row.uom),
    },
    { key: 'status', header: 'Status', cell: (row) => <StockStatusBadge status={row.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="The catalogue, its stock levels and where each unit sits."
        actions={
          <Button onClick={() => navigate('/products/new')}>
            <PlusIcon />
            New product
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="product-search">Search</Label>
          <Input
            id="product-search"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder="Search by name or SKU"
          />
        </div>

        {/* Two selects share a row on phones: stacked they push the table off screen. */}
        <div className="grid grid-cols-2 gap-3 lg:contents">
          <div className="space-y-1.5">
            <Label htmlFor="product-category">Category</Label>
            <Select
              value={categoryId ? String(categoryId) : ALL}
              onValueChange={(value) =>
                setParams({ categoryId: value === ALL ? null : value, page: null })
              }
            >
              <SelectTrigger id="product-category" className="w-full lg:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.data?.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-warehouse">Warehouse</Label>
            <Select
              value={warehouseId ? String(warehouseId) : ALL}
              onValueChange={(value) =>
                setParams({ warehouseId: value === ALL ? null : value, page: null })
              }
            >
              <SelectTrigger id="product-warehouse" className="w-full lg:w-48">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All warehouses</SelectItem>
                {warehouses.data?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.code} — {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap rounded-lg border border-border bg-background p-0.5"
          role="group"
          aria-label="Stock status"
        >
          {STOCK_STATUS_FILTERS.map((option) => {
            const active = stockStatus === option.value
            return (
              <button
                key={option.value || 'all'}
                type="button"
                onClick={() => setParams({ stockStatus: option.value || null, page: null })}
                aria-pressed={active}
                className={
                  active
                    ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors'
                    : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeInactive}
            onCheckedChange={(checked) =>
              setParams({ includeInactive: checked === true ? 'true' : null, page: null })
            }
          />
          Show inactive
        </label>
      </div>

      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}

      {!isError ? (
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(row) => row.id}
          isLoading={isPending}
          emptyMessage="No products match these filters."
          onRowClick={(row) => navigate(`/products/${row.id}`)}
        />
      ) : null}

      {data ? (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          total={data.meta.total}
          onPageChange={(next) => setParams({ page: next })}
        />
      ) : null}
    </div>
  )
}
