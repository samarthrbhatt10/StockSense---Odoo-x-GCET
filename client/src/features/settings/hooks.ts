import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import type { ListMeta, LocationType } from '@/lib/types'
import type {
  EditLocationFormValues,
  LocationFormValues,
  WarehouseFormValues,
} from './schemas'
import type { LocationListItem, WarehouseDetail, WarehouseListItem } from './types'

const NETWORK_FALLBACK = 'Cannot reach the server. Is it running?'

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return NETWORK_FALLBACK
}

/**
 * Warehouses and locations change what every location dropdown shows, so the
 * shared lookups are refreshed alongside this module's own keys.
 */
async function invalidateSettings(): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
    queryClient.invalidateQueries({ queryKey: ['locations'] }),
    queryClient.invalidateQueries({ queryKey: ['lookups'] }),
  ])
}

export type WarehouseListFilters = { page?: number; search?: string }

export function useWarehouses(
  filters: WarehouseListFilters,
): UseQueryResult<{ items: WarehouseListItem[]; meta: ListMeta }> {
  return useQuery({
    queryKey: ['warehouses', 'list', filters],
    queryFn: () =>
      api.list<WarehouseListItem>('/warehouses', {
        page: filters.page,
        search: filters.search,
      }),
  })
}

export function useWarehouse(id: number | undefined): UseQueryResult<WarehouseDetail> {
  return useQuery({
    queryKey: ['warehouses', 'detail', id],
    queryFn: () => api.get<WarehouseDetail>(`/warehouses/${id}`),
    enabled: id !== undefined,
  })
}

export type LocationListFilters = {
  page?: number
  search?: string
  warehouseId?: number
  type?: LocationType
  includeInactive?: boolean
}

export function useLocations(
  filters: LocationListFilters,
): UseQueryResult<{ items: LocationListItem[]; meta: ListMeta }> {
  return useQuery({
    queryKey: ['locations', 'list', filters],
    queryFn: () =>
      api.list<LocationListItem>('/locations', {
        page: filters.page,
        search: filters.search,
        warehouseId: filters.warehouseId,
        type: filters.type,
        includeInactive: filters.includeInactive,
      }),
  })
}

function useSettingsMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
) {
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await invalidateSettings()
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(messageOf(error))
    },
  })
}

export function useCreateWarehouse() {
  return useSettingsMutation(
    (values: WarehouseFormValues) =>
      api.post<WarehouseDetail>('/warehouses', {
        name: values.name,
        code: values.code,
        address: values.address || undefined,
      }),
    'Warehouse created.',
  )
}

export function useUpdateWarehouse() {
  return useSettingsMutation(
    (variables: { id: number; values: WarehouseFormValues }) =>
      api.put<WarehouseDetail>(`/warehouses/${variables.id}`, {
        name: variables.values.name,
        address: variables.values.address || undefined,
      }),
    'Warehouse updated.',
  )
}

export function useDeleteWarehouse() {
  return useSettingsMutation((id: number) => api.delete(`/warehouses/${id}`), 'Warehouse deleted.')
}

export function useCreateLocation() {
  return useSettingsMutation(
    (values: LocationFormValues) =>
      api.post<LocationListItem>('/locations', {
        name: values.name,
        warehouseId: Number(values.warehouseId),
      }),
    'Location created.',
  )
}

export function useUpdateLocation() {
  return useSettingsMutation(
    (variables: { id: number; values: EditLocationFormValues }) =>
      api.put<LocationListItem>(`/locations/${variables.id}`, {
        name: variables.values.name,
        isActive: variables.values.isActive,
      }),
    'Location updated.',
  )
}

/** Flips a location between active and inactive without opening the edit dialog. */
export function useToggleLocation() {
  return useSettingsMutation(
    (variables: { id: number; isActive: boolean }) =>
      api.put<LocationListItem>(`/locations/${variables.id}`, { isActive: variables.isActive }),
    'Location updated.',
  )
}

export function useDeleteLocation() {
  return useSettingsMutation((id: number) => api.delete(`/locations/${id}`), 'Location deleted.')
}
