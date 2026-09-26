import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().email()

/** Mirrors the server rule: 8–72 characters, at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((value) => /[A-Za-z]/.test(value), 'Password must contain at least one letter')
  .refine((value) => /\d/.test(value), 'Password must contain at least one digit')
