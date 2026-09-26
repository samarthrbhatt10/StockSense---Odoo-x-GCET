import { CheckIcon, XIcon } from 'lucide-react'
import { STATUS_LABELS, type OperationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatusStepperProps {
  status: OperationStatus
}

type Step = { key: OperationStatus; label: string; tone: 'default' | 'amber' }

const BASE_STEPS: Step[] = [
  { key: 'DRAFT', label: STATUS_LABELS.DRAFT, tone: 'default' },
  { key: 'READY', label: STATUS_LABELS.READY, tone: 'default' },
  { key: 'DONE', label: STATUS_LABELS.DONE, tone: 'default' },
]

/**
 * Draft → Ready → Done, with "Waiting for stock" between Draft and Ready when
 * the operation is waiting, and Canceled as a red terminal state (CONTRACT §4).
 */
export function StatusStepper({ status }: StatusStepperProps) {
  const canceled = status === 'CANCELED'
  const steps: Step[] =
    status === 'WAITING'
      ? [BASE_STEPS[0], { key: 'WAITING', label: 'Waiting for stock', tone: 'amber' }, ...BASE_STEPS.slice(1)]
      : BASE_STEPS
  const currentIndex = canceled ? -1 : steps.findIndex((step) => step.key === status)

  const nodes: { key: string; label: string; state: 'done' | 'current' | 'todo' | 'canceled'; tone: 'default' | 'amber' }[] =
    steps.map((step, index) => ({
      key: step.key,
      label: step.label,
      state:
        canceled || index > currentIndex ? 'todo' : index === currentIndex ? 'current' : 'done',
      tone: step.tone,
    }))
  nodes.push({ key: 'CANCELED', label: STATUS_LABELS.CANCELED, state: 'canceled', tone: 'default' })

  return (
    <ol className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 py-1">
      {nodes.map((node, index) => (
        <li key={node.key} className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
              node.state === 'done' && 'border-primary bg-primary text-primary-foreground',
              node.state === 'current' &&
                (node.tone === 'amber'
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-primary bg-background text-primary'),
              node.state === 'todo' && 'border-border bg-muted text-muted-foreground',
              node.state === 'canceled' && 'border-red-200 bg-red-50 text-red-700',
            )}
          >
            {node.state === 'done' ? (
              <CheckIcon className="size-3.5" />
            ) : node.state === 'canceled' ? (
              <XIcon className="size-3.5" />
            ) : (
              node.state === 'current' ? '•' : '·'
            )}
          </span>
          <span
            className={cn(
              'text-sm whitespace-nowrap',
              node.state === 'todo' ? 'text-muted-foreground' : 'text-foreground',
              node.state === 'canceled' && 'font-medium text-red-700',
              node.state === 'current' && node.tone === 'amber' && 'font-medium text-amber-700',
            )}
          >
            {node.label}
          </span>
          {index < nodes.length - 1 ? (
            <span aria-hidden className="mx-1 h-px w-6 shrink-0 bg-border sm:w-10" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
