import { Router } from "express";
import { ok } from "../../lib/http";
import { parse } from "../../lib/validate";
import { requireAuth } from "../../middleware/auth";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateMeSchema,
  verifyOtpSchema,
} from "./schemas";
import * as authService from "./service";

const router = Router();

router.post("/login", async (req, res) => {
  const input = parse(loginSchema, req.body ?? {});
  ok(res, await authService.login(input));
});

router.get("/me", requireAuth, async (req, res) => {
  ok(res, await authService.getMe(req.user!.id));
});

router.post("/signup", async (req, res) => {
  const input = parse(signupSchema, req.body ?? {});
  ok(res, await authService.signup(input), 201);
});

router.patch("/me", requireAuth, async (req, res) => {
  const input = parse(updateMeSchema, req.body ?? {});
  ok(res, await authService.updateMe(req.user!.id, input));
});

router.post("/change-password", requireAuth, async (req, res) => {
  const input = parse(changePasswordSchema, req.body ?? {});
  ok(res, await authService.changePassword(req.user!.id, input));
});

router.post("/forgot-password", async (req, res) => {
  const input = parse(forgotPasswordSchema, req.body ?? {});
  ok(res, await authService.forgotPassword(input.email));
});

router.post("/verify-otp", async (req, res) => {
  const input = parse(verifyOtpSchema, req.body ?? {});
  ok(res, await authService.verifyOtp(input));
});

router.post("/reset-password", async (req, res) => {
  const input = parse(resetPasswordSchema, req.body ?? {});
  ok(res, await authService.resetPassword(input));
});

export default router;
