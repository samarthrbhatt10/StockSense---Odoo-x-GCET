import { useMutation, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { invalidateStockQueries, queryClient } from '@/lib/queryClient'
import type { ListMeta, StockStatus } from '@/lib/types'
import type {
  CategoryFormValues,
  InitialStockValues,
  ProductFormValues,
  ReorderRuleFormValues,
} from './schemas'
import type {
  CategoryListItem,
  ProductDetail,
  ProductListItem,
  ReorderRuleListItem,
} from './types'

const NETWORK_FALLBACK = 'Cannot reach the server. Is it running?'

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return NETWORK_FALLBACK
}

/** Products, categories and reorder rules, plus every dropdown that reads them. */
async function invalidateCatalogue(stockChanged = false): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['categories'] }),
    queryClient.invalidateQueries({ queryKey: ['reorder-rules'] }),
    queryClient.invalidateQueries({ queryKey: ['lookups'] }),
  ])
  if (stockChanged) await invalidateStockQueries()
}

export type ProductListFilters = {
  page?: number
  search?: string
  categoryId?: number
  warehouseId?: number
  stockStatus?: StockStatus
  includeInactive?: boolean
}

export function useProducts(
  filters: ProductListFilters,
): UseQueryResult<{ items: ProductListItem[]; meta: ListMeta }> {
  return useQuery({
    queryKey: ['products', 'list', filters],
    queryFn: () =>
      api.list<ProductListItem>('/products', {
        page: filters.page,
        search: filters.search,
        categoryId: filters.categoryId,
        warehouseId: filters.warehouseId,
        stockStatus: filters.stockStatus,
        includeInactive: filters.includeInactive,
      }),
  })
}

export function useProduct(id: number | undefined): UseQueryResult<ProductDetail> {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => api.get<ProductDetail>(`/products/${id}`),
    enabled: id !== undefined,
  })
}

/** A single fetch shared by the detail page and the reorder-rule dialog. */
export function useReorderRules(
  params: { productId?: number; warehouseId?: number } = {},
): UseQueryResult<ReorderRuleListItem[]> {
  return useQuery({
    queryKey: ['reorder-rules', params],
    queryFn: () => api.list<ReorderRuleListItem>('/reorder-rules', { ...params }),
    select: (result) => result.items,
  })
}

export function useCategories(): UseQueryResult<CategoryListItem[]> {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.list<CategoryListItem>('/categories'),
    select: (result) => result.items,
  })
}

function catalogueMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  successMessage: string,
  options?: { stockChanged?: boolean },
) {
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await invalidateCatalogue(options?.stockChanged)
      toast.success(successMessage)
    },
    onError: (error) => {
      toast.error(messageOf(error))
    },
  })
}

type CreateProductInput = {
  values: ProductFormValues
  initialStock: InitialStockValues
}

export function useCreateProduct() {
  return catalogueMutation<CreateProductInput, ProductDetail>(
    ({ values, initialStock }) => {
      const hasStock = Boolean(initialStock.locationId) && Number(initialStock.quantity) > 0
      return api.post<ProductDetail>('/products', {
        name: values.name,
        sku: values.sku,
        uom: values.uom,
        categoryId: values.categoryId ? Number(values.categoryId) : null,
        ...(hasStock
          ? {
              initialStock: {
                locationId: Number(initialStock.locationId),
                quantity: Number(initialStock.quantity),
              },
            }
          : {}),
      })
    },
    'Product created.',
    { stockChanged: true },
  )
}

export function useUpdateProduct() {
  return catalogueMutation<{ id: number; values: ProductFormValues }, ProductDetail>(
    ({ id, values }) =>
      api.put<ProductDetail>(`/products/${id}`, {
        name: values.name,
        sku: values.sku,
        uom: values.uom,
        categoryId: values.categoryId ? Number(values.categoryId) : null,
        isActive: values.isActive,
      }),
    'Product updated.',
  )
}

export function useToggleProductActive() {
  return catalogueMutation<{ id: number; isActive: boolean }, ProductDetail>(
    ({ id, isActive }) =>
      api.put<ProductDetail>(`/products/${id}`, { isActive }).then((product) => product),
    'Product updated.',
  )
}

export function useDeleteProduct() {
  return catalogueMutation<number, null>((id) => api.delete(`/products/${id}`), 'Product deleted.')
}

export function useCreateCategory() {
  return catalogueMutation<CategoryFormValues, CategoryListItem>(
    (values) => api.post<CategoryListItem>('/categories', { name: values.name }),
    'Category created.',
  )
}

export function useUpdateCategory() {
  return catalogueMutation<{ id: number; values: CategoryFormValues }, CategoryListItem>(
    ({ id, values }) => api.put<CategoryListItem>(`/categories/${id}`, { name: values.name }),
    'Category updated.',
  )
}

export function useDeleteCategory() {
  return catalogueMutation<number, null>(
    (id) => api.delete(`/categories/${id}`),
    'Category deleted.',
  )
}

export function useCreateReorderRule() {
  return catalogueMutation<{ productId: number; values: ReorderRuleFormValues }, ReorderRuleListItem>(
    ({ productId, values }) =>
      api.post<ReorderRuleListItem>('/reorder-rules', {
        productId,
        warehouseId: Number(values.warehouseId),
        minQty: Number(values.minQty),
        maxQty: Number(values.maxQty),
      }),
    'Reorder rule saved.',
    { stockChanged: true },
  )
}

export function useUpdateReorderRule() {
  return catalogueMutation<{ id: number; values: ReorderRuleFormValues }, ReorderRuleListItem>(
    ({ id, values }) =>
      api.put<ReorderRuleListItem>(`/reorder-rules/${id}`, {
        minQty: Number(values.minQty),
        maxQty: Number(values.maxQty),
      }),
    'Reorder rule updated.',
    { stockChanged: true },
  )
}

export function useDeleteReorderRule() {
  return catalogueMutation<number, null>(
    (id) => api.delete(`/reorder-rules/${id}`),
    'Reorder rule deleted.',
    { stockChanged: true },
  )
}
