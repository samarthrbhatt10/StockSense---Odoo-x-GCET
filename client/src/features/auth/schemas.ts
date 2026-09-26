import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/validation";

/** Must stay in step with `passwordSchema` in lib/validation.ts. */
export const PASSWORD_RULES = [
  "At least 8 characters",
  "At most 72 characters",
  "At least one letter",
  "At least one digit",
] as const;

export function passwordRuleResults(password: string): boolean[] {
  return [
    password.length >= 8,
    password.length <= 72,
    /[A-Za-z]/.test(password),
    /\d/.test(password),
  ];
}

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters");

export const confirmPasswordSchema = z.string().min(1, "Please confirm your password");

export const signupSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
    role: z.enum(["MANAGER", "STAFF"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

export const ROLE_OPTIONS = [
  { value: "MANAGER", label: "Inventory Manager" },
  { value: "STAFF", label: "Warehouse Staff" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Inventory Manager",
  STAFF: "Warehouse Staff",
};

/** Step 1 of the reset flow. */
export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/** Step 2 of the reset flow — exactly 6 digits, zero padded on the server. */
export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type OtpValues = z.infer<typeof otpSchema>;

/** Step 3 of the reset flow. */
export const newPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
