import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // 4xx answers will not change on a retry — only retry once for anything else.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
    },
  },
})

export const STOCK_QUERY_PREFIXES = [
  'products',
  'operations',
  'dashboard',
  'moves',
  'alerts',
  'lookups',
  'search',
] as const

/** Call after any mutation that changed stock quantities. */
export async function invalidateStockQueries(): Promise<void> {
  await Promise.all(
    STOCK_QUERY_PREFIXES.map((prefix) => queryClient.invalidateQueries({ queryKey: [prefix] })),
  )
}
