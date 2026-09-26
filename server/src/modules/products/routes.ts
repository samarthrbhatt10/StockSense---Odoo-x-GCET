import { Router } from "express";
import { list, ok } from "../../lib/http";
import { requireRole } from "../../middleware/auth";
import { idParamSchema, parse } from "../../lib/validate";
import { createProductSchema, productListQuery, updateProductSchema } from "./schemas";
import * as service from "./service";

const router = Router();

router.get("/", async (req, res) => {
  const query = parse(productListQuery, req.query);
  const { items, total, page, pageSize } = await service.listProducts(query);
  list(res, items, { total, page, pageSize });
});

router.get("/:id", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  ok(res, await service.getProduct(id));
});

router.post("/", async (req, res) => {
  const input = parse(createProductSchema, req.body ?? {});
  ok(res, await service.createProduct(input, req.user!.id), 201);
});

router.put("/:id", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(updateProductSchema, req.body ?? {});
  ok(res, await service.updateProduct(id, input));
});

router.delete("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  await service.deleteProduct(id);
  ok(res, null);
});

export default router;
