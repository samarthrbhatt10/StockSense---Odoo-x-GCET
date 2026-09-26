import { z } from "zod";
import { OperationStatus, OperationType } from "@prisma/client";
import {
  enumList,
  optionalDate,
  optionalId,
  paginationSchema,
} from "../../lib/validate";

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

export const listOperationsQuerySchema = paginationSchema.extend({
  type: z.nativeEnum(OperationType).optional(),
  status: enumList([
    OperationStatus.DRAFT,
    OperationStatus.WAITING,
    OperationStatus.READY,
    OperationStatus.DONE,
    OperationStatus.CANCELED,
  ] as const),
  warehouseId: optionalId,
  dateFrom: optionalDate,
  dateTo: optionalDate,
});

// ---------------------------------------------------------------------------
// Line input
// ---------------------------------------------------------------------------

export const operationLineInputSchema = z.object({
  productId: z.number({ invalid_type_error: "productId must be a number" }).int().positive(),
  quantity: z
    .number({ invalid_type_error: "quantity must be a number" })
    .positive("Quantity must be greater than 0")
    .optional(),
  countedQuantity: z
    .number({ invalid_type_error: "countedQuantity must be a number" })
    .min(0, "Counted quantity cannot be negative")
    .optional(),
});

// ---------------------------------------------------------------------------
// Create / Update
// ---------------------------------------------------------------------------

export const createOperationSchema = z.object({
  type: z.nativeEnum(OperationType, { required_error: "type is required" }),
  sourceLocationId: z.number().int().positive().optional(),
  destLocationId: z.number().int().positive().optional(),
  partnerName: z.string().trim().max(120, "Partner name must be at most 120 characters").optional().nullable(),
  scheduledDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500, "Notes must be at most 500 characters").optional().nullable(),
  lines: z
    .array(operationLineInputSchema)
    .min(1, "At least one line is required")
    .max(100, "At most 100 lines are allowed"),
});

export const updateOperationSchema = z.object({
  // type must match or be omitted — enforced in service
  type: z.nativeEnum(OperationType).optional(),
  sourceLocationId: z.number().int().positive().optional(),
  destLocationId: z.number().int().positive().optional(),
  partnerName: z.string().trim().max(120).optional().nullable(),
  scheduledDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  lines: z
    .array(operationLineInputSchema)
    .min(1, "At least one line is required")
    .max(100, "At most 100 lines are allowed"),
});
