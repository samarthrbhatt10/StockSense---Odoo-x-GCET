import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLookupCategories, useLookupWarehouses } from '@/lib/lookups'
import { STATUS_LABELS, type OperationStatus } from '@/lib/types'
import { OPERATION_STATUSES, PENDING_STATUS_PARAM } from '../hooks'
import type { DashboardFilters as Filters } from '../types'

const ALL = 'all'

const TYPE_OPTIONS = [
  { value: ALL, label: 'All documents' },
  { value: 'RECEIPT', label: 'Receipts' },
  { value: 'DELIVERY', label: 'Deliveries' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'ADJUSTMENT', label: 'Adjustments' },
]

const BASE_STATUS_OPTIONS = [
  { value: ALL, label: 'All statuses' },
  { value: PENDING_STATUS_PARAM, label: 'Pending' },
  ...OPERATION_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
]

type FilterPatch = Record<string, string | number | null>

type DashboardFiltersProps = {
  filters: Filters
  hasFilters: boolean
  onChange: (patch: FilterPatch) => void
  onClear: () => void
}

function statusOptions(current?: string) {
  if (!current || BASE_STATUS_OPTIONS.some((option) => option.value === current)) return BASE_STATUS_OPTIONS
  // A custom combination arriving from a link (e.g. "DRAFT,READY") stays selectable.
  const label = current
    .split(',')
    .map((status) => STATUS_LABELS[status as OperationStatus])
    .join(' + ')
  return [...BASE_STATUS_OPTIONS, { value: current, label }]
}

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onValueChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label} className="w-full min-w-0 sm:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function DashboardFilters({ filters, hasFilters, onChange, onClear }: DashboardFiltersProps) {
  const warehouses = useLookupWarehouses()
  const categories = useLookupCategories()

  const warehouseOptions = [
    { value: ALL, label: 'All warehouses' },
    ...(warehouses.data ?? []).map((w) => ({ value: String(w.id), label: `${w.code} · ${w.name}` })),
  ]
  const categoryOptions = [
    { value: ALL, label: 'All categories' },
    ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ]
  const fromSelect = (value: string) => (value === ALL ? null : value)

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <FilterSelect
        label="Document type"
        value={filters.type ?? ALL}
        options={TYPE_OPTIONS}
        onValueChange={(value) => onChange({ type: fromSelect(value) })}
      />
      <FilterSelect
        label="Status"
        value={filters.status ?? ALL}
        options={statusOptions(filters.status)}
        onValueChange={(value) => onChange({ status: fromSelect(value) })}
      />
      <FilterSelect
        label="Warehouse"
        value={filters.warehouseId ? String(filters.warehouseId) : ALL}
        options={warehouseOptions}
        onValueChange={(value) => onChange({ warehouseId: fromSelect(value) })}
      />
      <FilterSelect
        label="Category"
        value={filters.categoryId ? String(filters.categoryId) : ALL}
        options={categoryOptions}
        onValueChange={(value) => onChange({ categoryId: fromSelect(value) })}
      />
      <Button
        type="button"
        variant="ghost"
        className="col-span-2 sm:col-span-1"
        disabled={!hasFilters}
        onClick={onClear}
      >
        <XIcon className="size-4" />
        Clear
      </Button>
    </div>
  )
}
