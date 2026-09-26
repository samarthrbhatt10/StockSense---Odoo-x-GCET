import { z } from 'zod'

const SKU_PATTERN = /^[A-Z0-9-_]{2,40}$/

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be at most 120 characters'),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(SKU_PATTERN, 'SKU must be 2 to 40 letters, digits, hyphens or underscores'),
  uom: z
    .string()
    .trim()
    .min(1, 'Unit of measure is required')
    .max(20, 'Unit of measure must be at most 20 characters'),
  categoryId: z.string(),
  isActive: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

/** Initial stock is optional, and only valid when both halves are filled in. */
export const initialStockSchema = z
  .object({
    locationId: z.string(),
    quantity: z.string(),
  })
  .refine(
    (values) => !values.locationId && !values.quantity,
    {
      message: 'Choose a location and a quantity, or leave both empty',
      path: ['quantity'],
    },
  )
  .refine(
    (values) =>
      !values.locationId ||
      /^\d+(\.\d+)?$/.test(values.quantity.trim()) &&
        Number(values.quantity) > 0,
    {
      message: 'Quantity must be greater than 0',
      path: ['quantity'],
    },
  )

export type InitialStockValues = z.infer<typeof initialStockSchema>

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const reorderRuleFormSchema = z
  .object({
    warehouseId: z.string().min(1, 'Select a warehouse'),
    minQty: z
      .string()
      .trim()
      .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= 0, 'Min must be 0 or more'),
    maxQty: z
      .string()
      .trim()
      .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= 0, 'Max must be 0 or more'),
  })
  .refine((values) => Number(values.maxQty) >= Number(values.minQty), {
    message: 'Max must be at least min',
    path: ['maxQty'],
  })

export type ReorderRuleFormValues = z.infer<typeof reorderRuleFormSchema>
