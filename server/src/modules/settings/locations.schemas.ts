import { LocationType } from "@prisma/client";
import { z } from "zod";
import { optionalId, paginationSchema } from "../../lib/validate";

/** Accepts ?includeInactive / ?includeInactive=true / ?includeInactive=1. */
function booleanFlag(fallback: boolean) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1";
  }, z.boolean());
}

export const locationListQuery = paginationSchema.extend({
  warehouseId: optionalId,
  type: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.nativeEnum(LocationType).optional(),
  ),
  includeInactive: booleanFlag(false),
});

export type LocationListQuery = z.infer<typeof locationListQuery>;

/** The parsed query plus the resolved slice, so the service never sees page numbers. */
export type LocationListParams = LocationListQuery & { skip: number; take: number };

export const createLocationSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be at most 60 characters"),
  warehouseId: z.coerce
    .number({ invalid_type_error: "Select a warehouse" })
    .int("Select a warehouse")
    .positive("Select a warehouse"),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(60, "Name must be at most 60 characters")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: "Provide a name or an active flag",
  });

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
