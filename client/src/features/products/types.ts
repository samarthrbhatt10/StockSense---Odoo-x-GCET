import type { OperationType, StockStatus } from '@/lib/types'

export type ProductListItem = {
  id: number
  name: string
  sku: string
  uom: string
  category: { id: number; name: string } | null
  isActive: boolean
  onHand: number
  status: StockStatus
}

export type ProductStockByLocation = {
  locationId: number
  fullName: string
  warehouseId: number | null
  warehouseCode: string | null
  quantity: number
}

export type ProductReorderRule = {
  id: number
  warehouseId: number
  warehouseCode: string
  warehouseName: string
  minQty: number
  maxQty: number
  onHand: number
  status: StockStatus
}

export type ProductRecentMove = {
  id: number
  createdAt: string
  reference: string
  type: OperationType
  quantity: number
  fromName: string
  toName: string
  operationId: number | null
}

export type ProductDetail = {
  id: number
  name: string
  sku: string
  uom: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  category: { id: number; name: string } | null
  onHand: number
  status: StockStatus
  stockByLocation: ProductStockByLocation[]
  reorderRules: ProductReorderRule[]
  recentMoves: ProductRecentMove[]
}

export type CategoryListItem = {
  id: number
  name: string
  productCount: number
}

export type ReorderRuleListItem = {
  id: number
  minQty: number
  maxQty: number
  product: { id: number; name: string; sku: string; uom: string }
  warehouse: { id: number; code: string; name: string }
  onHand: number
  status: StockStatus
}

export type StockStatusFilter = '' | StockStatus

export const STOCK_STATUS_FILTERS: { value: StockStatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OK', label: 'In stock' },
  { value: 'LOW', label: 'Low' },
  { value: 'OUT', label: 'Out' },
]

/** The unit-of-measure options offered before "Other…" switches to free text. */
export const UOM_PRESETS = ['Units', 'kg', 'g', 'm', 'L', 'Box', 'Pack'] as const
