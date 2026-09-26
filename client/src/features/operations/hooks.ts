import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ApiError } from '@/lib/api'
import { useQueryParams } from '@/lib/hooks'
import { invalidateStockQueries } from '@/lib/queryClient'
import { PENDING_STATUSES, STATUS_LABELS, type OperationStatus, type OperationType } from '@/lib/types'
import {
  operationsApi,
  type OperationCreateBody,
  type OperationListParams,
  type OperationUpdateBody,
} from './api'
import type { OperationFilters } from './types'
import { parseIdParam } from './utils'

export const OPERATIONS_PAGE_SIZE = 20

/** What the dashboard links with: `?status=DRAFT,WAITING,READY`. */
export const PENDING_STATUS_PARAM = PENDING_STATUSES.join(',')

const ALL_STATUSES = Object.keys(STATUS_LABELS) as OperationStatus[]

export type StatusTab = 'ALL' | 'PENDING' | OperationStatus

export const STATUS_TABS: { value: StatusTab; label: string; param: string | null }[] = [
  { value: 'ALL', label: 'All', param: null },
  { value: 'PENDING', label: 'Pending', param: PENDING_STATUS_PARAM },
  { value: 'DRAFT', label: 'Draft', param: 'DRAFT' },
  { value: 'WAITING', label: 'Waiting', param: 'WAITING' },
  { value: 'READY', label: 'Ready', param: 'READY' },
  { value: 'DONE', label: 'Done', param: 'DONE' },
  { value: 'CANCELED', label: 'Canceled', param: 'CANCELED' },
]

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const operationKeys = {
  all: ['operations'] as const,
  lists: () => [...operationKeys.all, 'list'] as const,
  list: (params: OperationListParams) => [...operationKeys.lists(), params] as const,
  details: () => [...operationKeys.all, 'detail'] as const,
  detail: (id: number) => [...operationKeys.details(), id] as const,
}

// ---------------------------------------------------------------------------
// URL state (CONTRACT §6.7)
// ---------------------------------------------------------------------------

/** `status=DRAFT,WAITING,READY` → the three statuses. */
export function parseStatusParam(value: string | undefined): OperationStatus[] | undefined {
  if (!value) return undefined
  const parsed = value
    .split(',')
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is OperationStatus => ALL_STATUSES.includes(part as OperationStatus))
  const unique = Array.from(new Set(parsed))
  return unique.length > 0 ? unique : undefined
}

/** The tab that matches the `status` param; `All` also covers unknown combos. */
export function statusTabFromParam(value: string | undefined): StatusTab {
  const statuses = parseStatusParam(value)
  if (!statuses) return 'ALL'
  if (statuses.length === PENDING_STATUSES.length && PENDING_STATUSES.every((s) => statuses.includes(s))) {
    return 'PENDING'
  }
  return statuses.length === 1 ? statuses[0] : 'ALL'
}

export type OperationFilterPatch = {
  search?: string | null
  warehouseId?: number | null
}

export function useOperationFilters(): {
  filters: OperationFilters
  statusTab: StatusTab
  page: number
  hasFilters: boolean
  setStatusTab: (tab: StatusTab) => void
  setFilters: (patch: OperationFilterPatch) => void
  setPage: (page: number) => void
  clearFilters: () => void
} {
  const [params, setParams] = useQueryParams()
  const filters: OperationFilters = {
    search: params.search?.trim() || undefined,
    warehouseId: parseIdParam(params.warehouseId),
    status: parseStatusParam(params.status),
  }

  return {
    filters,
    statusTab: statusTabFromParam(params.status),
    page: parseIdParam(params.page) ?? 1,
    hasFilters: Boolean(filters.search || filters.warehouseId || filters.status),
    // Any filter change starts again from page 1.
    setStatusTab: (tab) => {
      const entry = STATUS_TABS.find((candidate) => candidate.value === tab)
      setParams({ status: entry?.param ?? null, page: null })
    },
    setFilters: (patch) => setParams({ ...patch, page: null }),
    setPage: (page) => setParams({ page: page > 1 ? page : null }),
    clearFilters: () => setParams({ search: null, warehouseId: null, status: null, page: null }),
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useOperations(type: OperationType, filters: OperationFilters, page: number) {
  const params: OperationListParams = {
    type,
    status: filters.status,
    warehouseId: filters.warehouseId,
    search: filters.search,
    page,
    pageSize: OPERATIONS_PAGE_SIZE,
  }
  return useQuery({
    queryKey: operationKeys.list(params),
    queryFn: () => operationsApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useOperation(id: number) {
  return useQuery({
    queryKey: operationKeys.detail(id),
    queryFn: () => operationsApi.get(id),
    enabled: id > 0,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function useInvalidateOperation() {
  const queryClient = useQueryClient()
  return (id: number): void => {
    void queryClient.invalidateQueries({ queryKey: operationKeys.lists() })
    void queryClient.invalidateQueries({ queryKey: operationKeys.detail(id) })
  }
}

export function useCreateOperation() {
  const invalidate = useInvalidateOperation()
  return useMutation({
    mutationFn: (body: OperationCreateBody) => operationsApi.create(body),
    onSuccess: (operation) => invalidate(operation.id),
  })
}

export function useUpdateOperation() {
  const invalidate = useInvalidateOperation()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: OperationUpdateBody }) =>
      operationsApi.update(id, body),
    onSuccess: (operation) => invalidate(operation.id),
  })
}

export function useDeleteOperation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => operationsApi.delete(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: operationKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: operationKeys.lists() })
    },
  })
}

export function useConfirmOperation() {
  const invalidate = useInvalidateOperation()
  return useMutation({
    mutationFn: (id: number) => operationsApi.confirm(id),
    onSuccess: (operation) => {
      invalidate(operation.id)
      toast.success(
        operation.status === 'WAITING'
          ? 'Confirmed. Not enough stock at the source yet, so it is waiting.'
          : 'Confirmed. Ready to validate.',
      )
    },
    onError: (error: ApiError) => toast.error(error.message),
  })
}

export function useCheckAvailability() {
  const invalidate = useInvalidateOperation()
  return useMutation({
    mutationFn: (id: number) => operationsApi.checkAvailability(id),
    onSuccess: (operation) => {
      invalidate(operation.id)
      if (operation.status === 'READY') toast.success('Stock is available. Ready to validate.')
      else toast.warning('Still short on stock at the source.')
    },
    onError: (error: ApiError) => toast.error(error.message),
  })
}

export function useValidateOperation() {
  const invalidate = useInvalidateOperation()
  return useMutation({
    mutationFn: (id: number) => operationsApi.validate(id),
    onSuccess: async (operation) => {
      invalidate(operation.id)
      toast.success('Validated. Stock updated.')
      await invalidateStockQueries()
    },
    onError: (error: ApiError, id) => {
      // 409 INSUFFICIENT_STOCK / INVALID_STATE: the server message is the explanation.
      toast.error(error.message)
      invalidate(id)
    },
  })
}

export function useCancelOperation() {
  const invalidate = useInvalidateOperation()
  return useMutation({
    mutationFn: (id: number) => operationsApi.cancel(id),
    onSuccess: (operation) => {
      invalidate(operation.id)
      toast.success('Canceled. No stock was changed.')
    },
    onError: (error: ApiError) => toast.error(error.message),
  })
}
