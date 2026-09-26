export type Role = 'MANAGER' | 'STAFF'

export type LocationType = 'INTERNAL' | 'VENDOR' | 'CUSTOMER' | 'ADJUSTMENT'

export type OperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL' | 'ADJUSTMENT'

export type OperationStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED'

export type StockStatus = 'OK' | 'LOW' | 'OUT'

export type OperationKind = 'receipts' | 'deliveries' | 'transfers' | 'adjustments'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface ListMeta {
  total: number
  page: number
  pageSize: number
}

export interface LookupProduct {
  id: number
  name: string
  sku: string
  uom: string
  categoryId: number | null
  categoryName: string | null
}

export interface LookupLocation {
  id: number
  name: string
  fullName: string
  type: LocationType
  warehouseId: number | null
  warehouseCode: string | null
}

export interface LookupWarehouse {
  id: number
  name: string
  code: string
}

export interface LookupCategory {
  id: number
  name: string
}

export interface LookupStock {
  productId: number
  locationId: number
  quantity: number
}

export const KIND_TO_TYPE: Record<OperationKind, OperationType> = {
  receipts: 'RECEIPT',
  deliveries: 'DELIVERY',
  transfers: 'INTERNAL',
  adjustments: 'ADJUSTMENT',
}

export const TYPE_TO_KIND: Record<OperationType, OperationKind> = {
  RECEIPT: 'receipts',
  DELIVERY: 'deliveries',
  INTERNAL: 'transfers',
  ADJUSTMENT: 'adjustments',
}

export const OPERATION_LABELS: Record<OperationType, { singular: string; plural: string }> = {
  RECEIPT: { singular: 'Receipt', plural: 'Receipts' },
  DELIVERY: { singular: 'Delivery Order', plural: 'Delivery Orders' },
  INTERNAL: { singular: 'Internal Transfer', plural: 'Internal Transfers' },
  ADJUSTMENT: { singular: 'Inventory Adjustment', plural: 'Inventory Adjustments' },
}

export const STATUS_LABELS: Record<OperationStatus, string> = {
  DRAFT: 'Draft',
  WAITING: 'Waiting',
  READY: 'Ready',
  DONE: 'Done',
  CANCELED: 'Canceled',
}

export const PENDING_STATUSES: OperationStatus[] = ['DRAFT', 'WAITING', 'READY']

export const OPERATION_KINDS: OperationKind[] = ['receipts', 'deliveries', 'transfers', 'adjustments']

export function isOperationKind(value: string): value is OperationKind {
  return (OPERATION_KINDS as string[]).includes(value)
}
