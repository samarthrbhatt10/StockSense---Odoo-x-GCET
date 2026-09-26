import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { useDebouncedValue } from '@/lib/hooks'
import { useLookupWarehouses } from '@/lib/lookups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STATUS_TABS, type StatusTab } from '../hooks'

const ALL = 'all'

type OperationFiltersProps = {
  statusTab: StatusTab | null
  onStatusTabChange: (tab: StatusTab) => void
  warehouseId: number | undefined
  onWarehouseChange: (warehouseId: number | undefined) => void
  search: string | undefined
  onSearch: (search: string | undefined) => void
  onClear: () => void
  hasFilters: boolean
}

function SearchInput({
  value,
  onSearch,
}: {
  value: string | undefined
  onSearch: (value: string | undefined) => void
}) {
  const [text, setText] = useState(value ?? '')
  const debounced = useDebouncedValue(text.trim())
  // What this box last wrote to the URL, so its own round trip is not read as an outside change.
  const lastSent = useRef(value ?? '')

  useEffect(() => {
    if (debounced === lastSent.current) return
    lastSent.current = debounced
    onSearch(debounced || undefined)
  }, [debounced, onSearch])

  useEffect(() => {
    const external = value ?? ''
    if (external === lastSent.current) return
    lastSent.current = external
    setText(external)
  }, [value])

  return (
    <div className="col-span-2 sm:col-span-1 sm:w-64">
      <label className="sr-only" htmlFor="operations-search">
        Search operations
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="operations-search"
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Reference or partner"
          className="pl-8"
        />
      </div>
    </div>
  )
}

export function OperationFilters({
  statusTab,
  onStatusTabChange,
  warehouseId,
  onWarehouseChange,
  search,
  onSearch,
  onClear,
  hasFilters,
}: OperationFiltersProps) {
  const warehouses = useLookupWarehouses()
  const handleSearch = useCallback(
    (value: string | undefined) => onSearch(value),
    [onSearch],
  )

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Tabs
          value={statusTab ?? ''}
          onValueChange={(value) => onStatusTabChange(value as StatusTab)}
          className="gap-0"
        >
          <TabsList className="w-max min-w-full justify-start">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="px-3">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <SearchInput value={search} onSearch={handleSearch} />

        <Select
          value={warehouseId ? String(warehouseId) : ALL}
          onValueChange={(value) => onWarehouseChange(value === ALL ? undefined : Number(value))}
        >
          <SelectTrigger aria-label="Warehouse" className="w-full bg-background sm:w-44">
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

        <Button
          type="button"
          variant="ghost"
          disabled={!hasFilters}
          onClick={onClear}
          className="col-span-2 sm:col-auto"
        >
          <XIcon className="size-4" />
          Clear
        </Button>
      </div>
    </div>
  )
}
