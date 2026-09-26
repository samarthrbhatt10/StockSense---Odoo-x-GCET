import { useLookupLocations } from '@/lib/lookups'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LocationSelectProps {
  value: number | null
  onChange: (id: number | null) => void
  /** Location that cannot be chosen (a transfer's destination cannot be its source). */
  excludeId?: number
  placeholder?: string
  invalid?: boolean
  id?: string
  disabled?: boolean
}

export function LocationSelect({
  value,
  onChange,
  excludeId,
  placeholder = 'Select a location',
  invalid = false,
  id,
  disabled = false,
}: LocationSelectProps) {
  const { data: locations = [], isPending } = useLookupLocations({ type: 'INTERNAL' })
  const options = excludeId ? locations.filter((location) => location.id !== excludeId) : locations

  // Grouped by warehouse code so a long location list stays readable.
  const groups = new Map<string, typeof options>()
  for (const location of options) {
    const key = location.warehouseCode ?? 'Other'
    const group = groups.get(key)
    if (group) group.push(location)
    else groups.set(key, [location])
  }

  return (
    <Select
      value={value === null ? '' : String(value)}
      // An empty value is not a user choice here (the location is always required), and
      // Radix emits it while the option list is still loading — that would wipe the value.
      onValueChange={(next) => {
        if (next) onChange(Number(next))
      }}
      disabled={disabled || isPending}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full bg-background">
        <SelectValue placeholder={isPending ? 'Loading locations…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.size === 0 ? (
          <SelectItem value="none" disabled>
            No locations available
          </SelectItem>
        ) : null}
        {Array.from(groups.entries()).map(([code, groupLocations]) => (
          <SelectGroup key={code}>
            <SelectLabel>{code}</SelectLabel>
            {groupLocations.map((location) => (
              <SelectItem key={location.id} value={String(location.id)}>
                {location.fullName}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
