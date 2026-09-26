import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ListMeta, OperationStatus, OperationType } from '@/lib/types'
import { OPERATION_LABELS, PENDING_STATUSES, STATUS_LABELS } from '@/lib/types'
import { useQueryParams } from '@/lib/hooks'
import { listRequest } from './listRequest'
import type { DashboardFilters, DashboardOperation, DashboardScope, DashboardSummary } from './types'

const SUMMARY_REFETCH_MS = 30_000

export const OPERATIONS_PAGE_SIZE = 10
export const PENDING_STATUS_PARAM = PENDING_STATUSES.join(',')
export const OPERATION_TYPES = Object.keys(OPERATION_LABELS) as OperationType[]
export const OPERATION_STATUSES = Object.keys(STATUS_LABELS) as OperationStatus[]

function parseId(value: string | undefined): number | undefined {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

function parseType(value: string | undefined): OperationType | undefined {
  return OPERATION_TYPES.find((type) => type === value)
}

function parseStatus(value: string | undefined): string | undefined {
  if (!value) return undefined
  const valid = value
    .split(',')
    .filter((part): part is OperationStatus => OPERATION_STATUSES.includes(part as OperationStatus))
  return valid.length > 0 ? valid.join(',') : undefined
}

/** Dashboard filters live in the URL (CONTRACT §6.7: type, status, warehouseId, categoryId). */
export function useDashboardFilters(): {
  filters: DashboardFilters
  scope: DashboardScope
  hasFilters: boolean
  setFilters: (patch: Record<string, string | number | null | undefined>) => void
  clearFilters: () => void
} {
  const [params, setParams] = useQueryParams()
  const filters: DashboardFilters = {
    type: parseType(params.type),
    status: parseStatus(params.status),
    warehouseId: parseId(params.warehouseId),
    categoryId: parseId(params.categoryId),
  }
  return {
    filters,
    scope: { warehouseId: filters.warehouseId, categoryId: filters.categoryId },
    hasFilters: Object.values(filters).some((value) => value !== undefined),
    setFilters: setParams,
    clearFilters: () => setParams({ type: null, status: null, warehouseId: null, categoryId: null }),
  }
}

export function useDashboardSummary(scope: DashboardScope): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: ['dashboard', 'summary', scope],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary', { ...scope }),
    refetchInterval: SUMMARY_REFETCH_MS,
    placeholderData: keepPreviousData,
  })
}

export function useDashboardOperations(
  filters: DashboardFilters,
  page: number,
): UseQueryResult<{ items: DashboardOperation[]; meta: ListMeta }> {
  const params = { ...filters, page, pageSize: OPERATIONS_PAGE_SIZE }
  return useQuery({
    queryKey: ['dashboard', 'operations', params],
    queryFn: () => listRequest<DashboardOperation>('/dashboard/operations', params),
    placeholderData: keepPreviousData,
  })
}
