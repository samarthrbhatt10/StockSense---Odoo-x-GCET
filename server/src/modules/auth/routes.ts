import { Router } from "express";
import { ok } from "../../lib/http";
import { parse } from "../../lib/validate";
import { requireAuth } from "../../middleware/auth";
import { loginSchema } from "./schemas";
import * as authService from "./service";

const router = Router();

router.post("/login", async (req, res) => {
  const input = parse(loginSchema, req.body ?? {});
  ok(res, await authService.login(input));
});

router.get("/me", requireAuth, async (req, res) => {
  ok(res, await authService.getMe(req.user!.id));
});

export default router;
