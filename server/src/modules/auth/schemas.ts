import { z } from "zod";
import { passwordSchema } from "../../lib/auth";

const emailField = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

const nameField = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters");

/** Accepts a JSON string or number; the code is always 6 digits, zero padded. */
const otpField = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z
    .string({ required_error: "Code is required", invalid_type_error: "Code is required" })
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
);

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordSchema,
  role: z.enum(["MANAGER", "STAFF"]).default("STAFF"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const updateMeSchema = z
  .object({
    name: nameField.optional(),
    email: emailField.optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: "Provide at least a name or an email",
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const verifyOtpSchema = z.object({ email: emailField, otp: otpField });

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z.object({
  email: emailField,
  otp: otpField,
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
