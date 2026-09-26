import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from './api'
import type { LookupCategory, LookupLocation, LookupProduct, LookupStock, LookupWarehouse, LocationType } from './types'

export function useLookupProducts(params?: { search?: string }): UseQueryResult<LookupProduct[]> {
  return useQuery({
    queryKey: ['lookups', 'products', params ?? {}],
    queryFn: () => api.get<LookupProduct[]>('/lookups/products', { search: params?.search }),
  })
}

export function useLookupLocations(params?: {
  type?: LocationType
  warehouseId?: number
}): UseQueryResult<LookupLocation[]> {
  return useQuery({
    queryKey: ['lookups', 'locations', params ?? {}],
    queryFn: () =>
      api.get<LookupLocation[]>('/lookups/locations', {
        type: params?.type,
        warehouseId: params?.warehouseId,
      }),
  })
}

export function useLookupWarehouses(): UseQueryResult<LookupWarehouse[]> {
  return useQuery({
    queryKey: ['lookups', 'warehouses'],
    queryFn: () => api.get<LookupWarehouse[]>('/lookups/warehouses'),
  })
}

export function useLookupCategories(): UseQueryResult<LookupCategory[]> {
  return useQuery({
    queryKey: ['lookups', 'categories'],
    queryFn: () => api.get<LookupCategory[]>('/lookups/categories'),
  })
}

export function useLookupStock(
  params: { productId?: number; locationId?: number; warehouseId?: number },
  options?: { enabled?: boolean },
): UseQueryResult<LookupStock[]> {
  return useQuery({
    queryKey: ['lookups', 'stock', params],
    queryFn: () => api.get<LookupStock[]>('/lookups/stock', { ...params }),
    enabled: options?.enabled ?? true,
  })
}
