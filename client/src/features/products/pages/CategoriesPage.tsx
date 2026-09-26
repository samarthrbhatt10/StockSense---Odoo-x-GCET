import { useState } from 'react'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useAuth } from '@/app/AuthProvider'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog, EmptyState, ErrorState, PageHeader } from '@/components/common'
import { CategoryDialog } from '../components/CategoryDialog'
import { useCategories, useDeleteCategory } from '../hooks'
import type { CategoryListItem } from '../types'

export default function CategoriesPage() {
  const { isManager } = useAuth()
  const { data, isPending, isError, error, refetch } = useCategories()
  const remove = useDeleteCategory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryListItem | undefined>(undefined)
  const [deleting, setDeleting] = useState<CategoryListItem | undefined>(undefined)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Groups used to filter the catalogue."
        backTo="/products"
        actions={
          isManager ? (
            <Button
              onClick={() => {
                setEditing(undefined)
                setDialogOpen(true)
              }}
            >
              <PlusIcon />
              New category
            </Button>
          ) : null
        }
      />

      {!isManager ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only: ask a manager to change settings.
        </p>
      ) : null}

      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}

      {isPending ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Products</TableHead>
                {isManager ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="ml-auto h-4 w-8 animate-pulse rounded bg-muted" />
                  </TableCell>
                  {isManager ? <TableCell /> : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {!isPending && !isError ? (
        (data?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-border">
            <EmptyState
              title="No categories yet"
              description="Categories are optional — products can be uncategorised."
              action={
                isManager ? (
                  <Button
                    onClick={() => {
                      setEditing(undefined)
                      setDialogOpen(true)
                    }}
                  >
                    <PlusIcon />
                    New category
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  {isManager ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                    <TableCell className="text-right">{category.productCount}</TableCell>
                    {isManager ? (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditing(category)
                              setDialogOpen(true)
                            }}
                            aria-label={`Edit ${category.name}`}
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleting(category)}
                            aria-label={`Delete ${category.name}`}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : null}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined)
        }}
        title={`Delete ${deleting?.name ?? 'category'}?`}
        description="Products in this category will become uncategorised. This cannot be undone."
        confirmLabel="Delete category"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return
          remove.mutate(deleting.id, {
            onSuccess: () => setDeleting(undefined),
          })
        }}
      />
    </div>
  )
}
