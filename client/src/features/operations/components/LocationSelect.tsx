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
  excludeId?: number
  placeholder?: string
  disabled?: boolean
}

export function LocationSelect({
  value,
  onChange,
  excludeId,
  placeholder = 'Select location…',
  disabled = false,
}: LocationSelectProps) {
  const { data: locations = [], isLoading } = useLookupLocations({ type: 'INTERNAL' })

  const filtered = excludeId ? locations.filter((l) => l.id !== excludeId) : locations

  // Group by warehouse
  const groups = new Map<string, typeof locations>()
  for (const loc of filtered) {
    const key = loc.warehouseCode ?? 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(loc)
  }

  return (
    <Select
      value={value ? String(value) : ''}
      onValueChange={(v) => onChange(v ? Number(v) : null)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Array.from(groups.entries()).map(([code, locs]) => (
          <SelectGroup key={code}>
            <SelectLabel>{code}</SelectLabel>
            {locs.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.fullName}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
