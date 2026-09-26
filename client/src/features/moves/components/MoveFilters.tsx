import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedValue } from '@/lib/hooks'
import { useLookupLocations, useLookupWarehouses } from '@/lib/lookups'
import { OPERATION_LABELS } from '@/lib/types'
import { OPERATION_TYPES, type FilterPatch } from '../hooks'
import type { MoveFilters as Filters } from '../types'
import { ProductPicker } from './ProductPicker'

const ALL = 'all'

function SearchInput({ value, onSearch }: { value?: string; onSearch: (value: string | null) => void }) {
  const [text, setText] = useState(value ?? '')
  const debounced = useDebouncedValue(text.trim())
  // What this box last wrote to the URL, so its own round-trip is not mistaken for an outside change.
  const lastSent = useRef(value ?? '')

  useEffect(() => {
    if (debounced === lastSent.current) return
    lastSent.current = debounced
    onSearch(debounced || null)
  }, [debounced, onSearch])

  useEffect(() => {
    const external = value ?? ''
    if (external === lastSent.current) return
    // The URL changed from outside (Clear, a link): show it.
    lastSent.current = external
    setText(external)
  }, [value])

  return (
    <div className="relative col-span-2 sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Reference, product or SKU"
        aria-label="Search moves"
        className="pl-8"
      />
    </div>
  )
}

function LabeledSelect({
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

type MoveFiltersProps = {
  filters: Filters
  hasFilters: boolean
  onChange: (patch: FilterPatch) => void
  onClear: () => void
}

export function MoveFilters({ filters, hasFilters, onChange, onClear }: MoveFiltersProps) {
  const warehouses = useLookupWarehouses()
  const locations = useLookupLocations({ warehouseId: filters.warehouseId })
  const fromSelect = (value: string) => (value === ALL ? null : value)
  const onSearch = useCallback((value: string | null) => onChange({ search: value }), [onChange])

  const warehouseOptions = [
    { value: ALL, label: 'All warehouses' },
    ...(warehouses.data ?? []).map((w) => ({ value: String(w.id), label: `${w.code} · ${w.name}` })),
  ]
  const locationOptions = [
    { value: ALL, label: 'All locations' },
    ...(locations.data ?? []).map((l) => ({ value: String(l.id), label: l.fullName })),
  ]
  const typeOptions = [
    { value: ALL, label: 'All types' },
    ...OPERATION_TYPES.map((type) => ({ value: type, label: OPERATION_LABELS[type].plural })),
  ]
  // A location from another warehouse (or not loaded yet) still needs a visible label.
  if (filters.locationId && !locationOptions.some((o) => o.value === String(filters.locationId))) {
    locationOptions.push({ value: String(filters.locationId), label: `Location #${filters.locationId}` })
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <SearchInput value={filters.search} onSearch={onSearch} />
      <ProductPicker
        value={filters.productId}
        onChange={(productId) => onChange({ productId })}
        className="col-span-2 sm:w-56"
      />
      <LabeledSelect
        label="Warehouse"
        value={filters.warehouseId ? String(filters.warehouseId) : ALL}
        options={warehouseOptions}
        // The location list depends on the warehouse, so reset the location too.
        onValueChange={(value) => onChange({ warehouseId: fromSelect(value), locationId: null })}
      />
      <LabeledSelect
        label="Location"
        value={filters.locationId ? String(filters.locationId) : ALL}
        options={locationOptions}
        onValueChange={(value) => onChange({ locationId: fromSelect(value) })}
      />
      <LabeledSelect
        label="Type"
        value={filters.type ?? ALL}
        options={typeOptions}
        onValueChange={(value) => onChange({ type: fromSelect(value) })}
      />
      <div className="col-span-2 grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Input
          type="date"
          aria-label="Date from"
          value={filters.dateFrom ?? ''}
          max={filters.dateTo}
          onChange={(event) => onChange({ dateFrom: event.target.value || null })}
          className="sm:w-40"
        />
        <Input
          type="date"
          aria-label="Date to"
          value={filters.dateTo ?? ''}
          min={filters.dateFrom}
          onChange={(event) => onChange({ dateTo: event.target.value || null })}
          className="sm:w-40"
        />
      </div>
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
