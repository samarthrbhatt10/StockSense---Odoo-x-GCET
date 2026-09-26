import { OperationType } from "@prisma/client";
import { z } from "zod";
import { optionalDate, optionalId, paginationSchema } from "../../lib/validate";

export const movesQuerySchema = paginationSchema
  .extend({
    productId: optionalId,
    locationId: optionalId,
    warehouseId: optionalId,
    type: z.preprocess((value) => (value === "" ? undefined : value), z.nativeEnum(OperationType).optional()),
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: "dateFrom must be on or before dateTo",
    path: ["dateTo"],
  });

export type MovesQuery = z.infer<typeof movesQuerySchema>;
