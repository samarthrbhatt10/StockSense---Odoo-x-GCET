import type { OperationStatus, OperationType } from '@/lib/types'

export interface DashboardScope {
  warehouseId?: number
  categoryId?: number
}

export interface DashboardFilters extends DashboardScope {
  type?: OperationType
  /** Comma-separated statuses, as in the URL (e.g. "DRAFT,WAITING,READY"). */
  status?: string
}

export interface DashboardKpis {
  productsInStock: number
  totalProducts: number
  lowStock: number
  outOfStock: number
  pendingReceipts: number
  pendingDeliveries: number
  scheduledTransfers: number
  lateOperations: number
}

export interface ActivityDay {
  date: string
  receipts: number
  deliveries: number
  transfers: number
  adjustments: number
}

export interface StockAlert {
  productId: number
  name: string
  sku: string
  uom: string
  warehouseId: number | null
  warehouseCode: string | null
  warehouseName: string | null
  onHand: number
  minQty: number | null
  maxQty: number | null
  status: 'LOW' | 'OUT'
  suggestedQty: number | null
}

export interface DashboardSummary {
  kpis: DashboardKpis
  activity: ActivityDay[]
  lowStockPreview: StockAlert[]
}

export interface DashboardOperation {
  id: number
  reference: string
  type: OperationType
  status: OperationStatus
  partnerName: string | null
  scheduledDate: string
  isLate: boolean
  sourceName: string
  destName: string
  lineCount: number
}
