import type { ComponentType } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangleIcon,
  ArrowLeftRightIcon,
  PackageCheckIcon,
  PackageIcon,
  PackageXIcon,
  TruckIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PENDING_STATUS_PARAM } from '../hooks'
import type { DashboardKpis, DashboardScope } from '../types'
import { withParams } from '../utils'

type Tone = 'default' | 'amber' | 'red'

type KpiCard = {
  label: string
  value: number
  hint?: string
  to: string
  icon: ComponentType<{ className?: string }>
  tone: Tone
}

const VALUE_TONE: Record<Tone, string> = {
  default: 'text-foreground',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

const ICON_TONE: Record<Tone, string> = {
  default: 'bg-primary/10 text-primary',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
}

function buildCards(kpis: DashboardKpis, { warehouseId, categoryId }: DashboardScope): KpiCard[] {
  const productScope = { warehouseId, categoryId }
  const pending = { status: PENDING_STATUS_PARAM, warehouseId }
  return [
    {
      label: 'Products in stock',
      value: kpis.productsInStock,
      hint: `of ${kpis.totalProducts} products`,
      to: withParams('/products', productScope),
      icon: PackageIcon,
      tone: 'default',
    },
    {
      label: 'Low stock',
      value: kpis.lowStock,
      hint: 'below reorder minimum',
      to: withParams('/products', { stockStatus: 'LOW', ...productScope }),
      icon: AlertTriangleIcon,
      tone: kpis.lowStock > 0 ? 'amber' : 'default',
    },
    {
      label: 'Out of stock',
      value: kpis.outOfStock,
      hint: 'nothing on hand',
      to: withParams('/products', { stockStatus: 'OUT', ...productScope }),
      icon: PackageXIcon,
      tone: kpis.outOfStock > 0 ? 'red' : 'default',
    },
    {
      label: 'Pending receipts',
      value: kpis.pendingReceipts,
      hint: 'draft, waiting or ready',
      to: withParams('/operations/receipts', pending),
      icon: PackageCheckIcon,
      tone: 'default',
    },
    {
      label: 'Pending deliveries',
      value: kpis.pendingDeliveries,
      hint: 'draft, waiting or ready',
      to: withParams('/operations/deliveries', pending),
      icon: TruckIcon,
      tone: 'default',
    },
    {
      label: 'Internal transfers scheduled',
      value: kpis.scheduledTransfers,
      hint: 'draft, waiting or ready',
      to: withParams('/operations/transfers', pending),
      icon: ArrowLeftRightIcon,
      tone: 'default',
    },
  ]
}

export function KpiCards({ kpis, scope }: { kpis: DashboardKpis; scope: DashboardScope }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4">
      {buildCards(kpis, scope).map((card) => (
        <Link
          key={card.label}
          to={card.to}
          className="group flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm leading-tight font-medium text-muted-foreground">{card.label}</span>
            <span className={cn('rounded-md p-1.5', ICON_TONE[card.tone])}>
              <card.icon className="size-4" />
            </span>
          </div>
          <div className="min-w-0">
            <p className={cn('text-2xl font-semibold tabular-nums sm:text-3xl', VALUE_TONE[card.tone])}>
              {card.value}
            </p>
            {card.hint ? <p className="truncate text-xs text-muted-foreground">{card.hint}</p> : null}
          </div>
        </Link>
      ))}
    </div>
  )
}
