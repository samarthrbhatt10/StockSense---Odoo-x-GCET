import { z } from 'zod'

const CODE_PATTERN = /^[A-Z0-9]{2,5}$/

export const warehouseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CODE_PATTERN, 'Code must be 2 to 5 letters or digits'),
  address: z
    .string()
    .trim()
    .max(200, 'Address must be at most 200 characters')
    .optional(),
})

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>

export const locationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be at most 60 characters'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
})

export type LocationFormValues = z.infer<typeof locationFormSchema>

export const editLocationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be at most 60 characters'),
  isActive: z.boolean(),
})

export type EditLocationFormValues = z.infer<typeof editLocationFormSchema>
