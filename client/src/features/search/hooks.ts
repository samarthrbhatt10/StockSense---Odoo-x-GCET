import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SearchResults } from './types'

export const MAX_QUERY_LENGTH = 60

export function useGlobalSearch(q: string): UseQueryResult<SearchResults> {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.get<SearchResults>('/search', { q }),
    enabled: q.length >= 1,
    placeholderData: keepPreviousData,
  })
}

/** Toggles the dialog on Cmd+K (macOS) or Ctrl+K (elsewhere). */
export function isSearchShortcut(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey
}

export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
}
