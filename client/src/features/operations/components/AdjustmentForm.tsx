import { PageHeader } from '@/components/common'

interface AdjustmentFormProps {
  kind: string
  id?: string
}

/** Placeholder: the counted-quantity form arrives with the adjustments task. */
export function AdjustmentForm({ kind, id }: AdjustmentFormProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={id ? 'Edit Inventory Adjustment' : 'New Inventory Adjustment'}
        description="Adjustments coming next"
        backTo={`/operations/${kind}`}
      />
    </div>
  )
}
