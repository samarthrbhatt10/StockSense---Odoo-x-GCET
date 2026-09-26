import { Router } from "express";
import { list, ok } from "../../lib/http";
import { parse } from "../../lib/validate";
import { operationsQuerySchema, summaryQuerySchema } from "./schemas";
import * as dashboardService from "./service";

const router = Router();

router.get("/summary", async (req, res) => {
  const scope = parse(summaryQuerySchema, req.query);
  ok(res, await dashboardService.getSummary(scope));
});

router.get("/operations", async (req, res) => {
  const query = parse(operationsQuerySchema, req.query);
  const { items, meta } = await dashboardService.listOperations(query);
  list(res, items, meta);
});

export default router;
