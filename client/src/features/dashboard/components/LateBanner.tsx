import { ChevronRightIcon, ClockAlertIcon } from 'lucide-react'

export function LateBanner({ count, onShowPending }: { count: number; onShowPending: () => void }) {
  const message =
    count === 1
      ? '1 operation is past its scheduled date'
      : `${count} operations are past their scheduled date`

  return (
    <button
      type="button"
      onClick={onShowPending}
      className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
    >
      <ClockAlertIcon className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <span className="hidden text-xs font-normal sm:inline">Show pending</span>
      <ChevronRightIcon className="size-4 shrink-0" />
    </button>
  )
}
