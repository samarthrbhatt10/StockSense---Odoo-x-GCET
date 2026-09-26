import type { LocationType, Prisma } from "@prisma/client";

export function locationFullName(loc: {
  name: string;
  type: LocationType;
  warehouse?: { code: string } | null;
}): string {
  return loc.type === "INTERNAL" && loc.warehouse ? `${loc.warehouse.code}/${loc.name}` : loc.name;
}

export const locationSelect = {
  id: true,
  name: true,
  type: true,
  warehouseId: true,
  warehouse: { select: { id: true, code: true, name: true } },
} satisfies Prisma.LocationSelect;
