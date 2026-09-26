import { ApiError, tokenStorage, type QueryParams } from '@/lib/api'
import type { ListMeta } from '@/lib/types'

const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Is it running?'

type ListBody<T> = { data?: T[]; meta?: ListMeta; error?: { code?: string; message?: string; details?: unknown } }

function toQuery(params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

/**
 * Same contract as `api.list` (CONTRACT §6.4): resolves `{ items, meta }`.
 * Workaround: the frozen `api.list` currently returns only `body.data`, dropping `meta`.
 * Replace calls with `api.list` once the foundation fix lands.
 */
export async function listRequest<T>(path: string, params: QueryParams): Promise<{ items: T[]; meta: ListMeta }> {
  const headers = new Headers({ Accept: 'application/json' })
  const token = tokenStorage.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`/api${path}${toQuery(params)}`, { headers })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE)
  }

  let body: ListBody<T> = {}
  try {
    body = (await response.json()) as ListBody<T>
  } catch {
    body = {}
  }

  if (!response.ok) {
    if (response.status === 401) {
      tokenStorage.clear()
      window.dispatchEvent(new Event('auth:logout'))
    }
    if (!body.error) throw new ApiError(response.status, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE)
    throw new ApiError(
      response.status,
      body.error.code ?? 'UNKNOWN',
      body.error.message ?? `Request failed with status ${response.status}`,
      body.error.details,
    )
  }

  const items = body.data ?? []
  const meta = body.meta ?? { total: items.length, page: 1, pageSize: items.length }
  return { items, meta }
}
