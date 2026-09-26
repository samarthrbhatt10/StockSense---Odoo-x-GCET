import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { LowStockResult } from './types'

export function useLowStock(
  scope: { warehouseId?: number },
  options?: { refetchInterval?: number },
): UseQueryResult<LowStockResult> {
  return useQuery({
    queryKey: ['alerts', 'low-stock', scope],
    queryFn: () => api.get<LowStockResult>('/alerts/low-stock', { ...scope }),
    refetchInterval: options?.refetchInterval,
    placeholderData: keepPreviousData,
  })
}
