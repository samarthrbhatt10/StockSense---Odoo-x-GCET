import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLookupProducts } from '@/lib/lookups'
import { cn } from '@/lib/utils'

type ProductPickerProps = {
  value?: number
  onChange: (productId: number | null) => void
  className?: string
}

/** Small Popover + Command product picker (features never share components). */
export function ProductPicker({ value, onChange, className }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const products = useLookupProducts()
  const selected = products.data?.find((product) => product.id === value)
  const label = selected ? `${selected.sku} · ${selected.name}` : value ? 'Product #' + value : 'All products'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Product"
          aria-expanded={open}
          className={cn('w-full min-w-0 justify-between font-normal', className)}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search SKU or name…" />
          <CommandList>
            <CommandEmpty>{products.isPending ? 'Loading products…' : 'No product found.'}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all products"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <CheckIcon className={cn('size-4', value ? 'opacity-0' : 'opacity-100')} />
                All products
              </CommandItem>
              {(products.data ?? []).map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.sku} ${product.name}`}
                  onSelect={() => {
                    onChange(product.id)
                    setOpen(false)
                  }}
                >
                  <CheckIcon className={cn('size-4', product.id === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">
                    <span className="font-medium">{product.sku}</span> · {product.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
