import { useState } from 'react'
import { Link } from 'react-router'
import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon, WarehouseIcon } from 'lucide-react'
import { useAuth } from '@/app/AuthProvider'
import { useQueryParams } from '@/lib/hooks'
import { formatQty } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination } from '@/components/common'
import { WarehouseDialog } from '../components/WarehouseDialog'
import { useDeleteWarehouse, useWarehouses } from '../hooks'
import { useSearchFilter } from '../useSearchFilter'
import type { WarehouseListItem } from '../types'

export default function WarehousesPage() {
  const { isManager } = useAuth()
  const [params, setParams] = useQueryParams()
  const search = useSearchFilter()

  const page = Number(params.page ?? '1') || 1

  const { data, isPending, isError, error, refetch } = useWarehouses({
    page,
    search: search.value || undefined,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WarehouseListItem | undefined>(undefined)
  const [deleting, setDeleting] = useState<WarehouseListItem | undefined>(undefined)
  const remove = useDeleteWarehouse()

  const openCreate = (): void => {
    setEditing(undefined)
    setDialogOpen(true)
  }

  const openEdit = (warehouse: WarehouseListItem): void => {
    setEditing(warehouse)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Every warehouse holds stock in its own internal locations."
        actions={
          isManager ? (
            <Button onClick={openCreate}>
              <PlusIcon />
              New warehouse
            </Button>
          ) : null
        }
      />

      {!isManager ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only: ask a manager to change settings.
        </p>
      ) : null}

      <div className="max-w-sm">
        <Input
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          placeholder="Search by name or code"
          aria-label="Search warehouses"
        />
      </div>

      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!isPending && !isError && (data?.items.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-border">
          <EmptyState
            title="No warehouses yet"
            description="Create a warehouse to start receiving stock."
            action={
              isManager ? (
                <Button onClick={openCreate}>
                  <PlusIcon />
                  New warehouse
                </Button>
              ) : null
            }
          />
        </div>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((warehouse) => (
              <Card key={warehouse.id} className="flex min-w-0 flex-col">
                <CardHeader>
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                      <WarehouseIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{warehouse.name}</span>
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-primary">
                      {warehouse.code}
                    </Badge>
                  </div>
                  <CardDescription className="truncate">
                    {warehouse.address || 'No address'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs tracking-wide text-muted-foreground uppercase">Locations</dt>
                      <dd className="font-medium text-foreground">{warehouse.locationCount}</dd>
                    </div>
                    <div>
                      <dt className="text-xs tracking-wide text-muted-foreground uppercase">On hand</dt>
                      <dd className="font-medium text-foreground">{formatQty(warehouse.onHand)}</dd>
                    </div>
                  </dl>
                </CardContent>

                <CardFooter className="flex-wrap justify-between gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/settings/locations?warehouseId=${warehouse.id}`}>
                      <MapPinIcon />
                      View locations
                    </Link>
                  </Button>
                  {isManager ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(warehouse)}
                        aria-label={`Edit ${warehouse.name}`}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(warehouse)}
                        aria-label={`Delete ${warehouse.name}`}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  ) : null}
                </CardFooter>
              </Card>
            ))}
          </div>

          <Pagination
            page={data.meta.page}
            pageSize={data.meta.pageSize}
            total={data.meta.total}
            onPageChange={(next) => setParams({ page: next })}
          />
        </>
      ) : null}

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        warehouse={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined)
        }}
        title={`Delete ${deleting?.name ?? 'warehouse'}?`}
        description="Its internal locations are deleted too. This cannot be undone."
        confirmLabel="Delete warehouse"
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
