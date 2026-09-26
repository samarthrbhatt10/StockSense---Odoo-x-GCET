import { Badge } from '@/components/ui/badge'
import type { StockStatus } from '@/lib/types'

const STOCK_STYLES: Record<StockStatus, { label: string; className: string }> = {
  OK: { label: 'In stock', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOW: { label: 'Low stock', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  OUT: { label: 'Out of stock', className: 'bg-red-50 text-red-700 border-red-200' },
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { label, className } = STOCK_STYLES[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
