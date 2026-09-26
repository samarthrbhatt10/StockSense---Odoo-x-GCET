import { useState } from 'react'
import { EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useAuth } from '@/app/AuthProvider'
import { useQueryParams } from '@/lib/hooks'
import { useLookupLocations, useLookupWarehouses } from '@/lib/lookups'
import { formatQty } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
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
import {
  ConfirmDialog,
  DataTable,
  ErrorState,
  PageHeader,
  Pagination,
  type Column,
} from '@/components/common'
import { LocationDialog } from '../components/LocationDialog'
import { useDeleteLocation, useLocations, useToggleLocation } from '../hooks'
import { useSearchFilter } from '../useSearchFilter'
import { SYSTEM_LOCATION_PURPOSE, type LocationListItem } from '../types'

const ALL_WAREHOUSES = 'all'

export default function LocationsPage() {
  const { isManager } = useAuth()
  const [params, setParams] = useQueryParams()
  const search = useSearchFilter()

  const page = Number(params.page ?? '1') || 1
  const warehouseParam = params.warehouseId
  const warehouseId = warehouseParam ? Number(warehouseParam) || undefined : undefined
  const includeInactive = params.includeInactive === 'true'

  const warehouses = useLookupWarehouses()
  const systemLocations = useLookupLocations()

  const { data, isPending, isError, error, refetch } = useLocations({
    page,
    search: search.value || undefined,
    warehouseId,
    includeInactive,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LocationListItem | undefined>(undefined)
  const [deleting, setDeleting] = useState<LocationListItem | undefined>(undefined)
  const remove = useDeleteLocation()
  const toggle = useToggleLocation()

  const openCreate = (): void => {
    setEditing(undefined)
    setDialogOpen(true)
  }

  const openEdit = (location: LocationListItem): void => {
    setEditing(location)
    setDialogOpen(true)
  }

  const columns: Column<LocationListItem>[] = [
    {
      key: 'fullName',
      header: 'Location',
      cell: (row) => <span className="font-medium text-foreground">{row.fullName}</span>,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (row) => row.warehouse?.name ?? '—',
    },
    {
      key: 'onHand',
      header: 'On hand',
      align: 'right',
      cell: (row) => formatQty(row.onHand),
    },
    {
      key: 'productCount',
      header: 'Products',
      align: 'right',
      cell: (row) => String(row.productCount),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) =>
        row.isActive ? (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Inactive
          </Badge>
        ),
    },
    ...(isManager
      ? [
          {
            key: 'actions',
            header: 'Actions',
            align: 'right' as const,
            cell: (row: LocationListItem) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(row)}
                  aria-label={`Edit ${row.fullName}`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: row.id, isActive: !row.isActive })}
                  aria-label={row.isActive ? `Deactivate ${row.fullName}` : `Activate ${row.fullName}`}
                >
                  {row.isActive ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(row)}
                  aria-label={`Delete ${row.fullName}`}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2Icon />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Where stock physically sits inside each warehouse."
        actions={
          isManager ? (
            <Button onClick={openCreate}>
              <PlusIcon />
              New location
            </Button>
          ) : null
        }
      />

      {!isManager ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          View only: ask a manager to change settings.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="warehouse-filter">Warehouse</Label>
          <Select
            value={warehouseId ? String(warehouseId) : ALL_WAREHOUSES}
            onValueChange={(value) =>
              setParams({ warehouseId: value === ALL_WAREHOUSES ? null : value, page: null })
            }
          >
            <SelectTrigger id="warehouse-filter" className="w-full sm:w-56">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_WAREHOUSES}>All warehouses</SelectItem>
              {warehouses.data?.map((warehouse) => (
                <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                  {warehouse.code} — {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="location-search">Search</Label>
          <Input
            id="location-search"
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            placeholder="Search by name"
          />
        </div>

        <label className="flex h-8 items-center gap-2 text-sm">
          <Checkbox
            checked={includeInactive}
            onCheckedChange={(checked) =>
              setParams({ includeInactive: checked === true ? 'true' : null, page: null })
            }
          />
          Show inactive
        </label>
      </div>

      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}

      {!isError ? (
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(row) => row.id}
          isLoading={isPending}
          emptyMessage="No locations match these filters."
        />
      ) : null}

      {data ? (
        <Pagination
          page={data.meta.page}
          pageSize={data.meta.pageSize}
          total={data.meta.total}
          onPageChange={(next) => setParams({ page: next })}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System locations</CardTitle>
          <CardDescription>
            These three are created once and can&apos;t be edited or deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {(systemLocations.data ?? [])
              .filter((location) => location.type !== 'INTERNAL')
              .map((location) => (
                <li key={location.id} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{location.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {SYSTEM_LOCATION_PURPOSE[location.type]}
                  </span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultWarehouseId={warehouseId}
        location={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined)
        }}
        title={`Delete ${deleting?.fullName ?? 'location'}?`}
        description="Only empty locations without history can be deleted."
        confirmLabel="Delete location"
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
