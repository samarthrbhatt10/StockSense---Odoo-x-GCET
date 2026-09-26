import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, ListChecksIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, ErrorState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import NotFoundPage from '@/app/NotFoundPage'
import { formatQty } from '@/lib/format'
import { useQueryParams } from '@/lib/hooks'
import { useLookupProducts, useLookupStock } from '@/lib/lookups'
import {
  useConfirmOperation,
  useCreateOperation,
  useOperation,
  useUpdateOperation,
} from '../hooks'
import { resolveKind } from '../kinds'
import { adjustmentFormSchema, type AdjustmentFormValues } from '../schemas'
import type { OperationCreateBody } from '../api'
import type { Operation } from '../types'
import {
  applyServerFieldErrors,
  formatDifference,
  parseIdParam,
  toDateInputValue,
  todayInputValue,
} from '../utils'
import { LocationSelect } from './LocationSelect'
import { ProductPicker, type PickedProduct } from './ProductPicker'

interface AdjustmentFormProps {
  kind: string
  id?: string
}

type AdjustmentLine = AdjustmentFormValues['lines'][number]

export function AdjustmentForm({ kind, id }: AdjustmentFormProps) {
  const navigate = useNavigate()
  const [params] = useQueryParams()
  const isEdit = Boolean(id)
  const operationId = isEdit ? Number(id) : 0
  const config = resolveKind(kind)?.config

  const operation = useOperation(operationId)
  const products = useLookupProducts()
  const [pendingLocation, setPendingLocation] = useState<number | null>(null)

  const prefillProductId = parseIdParam(params.productId)
  const prefillLocationId = parseIdParam(params.locationId)

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      destLocationId: prefillLocationId ?? null,
      scheduledDate: todayInputValue(),
      notes: '',
      lines: [],
    },
  })

  const locationId = form.watch('destLocationId')
  const lines = form.watch('lines')
  const errors = form.formState.errors

  // Recorded quantities are always the live stock at the counted location.
  const { data: stock = [] } = useLookupStock({ locationId: locationId ?? undefined })

  const create = useCreateOperation()
  const update = useUpdateOperation()
  const confirm = useConfirmOperation()
  const isPending = create.isPending || update.isPending || confirm.isPending

  const recordedFor = (productId: number): number =>
    stock.find((quant) => quant.productId === productId)?.quantity ?? 0

  const prefillDone = useRef(false)
  const awaitingRecorded = useRef<number | null>(null)
  useEffect(() => {
    if (isEdit || prefillDone.current || !prefillProductId) return
    const product = products.data?.find((candidate) => candidate.id === prefillProductId)
    if (!product) return
    prefillDone.current = true
    // The recorded quantity may still be loading; the effect below fills it in.
    awaitingRecorded.current = product.id
    form.setValue(
      'lines',
      [
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productUom: product.uom,
          countedQuantity: 0,
        },
      ],
      { shouldDirty: true },
    )
  }, [form, isEdit, prefillProductId, products.data])

  // Counted starts at the recorded quantity, as soon as the stock is known.
  useEffect(() => {
    const productId = awaitingRecorded.current
    if (productId === null || !stock) return
    const current = form.getValues('lines')
    if (current.length !== 1 || current[0].productId !== productId) return
    awaitingRecorded.current = null
    form.setValue('lines', [{ ...current[0], countedQuantity: recordedFor(productId) }], {
      shouldDirty: true,
    })
  })

  const loadedId = useRef<number | null>(null)
  useEffect(() => {
    if (!isEdit || !operation.data || loadedId.current === operation.data.id) return
    loadedId.current = operation.data.id
    const data = operation.data
    form.reset({
      destLocationId: data.destLocation.id,
      scheduledDate: toDateInputValue(data.scheduledDate),
      notes: data.notes ?? '',
      lines: data.lines.map((line) => ({
        productId: line.productId,
        productName: line.product.name,
        productSku: line.product.sku,
        productUom: line.product.uom,
        countedQuantity: line.countedQuantity ?? 0,
      })),
    })
  }, [form, isEdit, operation.data])

  function setLines(next: AdjustmentLine[]): void {
    form.setValue('lines', next, { shouldValidate: true, shouldDirty: true })
  }

  function addProduct(product: PickedProduct): void {
    setLines([
      ...lines,
      {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productUom: product.uom,
        countedQuantity: recordedFor(product.id),
      },
    ])
  }

  /** One line per product that actually holds stock here, counted = recorded. */
  function countAll(): void {
    const here = stock
      .filter((quant) => quant.quantity > 0)
      .flatMap((quant) => {
        const product = products.data?.find((candidate) => candidate.id === quant.productId)
        return product
          ? [
              {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                productUom: product.uom,
                countedQuantity: quant.quantity,
              },
            ]
          : []
      })
    const merged = [...lines]
    for (const line of here) {
      if (merged.some((existing) => existing.productId === line.productId)) continue
      merged.push(line)
    }
    setLines(merged)
    toast.success(`Counting ${merged.length} products at this location. Edit the mismatches.`)
  }

  function onLocationChange(next: number | null): void {
    if (next === null) return
    // Changing the counted location with lines on the go needs a confirmation.
    if (lines.length > 0 && next !== locationId) {
      setPendingLocation(next)
      return
    }
    form.setValue('destLocationId', next, { shouldValidate: true })
  }

  function save(values: AdjustmentFormValues, andConfirm: boolean): void {
    const body: OperationCreateBody = {
      type: 'ADJUSTMENT',
      ...(values.destLocationId ? { destLocationId: values.destLocationId } : {}),
      scheduledDate: values.scheduledDate,
      ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
      // Adjustments carry the counted quantity only; the server records the system one.
      lines: values.lines.map((line) => ({
        productId: line.productId,
        countedQuantity: line.countedQuantity,
      })),
    }
    const done = (saved: Operation): void => {
      if (!andConfirm) {
        toast.success(isEdit ? 'Draft updated.' : 'Draft saved.')
        navigate(`/operations/${kind}/${saved.id}`, { replace: true })
        return
      }
      confirm.mutate(saved.id, {
        onSuccess: (confirmed) => navigate(`/operations/${kind}/${confirmed.id}`),
      })
    }
    const onError = (error: unknown): void => {
      const mapped = applyServerFieldErrors(error, (field, message) => {
        // The adjustment form has no source or partner field.
        if (field === 'sourceLocationId' || field === 'partnerName') return
        form.setError(field, { message })
      })
      if (!mapped) {
        toast.error(error instanceof Error ? error.message : 'Could not save the adjustment.')
      }
    }

    if (isEdit) update.mutate({ id: operationId, body }, { onSuccess: done, onError })
    else create.mutate(body, { onSuccess: done, onError })
  }

  const title = isEdit ? 'Edit Inventory Adjustment' : 'New Inventory Adjustment'

  if (isEdit && operation.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} backTo={`/operations/${kind}`} />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isEdit && operation.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} backTo={`/operations/${kind}`} />
        <ErrorState error={operation.error} onRetry={() => void operation.refetch()} />
      </div>
    )
  }

  if (isEdit && operation.data && operation.data.type !== 'ADJUSTMENT') return <NotFoundPage />

  if (isEdit && operation.data && operation.data.status !== 'DRAFT') {
    return (
      <div className="space-y-6">
        <PageHeader title={title} backTo={`/operations/${kind}`} />
        <ErrorState
          error={new Error('Only draft adjustments can be edited. Open the document instead.')}
        />
      </div>
    )
  }

  const pickedIds = lines.map((line) => line.productId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={config?.description}
        backTo={`/operations/${kind}`}
      />

      <form onSubmit={form.handleSubmit((values) => save(values, false))} noValidate className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Count</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="counted-location">Counted location</Label>
              <LocationSelect
                id="counted-location"
                value={locationId}
                onChange={onLocationChange}
                invalid={Boolean(errors.destLocationId)}
                placeholder="Select the location being counted"
              />
              {errors.destLocationId ? (
                <p className="text-sm text-destructive">{errors.destLocationId.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheduled-date">Scheduled date</Label>
              <Input
                id="scheduled-date"
                type="date"
                aria-invalid={Boolean(errors.scheduledDate)}
                {...form.register('scheduledDate')}
              />
              {errors.scheduledDate ? (
                <p className="text-sm text-destructive">{errors.scheduledDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Reason</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="e.g. Damaged during handling, cycle count"
                aria-invalid={Boolean(errors.notes)}
                {...form.register('notes')}
              />
              {errors.notes ? (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {lines.map((line, index) => {
                const recorded = recordedFor(line.productId)
                const difference = Math.round((line.countedQuantity - recorded) * 1000) / 1000
                return (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-start"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{line.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{line.productSku}</p>
                    </div>

                    <div className="w-full space-y-1 md:w-28">
                      <p className="text-xs text-muted-foreground">Recorded</p>
                      <p className="text-sm tabular-nums">{formatQty(recorded, line.productUom)}</p>
                    </div>

                    <div className="w-full space-y-1 md:w-32">
                      <label className="text-xs text-muted-foreground" htmlFor={`counted-${index}`}>
                        Counted
                      </label>
                      <Input
                        id={`counted-${index}`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={Number.isFinite(line.countedQuantity) ? line.countedQuantity : ''}
                        placeholder="0"
                        onChange={(event) => {
                          const parsed = Number(event.target.value)
                          const next = [...lines]
                          next[index] = {
                            ...next[index],
                            countedQuantity: Number.isFinite(parsed) ? parsed : 0,
                          }
                          setLines(next)
                        }}
                        onKeyDown={(event) => {
                          // Enter in the last row starts a new one.
                          if (event.key !== 'Enter' || index !== lines.length - 1) return
                          event.preventDefault()
                          setLines([
                            ...lines,
                            {
                              productId: 0,
                              productName: '',
                              productSku: '',
                              productUom: '',
                              countedQuantity: 0,
                            },
                          ])
                        }}
                        className="h-8"
                      />
                    </div>

                    <div className="w-full space-y-1 md:w-28">
                      <p className="text-xs text-muted-foreground">Difference</p>
                      <p
                        className={`text-sm font-medium tabular-nums ${
                          difference > 0
                            ? 'text-emerald-700'
                            : difference < 0
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                        }`}
                      >
                        {formatDifference(difference, line.productUom)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${line.productName}`}
                      className="shrink-0 self-start text-muted-foreground hover:text-destructive"
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
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <ProductPicker
                  value={null}
                  onChange={addProduct}
                  excludeIds={pickedIds}
                  placeholder="Add product"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={countAll}
                disabled={locationId === null}
                className="gap-1.5"
              >
                <ListChecksIcon className="size-4" />
                Count all products here
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <Button type="submit" variant="outline" disabled={isPending} className="sm:w-36">
            {create.isPending || update.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : null}
            Save draft
          </Button>
          <Button
            type="button"
            disabled={isPending}
            className="gap-1.5 sm:w-44"
            onClick={form.handleSubmit((values) => save(values, true))}
          >
            {confirm.isPending ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <ArrowRightIcon />
            )}
            Save &amp; confirm
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={pendingLocation !== null}
        onOpenChange={(open) => {
          if (!open) setPendingLocation(null)
        }}
        title="Change the counted location?"
        description="The recorded quantities will be read from the new location. The counted numbers you typed stay as they are."
        confirmLabel="Change location"
        onConfirm={() => {
          if (pendingLocation !== null) {
            form.setValue('destLocationId', pendingLocation, { shouldValidate: true })
          }
          setPendingLocation(null)
        }}
      />
    </div>
  )
}
