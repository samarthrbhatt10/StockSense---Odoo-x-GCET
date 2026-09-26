import { Router } from "express";
import { list, ok } from "../../lib/http";
import { requireRole } from "../../middleware/auth";
import { idParamSchema, parse, toSkipTake } from "../../lib/validate";
import { createWarehouseSchema, updateWarehouseSchema, warehouseListQuery } from "./warehouses.schemas";
import * as service from "./warehouses.service";

const router = Router();

router.get("/", async (req, res) => {
  const { page, pageSize, search } = parse(warehouseListQuery, req.query);
  const { skip, take } = toSkipTake({ page, pageSize });
  const { items, total } = await service.listWarehouses({ skip, take, search });
  list(res, items, { total, page, pageSize });
});

router.get("/:id", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  ok(res, await service.getWarehouse(id));
});

router.post("/", requireRole("MANAGER"), async (req, res) => {
  const input = parse(createWarehouseSchema, req.body ?? {});
  ok(res, await service.createWarehouse(input), 201);
});

router.put("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(updateWarehouseSchema, req.body ?? {});
  ok(res, await service.updateWarehouse(id, input));
});

router.delete("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  await service.deleteWarehouse(id);
  ok(res, null);
});

export default router;
