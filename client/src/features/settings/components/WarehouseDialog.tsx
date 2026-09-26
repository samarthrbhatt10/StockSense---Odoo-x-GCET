import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useCreateWarehouse, useUpdateWarehouse } from '../hooks'
import { warehouseFormSchema, type WarehouseFormValues } from '../schemas'
import type { WarehouseListItem } from '../types'

type WarehouseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing; absent when creating. */
  warehouse?: WarehouseListItem
}

export function WarehouseDialog({ open, onOpenChange, warehouse }: WarehouseDialogProps) {
  const isEdit = Boolean(warehouse)
  const create = useCreateWarehouse()
  const update = useUpdateWarehouse()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: { name: '', code: '', address: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: warehouse?.name ?? '',
      code: warehouse?.code ?? '',
      address: warehouse?.address ?? '',
    })
  }, [open, warehouse, reset])

  const onSubmit = (values: WarehouseFormValues): void => {
    const done = () => onOpenChange(false)
    if (warehouse) update.mutate({ id: warehouse.id, values }, { onSuccess: done })
    else create.mutate(values, { onSuccess: done })
  }

  return (
    <Dialog open={open} onOpenChange={isPending ? () => undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit warehouse' : 'New warehouse'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Only the name and address can be changed.'
              : 'A warehouse is created with one internal location called Stock.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="warehouse-name">Name</Label>
            <Input
              id="warehouse-name"
              autoComplete="off"
              placeholder="Main Warehouse"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-code">Code</Label>
            <Input
              id="warehouse-code"
              autoComplete="off"
              placeholder="WH"
              maxLength={5}
              disabled={isEdit}
              aria-invalid={Boolean(errors.code)}
              {...register('code')}
              onChange={(event) =>
                setValue('code', event.target.value.toUpperCase(), { shouldValidate: true })
              }
            />
            {errors.code ? (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            ) : isEdit ? (
              <p className="text-xs text-muted-foreground">
                Codes can&apos;t change because document references use them.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">2 to 5 letters or digits.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warehouse-address">Address</Label>
            <Input
              id="warehouse-address"
              autoComplete="off"
              placeholder="Optional"
              aria-invalid={Boolean(errors.address)}
              {...register('address')}
            />
            {errors.address ? (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {isEdit ? 'Save changes' : 'Create warehouse'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
