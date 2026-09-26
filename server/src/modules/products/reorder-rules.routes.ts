import { Router } from "express";
import { list, ok } from "../../lib/http";
import { requireRole } from "../../middleware/auth";
import { idParamSchema, parse } from "../../lib/validate";
import {
  createReorderRuleSchema,
  reorderRuleListQuery,
  updateReorderRuleSchema,
} from "./schemas";
import * as service from "./reorder-rules.service";

const router = Router();

router.get("/", async (req, res) => {
  const query = parse(reorderRuleListQuery, req.query);
  const items = await service.listReorderRules(query);
  list(res, items, { total: items.length, page: 1, pageSize: items.length });
});

router.post("/", requireRole("MANAGER"), async (req, res) => {
  const input = parse(createReorderRuleSchema, req.body ?? {});
  ok(res, await service.createReorderRule(input), 201);
});

router.put("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(updateReorderRuleSchema, req.body ?? {});
  ok(res, await service.updateReorderRule(id, input));
});

router.delete("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  await service.deleteReorderRule(id);
  ok(res, null);
});

export default router;
