import type { LocationType } from '@/lib/types'

export type WarehouseListItem = {
  id: number
  name: string
  code: string
  address: string | null
  locationCount: number
  onHand: number
}

export type WarehouseLocation = {
  id: number
  name: string
  fullName: string
  isActive: boolean
  onHand: number
}

export type WarehouseDetail = {
  id: number
  name: string
  code: string
  address: string | null
  locations: WarehouseLocation[]
}

export type LocationListItem = {
  id: number
  name: string
  fullName: string
  type: LocationType
  isActive: boolean
  warehouse: { id: number; code: string; name: string } | null
  onHand: number
  productCount: number
}

/** Why the three virtual locations exist, shown read-only on the locations page. */
export const SYSTEM_LOCATION_PURPOSE: Record<string, string> = {
  VENDOR: 'Where goods arrive from. Used as the source of every receipt.',
  CUSTOMER: 'Where goods are shipped to. Used as the destination of every delivery.',
  ADJUSTMENT: 'The counterparty when a stock adjustment corrects a counted quantity.',
}
