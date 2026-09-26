import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidateStockQueries } from '@/lib/queryClient'
import type { ApiError } from '@/lib/api'
import { operationsApi, type CreateOperationBody, type ListOperationsParams } from './api'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const operationKeys = {
  all: ['operations'] as const,
  lists: () => [...operationKeys.all, 'list'] as const,
  list: (params: ListOperationsParams) => [...operationKeys.lists(), params] as const,
  details: () => [...operationKeys.all, 'detail'] as const,
  detail: (id: number) => [...operationKeys.details(), id] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useOperations(params: ListOperationsParams) {
  return useQuery({
    queryKey: operationKeys.list(params),
    queryFn: () => operationsApi.list(params),
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

export function useCreateOperation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOperationBody) => operationsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
    },
  })
}

export function useUpdateOperation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<CreateOperationBody, 'type'> & { type?: string }) =>
      operationsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
    },
  })
}

export function useDeleteOperation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => operationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
    },
  })
}

export function useConfirmOperation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => operationsApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
    },
    onError: (err: ApiError) => {
      toast.error(err.message)
    },
  })
}

export function useCheckAvailability(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => operationsApi.checkAvailability(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
    },
    onError: (err: ApiError) => {
      toast.error(err.message)
    },
  })
}

export function useValidateOperation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => operationsApi.validate(id),
    onSuccess: async () => {
      toast.success('Validated. Stock updated.')
      await invalidateStockQueries()
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
    },
    onError: (err: ApiError) => {
      toast.error(err.message)
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
    },
  })
}

export function useCancelOperation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => operationsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: operationKeys.detail(id) })
      qc.invalidateQueries({ queryKey: operationKeys.lists() })
    },
    onError: (err: ApiError) => {
      toast.error(err.message)
    },
  })
}
