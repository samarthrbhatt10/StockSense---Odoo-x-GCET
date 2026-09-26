import { PackageCheckIcon, PackageOpenIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

export interface ChecklistState {
  picked: boolean
  packed: boolean
}

interface DeliveryChecklistProps {
  value: ChecklistState
  onChange: (value: ChecklistState) => void
  disabled?: boolean
}

/**
 * Pick → Pack → Validate for deliveries in READY (CONTRACT §4). UI-only state:
 * there is no picked/packed status on the server.
 */
export function DeliveryChecklist({ value, onChange, disabled = false }: DeliveryChecklistProps) {
  const complete = value.picked && value.packed

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Packing checklist</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-6">
        <label className="flex items-center gap-2 text-sm" htmlFor="checklist-picked">
          <Checkbox
            id="checklist-picked"
            checked={value.picked}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...value, picked: checked === true })}
          />
          <PackageOpenIcon className="size-4 text-muted-foreground" />
          Items picked
        </label>
        <label className="flex items-center gap-2 text-sm" htmlFor="checklist-packed">
          <Checkbox
            id="checklist-packed"
            checked={value.packed}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...value, packed: checked === true })}
          />
          <PackageCheckIcon className="size-4 text-muted-foreground" />
          Items packed
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        {complete
          ? 'Ready to validate. Validating changes stock immediately.'
          : 'Tick both boxes to enable Validate. This is a reminder for the warehouse, not a stock change.'}
      </p>
    </div>
  )
}
