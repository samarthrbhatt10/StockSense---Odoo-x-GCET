import { z } from "zod";
import { optionalId, paginationSchema } from "../../lib/validate";

const SKU_PATTERN = /^[A-Z0-9-_]{2,40}$/;

const idNumber = z.coerce
  .number({ invalid_type_error: "Must be a positive integer id" })
  .int("Must be a positive integer id")
  .positive("Must be a positive integer id");

/** Accepts ?includeInactive / ?includeInactive=true / ?includeInactive=1. */
function booleanFlag(fallback: boolean) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    return value === "true" || value === "1";
  }, z.boolean());
}

const nameField = (max: number) =>
  z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(max, `Name must be at most ${max} characters`);

const skuField = z
  .string({ required_error: "SKU is required" })
  .trim()
  .toUpperCase()
  .regex(SKU_PATTERN, "SKU must be 2 to 40 letters, digits, hyphens or underscores");

const uomField = z
  .string({ required_error: "Unit of measure is required" })
  .trim()
  .min(1, "Unit of measure is required")
  .max(20, "Unit of measure must be at most 20 characters");

export const productListQuery = paginationSchema.extend({
  categoryId: optionalId,
  warehouseId: optionalId,
  stockStatus: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(["OK", "LOW", "OUT"]).optional(),
  ),
  includeInactive: booleanFlag(false),
});

export type ProductListQuery = z.infer<typeof productListQuery>;

/** `null` clears the category, `undefined` leaves it untouched. */
const categoryIdField = z.preprocess(
  (value) => {
    if (value === undefined || value === "") return undefined;
    if (value === null) return null;
    return Number(value);
  },
  z
    .number({ invalid_type_error: "Select a valid category" })
    .int("Select a valid category")
    .positive("Select a valid category")
    .nullable()
    .optional(),
);

export const createProductSchema = z.object({
  name: nameField(120),
  sku: skuField,
  uom: uomField.default("Units"),
  categoryId: categoryIdField,
  initialStock: z
    .object({
      locationId: idNumber,
      quantity: z.coerce.number().positive("Quantity must be greater than 0"),
    })
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: nameField(120),
  sku: skuField,
  uom: uomField,
  categoryId: categoryIdField,
  isActive: z.boolean({ required_error: "isActive is required" }),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const categorySchema = z.object({
  name: nameField(60),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const reorderRuleListQuery = z.object({
  productId: optionalId,
  warehouseId: optionalId,
});

export type ReorderRuleListQuery = z.infer<typeof reorderRuleListQuery>;

const quantities = {
  minQty: z.coerce.number().min(0, "Min must be at least 0"),
  maxQty: z.coerce.number().min(0, "Max must be at least 0"),
};

export const createReorderRuleSchema = z
  .object({ productId: idNumber, warehouseId: idNumber, ...quantities })
  .refine((value) => value.maxQty >= value.minQty, {
    message: "Max must be at least min",
    path: ["maxQty"],
  });

export type CreateReorderRuleInput = z.infer<typeof createReorderRuleSchema>;

export const updateReorderRuleSchema = z
  .object(quantities)
  .refine((value) => value.maxQty >= value.minQty, {
    message: "Max must be at least min",
    path: ["maxQty"],
  });

export type UpdateReorderRuleInput = z.infer<typeof updateReorderRuleSchema>;
