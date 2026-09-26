import type { LocationType, OperationType } from '@/lib/types'

export type MoveDirection = 'IN' | 'OUT' | 'INTERNAL'

export interface MoveLocation {
  id: number
  fullName: string
  type: LocationType
}

export interface MoveRow {
  id: number
  createdAt: string
  reference: string
  type: OperationType
  operationId: number | null
  product: { id: number; name: string; sku: string; uom: string }
  from: MoveLocation
  to: MoveLocation
  quantity: number
  direction: MoveDirection
  createdBy: { id: number; name: string }
}

/** Filters as they live in the URL (CONTRACT §6.7). */
export interface MoveFilters {
  search?: string
  productId?: number
  locationId?: number
  warehouseId?: number
  type?: OperationType
  dateFrom?: string
  dateTo?: string
}
