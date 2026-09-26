import { z } from "zod";
import { optionalId } from "../../lib/validate";

export const lowStockQuerySchema = z.object({
  warehouseId: optionalId,
  categoryId: optionalId,
});

export type LowStockQuery = z.infer<typeof lowStockQuerySchema>;
