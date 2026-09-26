import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function useQueryParams(): [
  Record<string, string>,
  (patch: Record<string, string | number | null | undefined>) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams()

  const params: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) params[key] = value

  const setParams = (patch: Record<string, string | number | null | undefined>): void => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === null || value === '') next.delete(key)
          else next.set(key, String(value))
        }
        return next
      },
      { replace: true },
    )
  }

  return [params, setParams]
}
