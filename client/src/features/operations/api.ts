import { api, type QueryParams } from '@/lib/api'
import type { ListMeta, OperationStatus, OperationType } from '@/lib/types'
import type { Operation, OperationSummary } from './types'

export interface OperationListParams extends QueryParams {
  page?: number
  pageSize?: number
  type?: OperationType
  status?: OperationStatus[]
  warehouseId?: number
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface OperationLineBody {
  productId: number
  quantity?: number
  countedQuantity?: number
}

export interface OperationCreateBody {
  type: OperationType
  sourceLocationId?: number
  destLocationId?: number
  partnerName?: string
  scheduledDate?: string
  notes?: string
  lines: OperationLineBody[]
}

export type OperationUpdateBody = Omit<OperationCreateBody, 'type'> & { type?: OperationType }

export const operationsApi = {
  list(params: OperationListParams): Promise<{ items: OperationSummary[]; meta: ListMeta }> {
    return api.list<OperationSummary>('/operations', params)
  },

  get(id: number): Promise<Operation> {
    return api.get<Operation>(`/operations/${id}`)
  },

  create(body: OperationCreateBody): Promise<Operation> {
    return api.post<Operation>('/operations', body)
  },

  update(id: number, body: OperationUpdateBody): Promise<Operation> {
    return api.put<Operation>(`/operations/${id}`, body)
  },

  delete(id: number): Promise<{ id: number }> {
    return api.delete<{ id: number }>(`/operations/${id}`)
  },

  confirm(id: number): Promise<Operation> {
    return api.post<Operation>(`/operations/${id}/confirm`)
  },

  checkAvailability(id: number): Promise<Operation> {
    return api.post<Operation>(`/operations/${id}/check-availability`)
  },

  validate(id: number): Promise<Operation> {
    return api.post<Operation>(`/operations/${id}/validate`)
  },

  cancel(id: number): Promise<Operation> {
    return api.post<Operation>(`/operations/${id}/cancel`)
  },
}
