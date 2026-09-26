import { z } from 'zod'

export const lineInputSchema = z.object({
  productId: z.number().int().positive('Select a product'),
  productName: z.string(),
  productSku: z.string(),
  productUom: z.string(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  countedQuantity: z.number().min(0, 'Cannot be negative'),
})

export const operationFormSchema = z.object({
  partnerName: z.string().trim().max(120, 'Max 120 characters'),
  sourceLocationId: z.number().int().positive().nullable(),
  destLocationId: z.number().int().positive().nullable(),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().trim().max(500, 'Max 500 characters'),
  lines: z.array(lineInputSchema).min(1, 'At least one product line is required'),
})

export type OperationFormValues = z.infer<typeof operationFormSchema>
