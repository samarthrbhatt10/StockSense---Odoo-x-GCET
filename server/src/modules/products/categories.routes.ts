import { Router } from "express";
import { list, ok } from "../../lib/http";
import { requireRole } from "../../middleware/auth";
import { idParamSchema, parse } from "../../lib/validate";
import { categorySchema } from "./schemas";
import * as service from "./categories.service";

const router = Router();

router.get("/", async (_req, res) => {
  list(res, await service.listCategories(), { total: 0, page: 1, pageSize: 0 });
});

router.post("/", requireRole("MANAGER"), async (req, res) => {
  const input = parse(categorySchema, req.body ?? {});
  ok(res, await service.createCategory(input), 201);
});

router.put("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(categorySchema, req.body ?? {});
  ok(res, await service.updateCategory(id, input));
});

router.delete("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  await service.deleteCategory(id);
  ok(res, null);
});

export default router;
