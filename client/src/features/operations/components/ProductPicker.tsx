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

/** What the picker hands back: enough to render the line without another lookup. */
export interface PickedProduct {
  id: number
  name: string
  sku: string
  uom: string
}

interface ProductPickerProps {
  /** The chosen product, or null. Already-picked products are excluded. */
  value: PickedProduct | null
  onChange: (product: PickedProduct) => void
  /** Product ids that cannot be chosen again (the other lines). */
  excludeIds?: number[]
  placeholder?: string
  invalid?: boolean
  id?: string
  disabled?: boolean
}

export function ProductPicker({
  value,
  onChange,
  excludeIds = [],
  placeholder = 'Add product',
  invalid = false,
  id,
  disabled = false,
}: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: products = [] } = useLookupProducts({ search: debouncedSearch || undefined })
  const options = products.filter((product) => !excludeIds.includes(product.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{value.sku}</span>
              <span className="truncate">{value.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{value.uom}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-64 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search name or SKU"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            <CommandGroup>
              {options.map((product) => (
                <CommandItem
                  key={product.id}
                  value={String(product.id)}
                  onSelect={() => {
                    onChange({
                      id: product.id,
                      name: product.name,
                      sku: product.sku,
                      uom: product.uom,
                    })
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <CheckIcon
                    className={cn('mr-1 size-4', value?.id === product.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {product.sku}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{product.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{product.uom}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
