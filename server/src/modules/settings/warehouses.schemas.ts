import { z } from "zod";
import { paginationSchema } from "../../lib/validate";

const CODE_PATTERN = /^[A-Z0-9]{2,5}$/;

export const warehouseListQuery = paginationSchema;

const nameField = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters");

/** An empty string means "no address", not an address of "". */
const addressField = z
  .string()
  .trim()
  .max(200, "Address must be at most 200 characters")
  .optional()
  .transform((value) => value || undefined);

export const createWarehouseSchema = z.object({
  name: nameField,
  code: z
    .string({ required_error: "Code is required" })
    .trim()
    .toUpperCase()
    .regex(CODE_PATTERN, "Code must be 2 to 5 letters or digits"),
  address: addressField,
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

/** `code` is deliberately absent: document references are built from it. */
export const updateWarehouseSchema = z.object({
  name: nameField,
  address: addressField,
});

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
