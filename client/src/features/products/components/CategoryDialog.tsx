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
import { useCreateCategory, useUpdateCategory } from '../hooks'
import { categoryFormSchema, type CategoryFormValues } from '../schemas'
import type { CategoryListItem } from '../types'

type CategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing; absent when creating. */
  category?: CategoryListItem
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const isEdit = Boolean(category)
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const isPending = create.isPending || update.isPending

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({ name: category?.name ?? '' })
  }, [open, category, reset])

  const onSubmit = (values: CategoryFormValues): void => {
    const done = () => onOpenChange(false)
    if (category) update.mutate({ id: category.id, values }, { onSuccess: done })
    else create.mutate(values, { onSuccess: done })
  }

  return (
    <Dialog open={open} onOpenChange={isPending ? () => undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit category' : 'New category'}</DialogTitle>
          <DialogDescription>Categories group products in the catalogue and filters.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              autoComplete="off"
              placeholder="Raw Materials"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
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
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
