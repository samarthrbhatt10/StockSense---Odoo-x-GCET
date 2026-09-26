import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { LoaderCircleIcon, PackageIcon, FileTextIcon, SearchIcon } from 'lucide-react'
import { StatusBadge } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useDebouncedValue } from '@/lib/hooks'
import { TYPE_TO_KIND } from '@/lib/types'
import { isMacPlatform, isSearchShortcut, MAX_QUERY_LENGTH, useGlobalSearch } from './hooks'

const DEBOUNCE_MS = 250

function StatusMessage({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>
}

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const q = useDebouncedValue(text.trim(), DEBOUNCE_MS)
  const results = useGlobalSearch(q)
  const shortcut = isMacPlatform() ? '⌘K' : 'Ctrl K'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isSearchShortcut(event)) return
      event.preventDefault()
      setOpen((current) => !current)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) setText('')
  }

  const go = (path: string) => {
    changeOpen(false)
    navigate(path)
  }

  const data = q ? results.data : undefined
  const hasResults = Boolean(data && (data.products.length > 0 || data.operations.length > 0))
  const waiting = text.trim() !== q || (results.isFetching && !hasResults)

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search SKU, product or reference…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
          {shortcut}
        </kbd>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Search"
        className="sm:hidden"
        onClick={() => changeOpen(true)}
      >
        <SearchIcon className="size-5" />
      </Button>

      {/* Mounted only while open: the dialog's sr-only title would otherwise sit in the top bar. */}
      {open ? (
        <CommandDialog
          open={open}
          onOpenChange={changeOpen}
          title="Search"
          description="Search products by SKU or name, and operations by reference or partner"
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={text}
              onValueChange={(value) => setText(value.slice(0, MAX_QUERY_LENGTH))}
              placeholder="Search SKU, product or reference…"
            />
            <CommandList>
              {!text.trim() ? (
                <StatusMessage>Type a SKU, product name, reference or partner.</StatusMessage>
              ) : results.isError && q ? (
                <StatusMessage>{results.error.message}</StatusMessage>
              ) : !hasResults && waiting ? (
                <StatusMessage>
                  <LoaderCircleIcon className="mx-auto size-5 animate-spin" aria-label="Searching" />
                </StatusMessage>
              ) : !hasResults ? (
                <StatusMessage>No results for “{q}”.</StatusMessage>
              ) : (
                <>
                  {data && data.products.length > 0 ? (
                    <CommandGroup heading="Products">
                      {data.products.map((product) => (
                        <CommandItem
                          key={`product-${product.id}`}
                          value={`product-${product.id}`}
                          onSelect={() => go(`/products/${product.id}`)}
                        >
                          <PackageIcon className="size-4" />
                          <span className="font-medium">{product.sku}</span>
                          <span className="truncate text-muted-foreground">· {product.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                ) : null}
                {data && data.operations.length > 0 ? (
                  <CommandGroup heading="Operations">
                    {data.operations.map((operation) => (
                      <CommandItem
                        key={`operation-${operation.id}`}
                        value={`operation-${operation.id}`}
                        onSelect={() => go(`/operations/${TYPE_TO_KIND[operation.type]}/${operation.id}`)}
                      >
                        <FileTextIcon className="size-4" />
                        <span className="font-medium">{operation.reference}</span>
                        <StatusBadge status={operation.status} />
                        {operation.partnerName ? (
                          <span className="truncate text-muted-foreground">{operation.partnerName}</span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
      ) : null}
    </>
  )
}
