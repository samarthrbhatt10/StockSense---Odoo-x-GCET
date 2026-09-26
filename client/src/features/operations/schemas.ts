import { z } from 'zod'
import type { KindConfig } from './kinds'

export const operationLineFormSchema = z.object({
  productId: z.number().int().positive('Select a product'),
  productName: z.string(),
  productSku: z.string(),
  productUom: z.string(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  countedQuantity: z.number().min(0, 'Counted quantity cannot be negative'),
})

const baseOperationFormSchema = z.object({
  partnerName: z.string().trim().max(120, 'At most 120 characters'),
  sourceLocationId: z.number().int().positive().nullable(),
  destLocationId: z.number().int().positive().nullable(),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  notes: z.string().trim().max(500, 'At most 500 characters'),
  lines: z.array(operationLineFormSchema).min(1, 'Add at least one product').max(100, 'At most 100 lines'),
})

export type OperationFormValues = z.infer<typeof baseOperationFormSchema>

/**
 * The location rules depend on the kind (CONTRACT §3), so the schema is built
 * per kind: one of source/destination is virtual and set by the server, and a
 * transfer needs two different internal locations.
 */
export function buildOperationFormSchema(config: KindConfig) {
  return baseOperationFormSchema.superRefine((values, ctx) => {
    if (config.needsSource && !values.sourceLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceLocationId'],
        message: `${config.sourceLabel} is required`,
      })
    }
    if (config.needsDest && !values.destLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destLocationId'],
        message: `${config.destLabel} is required`,
      })
    }
    if (
      config.needsSource &&
      config.needsDest &&
      values.sourceLocationId &&
      values.destLocationId === values.sourceLocationId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destLocationId'],
        message: 'Must be a different location from the source',
      })
    }
  })
}
