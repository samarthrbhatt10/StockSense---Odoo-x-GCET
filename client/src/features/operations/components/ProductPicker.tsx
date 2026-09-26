import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLookupProducts } from '@/lib/lookups'
import { useDebouncedValue } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ProductPickerProps {
  value: number | null
  onChange: (id: number, name: string, sku: string, uom: string) => void
  excludeIds?: number[]
  placeholder?: string
}

export function ProductPicker({ value, onChange, excludeIds = [], placeholder = 'Pick product…' }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: products = [] } = useLookupProducts({ search: debouncedSearch || undefined })
  const filtered = products.filter((p) => !excludeIds.includes(p.id))
  const selected = products.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono text-xs text-muted-foreground mr-1">{selected.sku}</span>
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search name or SKU…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={String(p.id)}
                  onSelect={() => {
                    onChange(p.id, p.name, p.sku, p.uom)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <CheckIcon
                    className={cn('mr-2 size-4', value === p.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="font-mono text-xs text-muted-foreground mr-2">{p.sku}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.uom}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
