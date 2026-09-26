import { z } from "zod";
import { confirmPasswordSchema, nameSchema } from "@/features/auth/schemas";
import { emailSchema, passwordSchema } from "@/lib/validation";

export const profileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Your current password is required"),
    newPassword: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "Your new password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
