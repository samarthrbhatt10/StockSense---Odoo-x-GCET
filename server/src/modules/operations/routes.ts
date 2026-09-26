import { Router } from "express";
import { ok, list } from "../../lib/http";
import { parse, idParamSchema } from "../../lib/validate";
import { requireRole } from "../../middleware/auth";
import {
  listOperationsQuerySchema,
  createOperationSchema,
  updateOperationSchema,
} from "./schemas";
import {
  listOperations,
  getOperationDetail,
  createOperation,
  updateOperation,
  deleteOperation,
} from "./service";
import {
  confirmOperation,
  checkAvailabilityOperation,
  validateOperation,
  cancelOperation,
} from "./workflow";

const router = Router();

// GET / — list
router.get("/", async (req, res) => {
  const query = parse(listOperationsQuerySchema, req.query);
  const result = await listOperations(query);
  list(res, result.items, result.meta);
});

// GET /:id — detail
router.get("/:id", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const op = await getOperationDetail(id);
  ok(res, op);
});

// POST / — create DRAFT
router.post("/", async (req, res) => {
  const input = parse(createOperationSchema, req.body ?? {});
  const op = await createOperation(req.user!, input);
  ok(res, op, 201);
});

// PUT /:id — edit (DRAFT only)
router.put("/:id", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(updateOperationSchema, req.body ?? {});
  const op = await updateOperation(req.user!, id, input);
  ok(res, op);
});

// DELETE /:id — delete (DRAFT only)
router.delete("/:id", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const result = await deleteOperation(id);
  ok(res, result);
});

// POST /:id/confirm
router.post("/:id/confirm", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const op = await confirmOperation(req.user!, id);
  ok(res, op);
});

// POST /:id/check-availability
router.post("/:id/check-availability", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const op = await checkAvailabilityOperation(req.user!, id);
  ok(res, op);
});

// POST /:id/validate
router.post("/:id/validate", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const op = await validateOperation(req.user!, id);
  ok(res, op);
});

// POST /:id/cancel
router.post("/:id/cancel", async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const op = await cancelOperation(req.user!, id);
  ok(res, op);
});

export default router;
