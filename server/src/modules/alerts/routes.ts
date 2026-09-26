import { Router } from "express";
import { ok } from "../../lib/http";
import { parse } from "../../lib/validate";
import { lowStockQuerySchema } from "./schemas";
import * as alertsService from "./service";

const router = Router();

router.get("/low-stock", async (req, res) => {
  const query = parse(lowStockQuerySchema, req.query);
  ok(res, await alertsService.getLowStock(query));
});

export default router;
