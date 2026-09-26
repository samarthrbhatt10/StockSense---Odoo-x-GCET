import type { OperationStatus, OperationType } from '@/lib/types'

// ---------------------------------------------------------------------------
// Server response shapes
// (mirror server/src/modules/operations/service.ts → formatSummary/formatDetail)
// ---------------------------------------------------------------------------

export interface OperationProductRef {
  id: number
  name: string
  sku: string
  uom: string
}

export interface OperationLine {
  id: number
  productId: number
  product: OperationProductRef
  quantity: number
  countedQuantity: number | null
  /** Live on hand at the source (deliveries/transfers) or the counted location (adjustments). */
  available: number | null
}

export interface OperationMove {
  id: number
  productId: number
  productName: string
  fromName: string
  toName: string
  quantity: number
  createdAt: string
}

export interface OperationSummary {
  id: number
  reference: string
  type: OperationType
  status: OperationStatus
  partnerName: string | null
  scheduledDate: string
  doneAt: string | null
  isLate: boolean
  sourceLocation: { id: number; fullName: string }
  destLocation: { id: number; fullName: string }
  lineCount: number
  totalQuantity: number
  createdBy: { id: number; name: string }
}

export interface Operation extends OperationSummary {
  notes: string | null
  createdAt: string
  updatedAt: string
  lines: OperationLine[]
  moves: OperationMove[]
}

// ---------------------------------------------------------------------------
// List filters, mirrored in the URL (CONTRACT §6.7)
// ---------------------------------------------------------------------------

export interface OperationFilters {
  /** Comma list in the URL, an array in code. */
  status?: OperationStatus[]
  warehouseId?: number
  search?: string
}
