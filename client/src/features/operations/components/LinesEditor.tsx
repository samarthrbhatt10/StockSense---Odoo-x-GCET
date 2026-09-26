import { AlertTriangleIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { useLookupStock } from '@/lib/lookups'
import { formatQty } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductPicker } from './ProductPicker'
import type { OperationFormValues } from '../schemas'

interface LinesEditorProps {
  form: UseFormReturn<OperationFormValues>
  showsAvailability: boolean
  sourceLocationId: number | null
  isAdjustment?: boolean
}

export function LinesEditor({ form, showsAvailability, sourceLocationId, isAdjustment = false }: LinesEditorProps) {
  const lines = form.watch('lines')
  const { data: stockData = [] } = useLookupStock(
    { locationId: sourceLocationId ?? undefined },
    { enabled: showsAvailability && !!sourceLocationId },
  )

  function getAvailable(productId: number): number | null {
    if (!showsAvailability || !sourceLocationId) return null
    return stockData.find((s) => s.productId === productId)?.quantity ?? 0
  }

  function addLine() {
    form.setValue('lines', [
      ...lines,
      { productId: 0, productName: '', productSku: '', productUom: '', quantity: 1, countedQuantity: 0 },
    ])
  }

  function removeLine(index: number) {
    form.setValue(
      'lines',
      lines.filter((_, i) => i !== index),
    )
  }

  function updateProduct(index: number, id: number, name: string, sku: string, uom: string) {
    const next = [...lines]
    next[index] = { ...next[index], productId: id, productName: name, productSku: sku, productUom: uom }
    form.setValue('lines', next)
  }

  function updateQty(index: number, value: string) {
    const next = [...lines]
    const num = parseFloat(value)
    next[index] = { ...next[index], quantity: Number.isNaN(num) ? 0 : num }
    form.setValue('lines', next)
  }

  function updateCounted(index: number, value: string) {
    const next = [...lines]
    const num = parseFloat(value)
    next[index] = { ...next[index], countedQuantity: Number.isNaN(num) ? 0 : num }
    form.setValue('lines', next)
  }

  const pickedIds = lines.map((l) => l.productId).filter(Boolean)

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const available = getAvailable(line.productId)
        const qty = isAdjustment ? line.countedQuantity : line.quantity
        const isOver = showsAvailability && available !== null && line.productId > 0 && line.quantity > available

        return (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start">
            {/* Product picker */}
            <div className="flex-1 min-w-0">
              <ProductPicker
                value={line.productId || null}
                onChange={(id, name, sku, uom) => updateProduct(index, id, name, sku, uom)}
                excludeIds={pickedIds.filter((id) => id !== line.productId)}
              />
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1 w-full sm:w-36">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={isAdjustment ? '0' : '0.001'}
                  step="any"
                  value={qty || ''}
                  onChange={(e) => isAdjustment ? updateCounted(index, e.target.value) : updateQty(index, e.target.value)}
                  placeholder={isAdjustment ? 'Counted' : 'Qty'}
                  className="h-9"
                />
                {line.productUom && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{line.productUom}</span>
                )}
              </div>
              {/* Availability hint */}
              {showsAvailability && available !== null && line.productId > 0 && (
                <p className={`text-xs flex items-center gap-1 ${isOver ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {isOver && <AlertTriangleIcon className="size-3 shrink-0" />}
                  {isOver
                    ? `Only ${formatQty(available, line.productUom)} available — will wait for stock`
                    : `Available: ${formatQty(available, line.productUom)}`}
                </p>
              )}
            </div>

            {/* Remove */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeLine(index)}
              disabled={lines.length === 1}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        )
      })}

      <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-full gap-1.5">
        <PlusIcon className="size-4" />
        Add product
      </Button>
    </div>
  )
}
