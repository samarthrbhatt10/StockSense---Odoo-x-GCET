import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'
import { useQueryParams } from '@/lib/hooks'
import { useLookupCategories, useLookupLocations } from '@/lib/lookups'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader, ErrorState } from '@/components/common'
import { UomField } from '../components/UomField'
import { useCreateProduct, useProduct, useUpdateProduct } from '../hooks'
import {
  initialStockSchema,
  productFormSchema,
  type InitialStockValues,
  type ProductFormValues,
} from '../schemas'

const NONE_CATEGORY = 'none'

export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const productId = Number(id)
  const navigate = useNavigate()
  const [params] = useQueryParams()

  const categories = useLookupCategories()
  const locations = useLookupLocations({ type: 'INTERNAL' })
  const existing = useProduct(isEdit ? productId : undefined)

  const create = useCreateProduct()
  const update = useUpdateProduct()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: '', sku: '', uom: 'Units', categoryId: '', isActive: true },
  })

  const [initialStock, setInitialStock] = useState<InitialStockValues>({
    locationId: '',
    quantity: '',
  })
  const [stockError, setStockError] = useState<string | null>(null)

  const categoryId = watch('categoryId')
  const uom = watch('uom')
  const isActive = watch('isActive')

  // In edit mode the form mirrors the loaded product.
  useEffect(() => {
    if (!isEdit || !existing.data) return
    reset({
      name: existing.data.name,
      sku: existing.data.sku,
      uom: existing.data.uom,
      categoryId: existing.data.category ? String(existing.data.category.id) : '',
      isActive: existing.data.isActive,
    })
  }, [isEdit, existing.data, reset])

  // A new product can be pre-filled from another page through the URL contract.
  useEffect(() => {
    if (isEdit) return
    if (!params.sku && !params.name) return
    reset((current) => ({
      ...current,
      ...(params.name ? { name: params.name } : {}),
      ...(params.sku ? { sku: params.sku.toUpperCase() } : {}),
    }))
  }, [isEdit, params.name, params.sku, reset])

  const onSubmit = (values: ProductFormValues): Promise<void> => {
    setStockError(null)

    if (!isEdit) {
      const parsed = initialStockSchema.safeParse(initialStock)
      if (!parsed.success) {
        setStockError(parsed.error.issues[0]?.message ?? 'Check the initial stock values')
        return Promise.resolve()
      }
    }

    if (isEdit) {
      return new Promise<void>((resolve) => {
        update.mutate(
          { id: productId, values },
          {
            onSuccess: (product) => {
              navigate(`/products/${product.id}`, { replace: true })
              resolve()
            },
            onError: () => resolve(),
          },
        )
      })
    }

    return new Promise<void>((resolve) => {
      create.mutate(
        { values, initialStock },
        {
          onSuccess: (product) => {
            navigate(`/products/${product.id}`, { replace: true })
            resolve()
          },
          onError: () => resolve(),
        },
      )
    })
  }

  const originalUom = existing.data?.uom
  const warnAboutUom = isEdit && originalUom !== undefined && uom !== originalUom && existing.data
    ? existing.data.onHand > 0 || existing.data.stockByLocation.length > 0
    : false

  if (isEdit && existing.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit product" backTo="/products" />
        <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        description={isEdit ? 'Change the catalogue details for this product.' : 'Add a product to the catalogue.'}
        backTo={isEdit ? `/products/${productId}` : '/products'}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Name, SKU and how the quantity is measured.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                autoComplete="off"
                placeholder="Steel"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  autoComplete="off"
                  placeholder="STL-KG"
                  maxLength={40}
                  aria-invalid={Boolean(errors.sku)}
                  {...register('sku')}
                  onChange={(event) =>
                    setValue('sku', event.target.value.toUpperCase(), { shouldValidate: true })
                  }
                />
                {errors.sku ? (
                  <p className="text-sm text-destructive">{errors.sku.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product-uom">Unit of measure</Label>
                <UomField
                  id="product-uom"
                  value={uom}
                  onChange={(value) => setValue('uom', value, { shouldValidate: true })}
                  invalid={Boolean(errors.uom)}
                />
                {errors.uom ? <p className="text-sm text-destructive">{errors.uom.message}</p> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-category">Category</Label>
              <Select
                value={categoryId || NONE_CATEGORY}
                onValueChange={(value) =>
                  setValue('categoryId', value === NONE_CATEGORY ? '' : value, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="product-category" className="w-full sm:w-72">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_CATEGORY}>None</SelectItem>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {warnAboutUom ? (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                Changing the unit does not convert existing quantities.
              </p>
            ) : null}

            {isEdit ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked === true)}
                />
                Active
              </label>
            ) : null}
          </CardContent>
        </Card>

        {!isEdit ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Initial stock</CardTitle>
              <CardDescription>
                Optional. It is recorded as an adjustment so it appears in the movement history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="initial-location">Location</Label>
                  <Select
                    value={initialStock.locationId}
                    onValueChange={(value) =>
                      setInitialStock((current) => ({ ...current, locationId: value }))
                    }
                  >
                    <SelectTrigger id="initial-location" className="w-full">
                      <SelectValue placeholder="No initial stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.data?.map((location) => (
                        <SelectItem key={location.id} value={String(location.id)}>
                          {location.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="initial-quantity">Quantity</Label>
                  <Input
                    id="initial-quantity"
                    inputMode="decimal"
                    placeholder="0"
                    value={initialStock.quantity}
                    onChange={(event) =>
                      setInitialStock((current) => ({ ...current, quantity: event.target.value }))
                    }
                  />
                </div>
              </div>

              {stockError ? <p className="text-sm text-destructive">{stockError}</p> : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
