import type { OperationStatus, OperationType } from '@/lib/types'

export interface SearchProduct {
  id: number
  name: string
  sku: string
  uom: string
}

export interface SearchOperation {
  id: number
  reference: string
  type: OperationType
  status: OperationStatus
  partnerName: string | null
}

export interface SearchResults {
  products: SearchProduct[]
  operations: SearchOperation[]
}
