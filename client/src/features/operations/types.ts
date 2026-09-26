import type { OperationStatus, OperationType } from '@/lib/types'

// ---------------------------------------------------------------------------
// Server response shapes (mirror server/src/modules/operations/service.ts)
// ---------------------------------------------------------------------------

export interface OperationLine {
  id: number
  productId: number
  product: { id: number; name: string; sku: string; uom: string }
  quantity: number
  countedQuantity: number | null
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
// Form input types
// ---------------------------------------------------------------------------

export interface LineInput {
  productId: number
  productName: string
  productSku: string
  productUom: string
  quantity: number
  countedQuantity: number
}

export interface OperationFormValues {
  partnerName: string
  sourceLocationId: number | null
  destLocationId: number | null
  scheduledDate: string
  notes: string
  lines: LineInput[]
}
