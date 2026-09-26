import { api, type QueryParams } from '@/lib/api'
import type { ListMeta } from '@/lib/types'
import type { Operation, OperationSummary } from './types'

export interface ListOperationsParams extends QueryParams {
  page?: number
  pageSize?: number
  type?: string
  status?: string
  warehouseId?: number
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface CreateOperationBody {
  type: string
  sourceLocationId?: number
  destLocationId?: number
  partnerName?: string
  scheduledDate?: string
  notes?: string
  lines: Array<{
    productId: number
    quantity?: number
    countedQuantity?: number
  }>
}

export const operationsApi = {
  list(params: ListOperationsParams): Promise<{ items: OperationSummary[]; meta: ListMeta }> {
    return api.list<OperationSummary>('/operations', params)
  },

  get(id: number): Promise<Operation> {
    return api.get<Operation>(`/operations/${id}`)
  },

  create(body: CreateOperationBody): Promise<Operation> {
    return api.post<Operation>('/operations', body)
  },

  update(id: number, body: Omit<CreateOperationBody, 'type'> & { type?: string }): Promise<Operation> {
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
