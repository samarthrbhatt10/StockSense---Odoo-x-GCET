import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { useLookupWarehouses } from '@/lib/lookups'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateLocation, useUpdateLocation } from '../hooks'
import {
  editLocationFormSchema,
  locationFormSchema,
  type EditLocationFormValues,
  type LocationFormValues,
} from '../schemas'
import type { LocationListItem } from '../types'

type LocationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected warehouse for a new location, usually the one being filtered. */
  defaultWarehouseId?: number
  /** Present when editing; absent when creating. */
  location?: LocationListItem
}

export function LocationDialog({
  open,
  onOpenChange,
  defaultWarehouseId,
  location,
}: LocationDialogProps) {
  const isEdit = Boolean(location)
  const warehouses = useLookupWarehouses()
  const create = useCreateLocation()
  const update = useUpdateLocation()
  const isPending = create.isPending || update.isPending

  const createForm = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: { name: '', warehouseId: '' },
  })

  const editForm = useForm<EditLocationFormValues>({
    resolver: zodResolver(editLocationFormSchema),
    defaultValues: { name: '', isActive: true },
  })

  useEffect(() => {
    if (!open) return
    if (location) {
      editForm.reset({ name: location.name, isActive: location.isActive })
      return
    }
    createForm.reset({
      name: '',
      warehouseId: defaultWarehouseId ? String(defaultWarehouseId) : '',
    })
  }, [open, location, defaultWarehouseId, createForm, editForm])

  const selectedWarehouseId = createForm.watch('warehouseId')
  const newName = createForm.watch('name') ?? ''
  const selectedCode = warehouses.data?.find(
    (warehouse) => String(warehouse.id) === selectedWarehouseId,
  )?.code
  const preview = selectedCode && newName.trim() ? `${selectedCode}/${newName.trim()}` : null

  const onSubmitCreate = (values: LocationFormValues): void => {
    create.mutate(values, { onSuccess: () => onOpenChange(false) })
  }

  const onSubmitEdit = (values: EditLocationFormValues): void => {
    if (!location) return
    update.mutate({ id: location.id, values }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={isPending ? () => undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit location' : 'New location'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Renaming keeps the warehouse prefix. Deactivating hides it from new operations.'
              : 'New locations are always internal and belong to one warehouse.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="location-name">Name</Label>
              <Input
                id="location-name"
                autoComplete="off"
                aria-invalid={Boolean(editForm.formState.errors.name)}
                {...editForm.register('name')}
              />
              {editForm.formState.errors.name ? (
                <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
              ) : null}
              {location?.warehouse ? (
                <p className="text-xs text-muted-foreground">
                  Full name: {location.warehouse.code}/{editForm.watch('name') || location.name}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editForm.watch('isActive')}
                onCheckedChange={(checked) =>
                  editForm.setValue('isActive', checked === true, { shouldValidate: true })
                }
              />
              Active
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onSubmitCreate)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="location-warehouse">Warehouse</Label>
              <Select
                value={selectedWarehouseId}
                onValueChange={(value) =>
                  createForm.setValue('warehouseId', value, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="location-warehouse"
                  className="w-full"
                  aria-invalid={Boolean(createForm.formState.errors.warehouseId)}
                >
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.data?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                      {warehouse.code} — {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {createForm.formState.errors.warehouseId ? (
                <p className="text-sm text-destructive">
                  {createForm.formState.errors.warehouseId.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location-name">Name</Label>
              <Input
                id="location-name"
                autoComplete="off"
                placeholder="Rack C"
                aria-invalid={Boolean(createForm.formState.errors.name)}
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name ? (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              ) : preview ? (
                <p className="text-xs text-muted-foreground">Full name: {preview}</p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Create location
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
