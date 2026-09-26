import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  error: unknown
  onRetry?: () => void
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong. Please try again.'
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <CircleAlertIcon className="size-6 text-destructive" />
      <p className="text-sm font-medium text-destructive">{messageOf(error)}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon className="size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
