import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useQueryParams } from '@/lib/hooks'
import { OPERATION_LABELS, type ListMeta, type OperationType } from '@/lib/types'
import { listRequest } from './listRequest'
import type { MoveFilters, MoveRow } from './types'

export const MOVES_PAGE_SIZE = 20
export const OPERATION_TYPES = Object.keys(OPERATION_LABELS) as OperationType[]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseId(value: string | undefined): number | undefined {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

function parseDate(value: string | undefined): string | undefined {
  return value && DATE_PATTERN.test(value) ? value : undefined
}

export type FilterPatch = Record<string, string | number | null | undefined>

/** Move-history filters and page, synced with the URL (CONTRACT §6.7). */
export function useMoveFilters(): {
  filters: MoveFilters
  page: number
  hasFilters: boolean
  setFilters: (patch: FilterPatch) => void
  setPage: (page: number) => void
  clearFilters: () => void
} {
  const [params, setParams] = useQueryParams()
  const filters: MoveFilters = {
    search: params.search?.trim() || undefined,
    productId: parseId(params.productId),
    locationId: parseId(params.locationId),
    warehouseId: parseId(params.warehouseId),
    type: OPERATION_TYPES.find((type) => type === params.type),
    dateFrom: parseDate(params.dateFrom),
    dateTo: parseDate(params.dateTo),
  }
  return {
    filters,
    page: parseId(params.page) ?? 1,
    hasFilters: Object.values(filters).some((value) => value !== undefined),
    // Any filter change starts again from page 1.
    setFilters: (patch) => setParams({ ...patch, page: null }),
    setPage: (page) => setParams({ page: page > 1 ? page : null }),
    clearFilters: () =>
      setParams({
        search: null,
        productId: null,
        locationId: null,
        warehouseId: null,
        type: null,
        dateFrom: null,
        dateTo: null,
        page: null,
      }),
  }
}

export function useMoves(
  filters: MoveFilters,
  page: number,
): UseQueryResult<{ items: MoveRow[]; meta: ListMeta }> {
  const params = { ...filters, page, pageSize: MOVES_PAGE_SIZE }
  return useQuery({
    queryKey: ['moves', 'list', params],
    queryFn: () => listRequest<MoveRow>('/moves', params),
    placeholderData: keepPreviousData,
  })
}
