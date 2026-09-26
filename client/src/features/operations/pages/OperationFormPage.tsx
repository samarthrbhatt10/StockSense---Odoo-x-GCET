import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react'
import { ErrorState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import NotFoundPage from '@/app/NotFoundPage'
import { useQueryParams } from '@/lib/hooks'
import { useLookupProducts } from '@/lib/lookups'
import type { OperationKind } from '@/lib/types'
import { AdjustmentForm } from '../components/AdjustmentForm'
import { LinesEditor } from '../components/LinesEditor'
import { LocationSelect } from '../components/LocationSelect'
import {
  useConfirmOperation,
  useCreateOperation,
  useOperation,
  useUpdateOperation,
} from '../hooks'
import { resolveKind, type KindConfig } from '../kinds'
import { buildOperationFormSchema, type OperationFormValues } from '../schemas'
import type { Operation } from '../types'
import { applyServerFieldErrors, parseIdParam, parseNumberParam, toApiBody, toDateInputValue, todayInputValue } from '../utils'

export default function OperationFormPage() {
  const { kind, id } = useParams()
  const resolved = resolveKind(kind)
  if (!resolved) return <NotFoundPage />
  if (resolved.config.type === 'ADJUSTMENT') {
    return <AdjustmentForm kind={resolved.kind} id={id} />
  }

  return <OperationForm kind={resolved.kind} config={resolved.config} id={id} />
}

function blankValues(config: KindConfig, locationId: number | undefined): OperationFormValues {
  return {
    partnerName: '',
    // §6.7: `locationId` prefills the destination for receipts and the source otherwise.
    sourceLocationId: config.needsSource ? (locationId ?? null) : null,
    destLocationId: config.needsDest && !config.needsSource ? (locationId ?? null) : null,
    scheduledDate: todayInputValue(),
    notes: '',
    lines: [],
  }
}

function valuesFromOperation(operation: Operation, config: KindConfig): OperationFormValues {
  return {
    partnerName: operation.partnerName ?? '',
    sourceLocationId: config.needsSource ? operation.sourceLocation.id : null,
    destLocationId: config.needsDest ? operation.destLocation.id : null,
    scheduledDate: toDateInputValue(operation.scheduledDate),
    notes: operation.notes ?? '',
    lines: operation.lines.map((line) => ({
      productId: line.productId,
      productName: line.product.name,
      productSku: line.product.sku,
      productUom: line.product.uom,
      quantity: line.quantity,
      countedQuantity: line.countedQuantity ?? 0,
    })),
  }
}

function EditRedirect({ to, message }: { to: string; message: string }) {
  const navigate = useNavigate()
  useEffect(() => {
    toast.error(message)
    navigate(to, { replace: true })
  }, [message, navigate, to])
  return null
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function OperationForm({
  kind,
  config,
  id,
}: {
  kind: OperationKind
  config: KindConfig
  id?: string
}) {
  const navigate = useNavigate()
  const [params] = useQueryParams()
  const isEdit = Boolean(id)
  const operationId = isEdit ? Number(id) : 0

  const operation = useOperation(operationId)
  const products = useLookupProducts()
  const resolver = useMemo(() => zodResolver(buildOperationFormSchema(config)), [config])

  const prefillProductId = parseIdParam(params.productId)
  const prefillQuantity = parseNumberParam(params.quantity, 1)
  const prefillLocationId = parseIdParam(params.locationId)

  const form = useForm<OperationFormValues>({
    resolver,
    defaultValues: blankValues(config, prefillLocationId),
  })

  const create = useCreateOperation()
  const update = useUpdateOperation()
  const confirm = useConfirmOperation()
  const isPending = create.isPending || update.isPending || confirm.isPending

  // One line prefilled from `?productId` (CONTRACT §6.7), once the product names are loaded.
  const prefillDone = useRef(false)
  useEffect(() => {
    if (isEdit || prefillDone.current || !prefillProductId) return
    const product = products.data?.find((candidate) => candidate.id === prefillProductId)
    if (!product) return
    prefillDone.current = true
    form.setValue(
      'lines',
      [
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          productUom: product.uom,
          quantity: prefillQuantity,
          countedQuantity: 0,
        },
      ],
      { shouldDirty: true },
    )
  }, [form, isEdit, prefillProductId, prefillQuantity, products.data])

  // Editing loads the draft into the form as soon as it arrives.
  const loadedId = useRef<number | null>(null)
  useEffect(() => {
    if (!isEdit || !operation.data || loadedId.current === operation.data.id) return
    loadedId.current = operation.data.id
    form.reset(valuesFromOperation(operation.data, config))
  }, [config, form, isEdit, operation.data])

  const sourceLocationId = form.watch('sourceLocationId')
  const destLocationId = form.watch('destLocationId')
  const errors = form.formState.errors

  function handleError(error: unknown): void {
    // Server field errors land on their input; anything else becomes a toast.
    const mapped = applyServerFieldErrors(error, (field, message) =>
      form.setError(field, { message }),
    )
    if (!mapped) {
      toast.error(error instanceof Error ? error.message : 'Could not save the operation.')
    }
  }

  function save(values: OperationFormValues, andConfirm: boolean): void {
    const body = toApiBody(config, values)
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

    if (isEdit) {
      update.mutate({ id: operationId, body }, { onSuccess: done, onError: handleError })
    } else {
      create.mutate(body, { onSuccess: done, onError: handleError })
    }
  }

  const title = isEdit ? `Edit ${config.labels.singular}` : `New ${config.labels.singular}`

  if (isEdit && operation.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title={title} backTo={`/operations/${kind}`} />
        <FormSkeleton />
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

  // A document of another kind under this URL is not this page's business.
  if (isEdit && operation.data && operation.data.type !== config.type) return <NotFoundPage />

  if (isEdit && operation.data && operation.data.status !== 'DRAFT') {
    return (
      <EditRedirect
        to={`/operations/${kind}/${operation.data.id}`}
        message="Only draft operations can be edited."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={config.description} backTo={`/operations/${kind}`} />

      <form
        onSubmit={form.handleSubmit((values) => save(values, false))}
        noValidate
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {config.partnerLabel ? (
              <div className="space-y-1.5">
                <Label htmlFor="partner-name">{config.partnerLabel}</Label>
                <Input
                  id="partner-name"
                  autoComplete="off"
                  placeholder={
                    config.partnerLabel === 'Supplier' ? 'Acme Steel' : 'Northwind Traders'
                  }
                  aria-invalid={Boolean(errors.partnerName)}
                  {...form.register('partnerName')}
                />
                {errors.partnerName ? (
                  <p className="text-sm text-destructive">{errors.partnerName.message}</p>
                ) : null}
              </div>
            ) : null}

            {config.needsSource ? (
              <div className="space-y-1.5">
                <Label htmlFor="source-location">{config.sourceLabel}</Label>
                <LocationSelect
                  id="source-location"
                  value={sourceLocationId}
                  onChange={(id) => {
                    form.setValue('sourceLocationId', id, { shouldValidate: true })
                    // A transfer cannot go from a location to itself.
                    if (id !== null && id === destLocationId) {
                      form.setValue('destLocationId', null, { shouldValidate: true })
                    }
                  }}
                  invalid={Boolean(errors.sourceLocationId)}
                  placeholder="Select the source location"
                />
                {errors.sourceLocationId ? (
                  <p className="text-sm text-destructive">{errors.sourceLocationId.message}</p>
                ) : null}
              </div>
            ) : null}

            {config.needsDest ? (
              <div className="space-y-1.5">
                <Label htmlFor="dest-location">{config.destLabel}</Label>
                <LocationSelect
                  id="dest-location"
                  value={destLocationId}
                  excludeId={config.needsSource ? (sourceLocationId ?? undefined) : undefined}
                  onChange={(id) => form.setValue('destLocationId', id, { shouldValidate: true })}
                  invalid={Boolean(errors.destLocationId)}
                  placeholder="Select the destination location"
                />
                {errors.destLocationId ? (
                  <p className="text-sm text-destructive">{errors.destLocationId.message}</p>
                ) : null}
              </div>
            ) : null}

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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Anything worth remembering about this document"
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
          <CardContent>
            <LinesEditor form={form} config={config} sourceLocationId={sourceLocationId} />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <Button
            type="submit"
            variant="outline"
            disabled={isPending}
            className="sm:w-36"
          >
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
    </div>
  )
}
