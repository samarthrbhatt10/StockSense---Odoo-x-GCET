import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryParams } from '@/lib/hooks'

const DEBOUNCE_MS = 350

/**
 * A search box whose value lives in the URL.
 *
 * The write is debounced inside the change handler on purpose. Doing it in an
 * effect keyed on the debounced value would re-run on every render, because
 * `useQueryParams` hands back a new function identity each time, and that turns
 * into an infinite update loop.
 */
export function useSearchFilter(): { value: string; onChange: (value: string) => void } {
  const [params, setParams] = useQueryParams()
  const fromUrl = params.search ?? ''
  const [value, setValue] = useState(fromUrl)
  const timer = useRef<number | undefined>(undefined)

  // Adopt the URL when it changes from somewhere else, e.g. the back button.
  useEffect(() => {
    setValue((current) => (current === fromUrl ? current : fromUrl))
  }, [fromUrl])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onChange = useCallback(
    (next: string) => {
      setValue(next)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setParams({ search: next || null, page: null })
      }, DEBOUNCE_MS)
    },
    [setParams],
  )

  return { value, onChange }
}
