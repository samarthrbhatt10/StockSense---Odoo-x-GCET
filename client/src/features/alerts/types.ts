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

export interface LowStockResult {
  items: StockAlert[]
  counts: { low: number; out: number }
}
