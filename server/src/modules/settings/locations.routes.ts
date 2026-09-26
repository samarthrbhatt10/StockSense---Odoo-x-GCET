import { Router } from "express";
import { list, ok } from "../../lib/http";
import { requireRole } from "../../middleware/auth";
import { idParamSchema, parse, toSkipTake } from "../../lib/validate";
import { createLocationSchema, locationListQuery, updateLocationSchema } from "./locations.schemas";
import * as service from "./locations.service";

const router = Router();

router.get("/", async (req, res) => {
  const query = parse(locationListQuery, req.query);
  const { skip, take } = toSkipTake({ page: query.page, pageSize: query.pageSize });
  const { items, total } = await service.listLocations({ ...query, skip, take });
  list(res, items, { total, page: query.page, pageSize: query.pageSize });
});

router.post("/", requireRole("MANAGER"), async (req, res) => {
  const input = parse(createLocationSchema, req.body ?? {});
  ok(res, await service.createLocation(input), 201);
});

router.put("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(updateLocationSchema, req.body ?? {});
  ok(res, await service.updateLocation(id, input));
});

router.delete("/:id", requireRole("MANAGER"), async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  await service.deleteLocation(id);
  ok(res, null);
});

export default router;
