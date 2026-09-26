import { AlertTriangleIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import { formatQty } from '@/lib/format'
import { useLookupStock } from '@/lib/lookups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductPicker, type PickedProduct } from './ProductPicker'
import type { KindConfig } from '../kinds'
import type { OperationFormValues } from '../schemas'

interface LinesEditorProps {
  form: UseFormReturn<OperationFormValues>
  config: KindConfig
  /** Where the availability hints are read from: deliveries and transfers. */
  sourceLocationId: number | null
}

function newLine(): OperationFormValues['lines'][number] {
  return {
    productId: 0,
    productName: '',
    productSku: '',
    productUom: '',
    quantity: 1,
    countedQuantity: 0,
  }
}

export function LinesEditor({ form, config, sourceLocationId }: LinesEditorProps) {
  const lines = form.watch('lines')
  const errors = form.formState.errors
  const submitted = form.formState.submitCount > 0

  const { data: stock = [] } = useLookupStock(
    { locationId: sourceLocationId ?? undefined },
    { enabled: config.showsAvailability && sourceLocationId !== null },
  )

  const pickedIds = lines.map((line) => line.productId).filter((id) => id > 0)

  function setLines(next: OperationFormValues['lines']): void {
    form.setValue('lines', next, { shouldValidate: true, shouldDirty: true })
  }

  function addLine(): void {
    setLines([...lines, newLine()])
  }

  function availableFor(productId: number): number | null {
    if (!config.showsAvailability || sourceLocationId === null || productId === 0) return null
    return stock.find((quant) => quant.productId === productId)?.quantity ?? 0
  }

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const available = availableFor(line.productId)
        const short = available !== null && line.quantity > available
        // Only after a save attempt, so a freshly added line doesn't start out red.
        const productError = submitted && line.productId === 0 ? 'Select a product' : undefined
        const quantityError = line.productId === 0 ? undefined : line.quantity > 0 ? undefined : 'Must be more than 0'
        const value: PickedProduct | null =
          line.productId === 0
            ? null
            : { id: line.productId, name: line.productName, sku: line.productSku, uom: line.productUom }

        return (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-start"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <ProductPicker
                value={value}
                onChange={(product) => {
                  const next = [...lines]
                  next[index] = {
                    ...next[index],
                    productId: product.id,
                    productName: product.name,
                    productSku: product.sku,
                    productUom: product.uom,
                  }
                  setLines(next)
                }}
                excludeIds={pickedIds.filter((id) => id !== line.productId)}
                invalid={Boolean(productError)}
                placeholder={`Add product ${index + 1}`}
              />
              {productError ? (
                <p className="text-xs text-destructive">{productError}</p>
              ) : null}
            </div>

            <div className="w-full space-y-1 md:w-40">
              <label className="sr-only" htmlFor={`line-quantity-${index}`}>
                Quantity
              </label>
              <div className="flex items-center gap-1.5">
                <Input
                  id={`line-quantity-${index}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={Number.isFinite(line.quantity) ? line.quantity : ''}
                  onChange={(event) => {
                    const parsed = Number(event.target.value)
                    const next = [...lines]
                    next[index] = { ...next[index], quantity: Number.isFinite(parsed) ? parsed : 0 }
                    setLines(next)
                  }}
                  onKeyDown={(event) => {
                    // Enter in the last row starts a new one.
                    if (event.key !== 'Enter' || index !== lines.length - 1) return
                    event.preventDefault()
                    addLine()
                  }}
                  placeholder="0"
                  aria-invalid={Boolean(quantityError)}
                  className="h-8"
                />
                {line.productUom ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{line.productUom}</span>
                ) : null}
              </div>
              {quantityError ? (
                <p className="text-xs text-destructive">{quantityError}</p>
              ) : available !== null ? (
                <p
                  className={`flex items-start gap-1 text-xs ${
                    short ? 'text-amber-600' : 'text-muted-foreground'
                  }`}
                >
                  {short ? <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" /> : null}
                  {short
                    ? `Only ${formatQty(available, line.productUom)} available; this will wait for stock`
                    : `Available: ${formatQty(available, line.productUom)}`}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove product ${index + 1}`}
              className="shrink-0 self-start text-muted-foreground hover:text-destructive md:mt-0"
              onClick={() => setLines(lines.filter((_, i) => i !== index))}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        )
      })}

      {errors.lines?.message ? (
        <p className="text-sm text-destructive">{errors.lines.message}</p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={addLine}
      >
        <PlusIcon className="size-4" />
        Add product
      </Button>
    </div>
  )
}
