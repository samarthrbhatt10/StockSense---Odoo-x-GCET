import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRightIcon, BellIcon } from 'lucide-react'
import { StockStatusBadge } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatQty } from '@/lib/format'
import { useLowStock } from './hooks'

const POLL_MS = 60_000
const PREVIEW_COUNT = 5
const MAX_BADGE = 99

export default function LowStockBell() {
  const [open, setOpen] = useState(false)
  const lowStock = useLowStock({}, { refetchInterval: POLL_MS })
  const count = lowStock.data ? lowStock.data.counts.low + lowStock.data.counts.out : 0
  const preview = lowStock.data?.items.slice(0, PREVIEW_COUNT) ?? []
  const close = () => setOpen(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Low stock alerts" className="relative shrink-0">
          <BellIcon className="size-5" />
          {count > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-semibold text-white">
              {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Low stock alerts</p>
          <Link
            to="/alerts"
            onClick={close}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        {lowStock.isError ? (
          <p className="px-4 py-6 text-center text-sm text-destructive">Could not load alerts.</p>
        ) : preview.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {lowStock.isPending ? 'Loading…' : 'All products are above their reorder levels.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {preview.map((alert) => (
              <li key={`${alert.productId}-${alert.warehouseId ?? 'all'}`}>
                <Link
                  to={`/products/${alert.productId}`}
                  onClick={close}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{alert.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {alert.warehouseCode ?? 'All warehouses'} · {formatQty(alert.onHand, alert.uom)}
                      {alert.minQty !== null ? ` / ${formatQty(alert.minQty)}` : ''}
                    </p>
                  </div>
                  <StockStatusBadge status={alert.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
