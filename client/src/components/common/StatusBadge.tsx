import { Badge } from '@/components/ui/badge'
import { STATUS_LABELS, type OperationStatus } from '@/lib/types'

const STATUS_STYLES: Record<OperationStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground border-transparent',
  WAITING: 'bg-amber-50 text-amber-700 border-amber-200',
  READY: 'bg-blue-50 text-blue-700 border-blue-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELED: 'bg-red-50 text-red-700 border-red-200',
}

export function StatusBadge({ status }: { status: OperationStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
