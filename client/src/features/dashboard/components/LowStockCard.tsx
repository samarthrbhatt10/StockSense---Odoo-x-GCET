import { Link } from 'react-router'
import { ArrowRightIcon, CircleCheckIcon } from 'lucide-react'
import { StockStatusBadge } from '@/components/common'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatQty } from '@/lib/format'
import type { StockAlert } from '../types'
import { withParams } from '../utils'

function quantityLabel(alert: StockAlert): string {
  const onHand = formatQty(alert.onHand, alert.uom)
  return alert.minQty === null ? onHand : `${onHand} / ${formatQty(alert.minQty)}`
}

export function LowStockCard({ alerts, warehouseId }: { alerts: StockAlert[]; warehouseId?: number }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Low stock</CardTitle>
        <CardAction>
          <Link
            to={withParams('/alerts', { warehouseId })}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRightIcon className="size-4" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <CircleCheckIcon className="size-6 text-emerald-600" />
            Every product is above its reorder minimum.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {alerts.map((alert) => (
              <li
                key={`${alert.productId}-${alert.warehouseId ?? 'all'}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    to={`/products/${alert.productId}`}
                    className="block truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {alert.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {alert.warehouseCode ?? 'All warehouses'} · {quantityLabel(alert)}
                  </p>
                </div>
                <StockStatusBadge status={alert.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
