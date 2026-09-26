import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UOM_PRESETS } from '../types'

const OTHER = 'other'

type UomFieldProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  invalid?: boolean
}

/** A unit-of-measure picker; picking "Other…" swaps to a free-text field. */
export function UomField({ value, onChange, id, invalid }: UomFieldProps) {
  const isPreset = (UOM_PRESETS as readonly string[]).includes(value)

  return (
    <div className="space-y-2">
      <Select
        value={isPreset ? value : OTHER}
        onValueChange={(next) => onChange(next === OTHER ? '' : next)}
      >
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
          <SelectValue placeholder="Select a unit" />
        </SelectTrigger>
        <SelectContent>
          {UOM_PRESETS.map((unit) => (
            <SelectItem key={unit} value={unit}>
              {unit}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Other…</SelectItem>
        </SelectContent>
      </Select>

      {!isPreset ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Custom unit"
          maxLength={20}
          aria-label="Custom unit of measure"
        />
      ) : null}
    </div>
  )
}
