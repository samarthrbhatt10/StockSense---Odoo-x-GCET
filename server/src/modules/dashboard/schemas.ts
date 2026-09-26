import { OperationType } from "@prisma/client";
import { z } from "zod";
import { enumList, optionalId, paginationSchema } from "../../lib/validate";

export const OPERATION_STATUSES = ["DRAFT", "WAITING", "READY", "DONE", "CANCELED"] as const;

export const summaryQuerySchema = z.object({
  warehouseId: optionalId,
  categoryId: optionalId,
});

export const operationsQuerySchema = paginationSchema.omit({ search: true }).extend({
  type: z.preprocess((value) => (value === "" ? undefined : value), z.nativeEnum(OperationType).optional()),
  status: enumList([...OPERATION_STATUSES]),
  warehouseId: optionalId,
  categoryId: optionalId,
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type OperationsQuery = z.infer<typeof operationsQuerySchema>;
