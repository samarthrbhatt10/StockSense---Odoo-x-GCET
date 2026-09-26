import type { ListMeta } from './types'

const TOKEN_KEY = 'stocksense_token'
const API_BASE = '/api'
const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Is it running?'

/** Paths that must not trigger the global "log the user out" behaviour. */
const AUTH_WHITELIST = ['/auth/login', '/auth/signup']

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number>
>

export const tokenStorage = {
  get(): string | null {
    try {
      return window.localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable (private mode) — the session stays in memory only */
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* ignore */
    }
  },
}

function buildQuery(params?: QueryParams): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      search.append(key, value.join(','))
      continue
    }
    search.append(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildUrl(path: string, params?: QueryParams): string {
  const normalised = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalised}${buildQuery(params)}`
}

function buildHeaders(hasBody: boolean): Headers {
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  if (hasBody) headers.set('Content-Type', 'application/json')
  const token = tokenStorage.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return headers
}

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } }

async function parseError(response: Response, path: string): Promise<ApiError> {
  let body: ErrorBody = {}
  try {
    body = (await response.json()) as ErrorBody
  } catch {
    body = {}
  }
  const error = body.error
    ? new ApiError(
        response.status,
        body.error.code ?? 'UNKNOWN',
        body.error.message ?? `Request failed with status ${response.status}`,
        body.error.details,
      )
    : // No `{ error: … }` envelope: the dev proxy answered with its own error
      // page, which means the API is not reachable.
      new ApiError(response.status, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE)
  if (response.status === 401 && !AUTH_WHITELIST.some((allowed) => path.startsWith(allowed))) {
    tokenStorage.clear()
    window.dispatchEvent(new Event('auth:logout'))
  }
  return error
}

/** Performs the request and turns any non-2xx or transport failure into an ApiError. */
async function send(method: string, path: string, body?: unknown, params?: QueryParams): Promise<Response> {
  const hasBody = body !== undefined
  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: buildHeaders(hasBody),
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) throw await parseError(response, path)
  return response
}

async function readJson(response: Response): Promise<{ data?: unknown; meta?: ListMeta }> {
  try {
    return (await response.json()) as { data?: unknown; meta?: ListMeta }
  } catch {
    return {}
  }
}

async function request<T>(method: string, path: string, body?: unknown, params?: QueryParams): Promise<T> {
  const response = await send(method, path, body, params)
  if (response.status === 204) return null as T
  const payload = await readJson(response)
  return payload.data as T
}

/**
 * Lists answer `{ data: items, meta }`, so `meta` sits beside `data` rather than
 * inside it. Without this the pagination meta would be thrown away.
 */
async function requestList<T>(
  path: string,
  params?: QueryParams,
): Promise<{ items: T[]; meta: ListMeta }> {
  const payload = await readJson(await send('GET', path, undefined, params))
  const items = Array.isArray(payload.data) ? (payload.data as T[]) : []
  const meta: ListMeta = payload.meta ?? {
    total: items.length,
    page: 1,
    pageSize: items.length,
  }
  return { items, meta }
}

export const api = {
  get<T>(path: string, params?: QueryParams): Promise<T> {
    return request<T>('GET', path, undefined, params)
  },
  list<T>(path: string, params?: QueryParams): Promise<{ items: T[]; meta: ListMeta }> {
    return requestList<T>(path, params)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body)
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, body)
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body)
  },
  delete<T = null>(path: string): Promise<T> {
    return request<T>('DELETE', path)
  },
}
