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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateReorderRule, useUpdateReorderRule } from '../hooks'
import { reorderRuleFormSchema, type ReorderRuleFormValues } from '../schemas'
import type { ProductReorderRule } from '../types'

type ReorderRuleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: number
  /** Every warehouse, so the caller can drop the ones that already have a rule. */
  warehouses: { id: number; code: string; name: string }[]
  /** Present when editing; absent when creating. */
  rule?: ProductReorderRule
}

export function ReorderRuleDialog({
  open,
  onOpenChange,
  productId,
  warehouses,
  rule,
}: ReorderRuleDialogProps) {
  const isEdit = Boolean(rule)
  const create = useCreateReorderRule()
  const update = useUpdateReorderRule()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReorderRuleFormValues>({
    resolver: zodResolver(reorderRuleFormSchema),
    defaultValues: { warehouseId: '', minQty: '0', maxQty: '0' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      warehouseId: rule ? String(rule.warehouseId) : '',
      minQty: String(rule?.minQty ?? 0),
      maxQty: String(rule?.maxQty ?? 0),
    })
  }, [open, rule, reset])

  const onSubmit = (values: ReorderRuleFormValues): void => {
    const done = () => onOpenChange(false)
    if (rule) update.mutate({ id: rule.id, values }, { onSuccess: done })
    else create.mutate({ productId, values }, { onSuccess: done })
  }

  return (
    <Dialog open={open} onOpenChange={isPending ? () => undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit reorder rule' : 'Add reorder rule'}</DialogTitle>
          <DialogDescription>
            The product shows as low stock once its on hand drops below the minimum in that
            warehouse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-warehouse">Warehouse</Label>
            <Select
              value={watch('warehouseId')}
              onValueChange={(value) =>
                setValue('warehouseId', value, { shouldValidate: true })
              }
              disabled={isEdit}
            >
              <SelectTrigger
                id="rule-warehouse"
                className="w-full"
                aria-invalid={Boolean(errors.warehouseId)}
              >
                <SelectValue placeholder="Select a warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                    {warehouse.code} — {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouseId ? (
              <p className="text-sm text-destructive">{errors.warehouseId.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-min">Minimum</Label>
              <Input
                id="rule-min"
                inputMode="decimal"
                placeholder="0"
                aria-invalid={Boolean(errors.minQty)}
                {...register('minQty')}
              />
              {errors.minQty ? (
                <p className="text-sm text-destructive">{errors.minQty.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-max">Maximum</Label>
              <Input
                id="rule-max"
                inputMode="decimal"
                placeholder="0"
                aria-invalid={Boolean(errors.maxQty)}
                {...register('maxQty')}
              />
              {errors.maxQty ? (
                <p className="text-sm text-destructive">{errors.maxQty.message}</p>
              ) : null}
            </div>
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
              {isEdit ? 'Save changes' : 'Add rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
