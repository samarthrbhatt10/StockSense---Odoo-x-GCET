import crypto from "node:crypto";
import { Prisma, type PasswordResetOtp, type User } from "@prisma/client";
import {
  hashPassword,
  signToken,
  toPublicUser,
  verifyPassword,
  type PublicUser,
} from "../../lib/auth";
import { AppError, notFound } from "../../lib/http";
import { sendMail } from "../../lib/mailer";
import { prisma } from "../../lib/prisma";
import type {
  ChangePasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdateMeInput,
  VerifyOtpInput,
} from "./schemas";

/** Seconds a freshly issued code stays valid. */
const OTP_TTL_MINUTES = 10;
/** A new code is only issued if the previous one is older than this. */
const RESEND_COOLDOWN_MS = 30_000;
/** Failed guesses allowed before a code is burned. */
const MAX_OTP_ATTEMPTS = 5;
/** Identical answer for known and unknown emails so accounts cannot be probed. */
const FORGOT_PASSWORD_MESSAGE = "If an account exists for this email, a code has been sent.";
const EMAIL_IN_USE_MESSAGE = "An account with this email already exists";

let dummyHash: Promise<string> | undefined;

/** Compares against a throwaway hash so unknown emails take as long as wrong passwords. */
function compareWithDummy(password: string): Promise<boolean> {
  dummyHash ??= hashPassword("stocksense-timing-guard-1");
  return dummyHash.then((hash) => verifyPassword(password, hash)).then(() => false);
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function invalidOtp(message: string): AppError {
  return new AppError(400, "OTP_INVALID", message);
}

function fieldError(field: string, message: string): AppError {
  return new AppError(400, "VALIDATION_ERROR", message, { fieldErrors: { [field]: [message] } });
}

export async function login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : await compareWithDummy(input.password);
  if (!user || !valid) throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  return { token: signToken(user.id), user: toPublicUser(user) };
}

export async function getMe(userId: number): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");
  return toPublicUser(user);
}

export async function signup(input: SignupInput): Promise<{ token: string; user: PublicUser }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new AppError(409, "CONFLICT", EMAIL_IN_USE_MESSAGE);

  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: input.role },
    });
    return { token: signToken(user.id), user: toPublicUser(user) };
  } catch (err) {
    // Two signups for the same email can race past the check above.
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", EMAIL_IN_USE_MESSAGE);
    throw err;
  }
}

export async function updateMe(userId: number, input: UpdateMeInput): Promise<PublicUser> {
  const data: { name?: string; email?: string } = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;

  try {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return toPublicUser(user);
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", EMAIL_IN_USE_MESSAGE);
    throw err;
  }
}

export async function changePassword(
  userId: number,
  input: ChangePasswordInput,
): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");

  // A wrong current password is a validation problem, not an auth failure, so
  // the client must not treat it as a session problem.
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw fieldError("currentPassword", "Your current password is incorrect");
  }
  if (input.currentPassword === input.newPassword) {
    throw fieldError("newPassword", "Your new password must be different from your current password");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { message: "Password updated" };
}

/** 6 digits, zero padded, from a cryptographically secure source. */
function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { message: FORGOT_PASSWORD_MESSAGE };

  const issuedRecently = await prisma.passwordResetOtp.findFirst({
    where: { userId: user.id, usedAt: null, createdAt: { gte: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  // Rate limited: answer exactly as if a code had been sent.
  if (issuedRecently) return { message: FORGOT_PASSWORD_MESSAGE };

  const code = generateOtpCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  const usedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetOtp.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt } });
    await tx.passwordResetOtp.create({ data: { userId: user.id, codeHash, expiresAt } });
  });

  await sendMail({
    to: user.email,
    subject: "Your StockSense password reset code",
    text: [
      `Hi ${user.name},`,
      "",
      `Your StockSense password reset code is: ${code}`,
      "",
      `It expires at ${expiresAt.toISOString()}, ${OTP_TTL_MINUTES} minutes from now.`,
      "",
      "If you did not request a password reset you can ignore this email.",
    ].join("\n"),
  });

  return { message: FORGOT_PASSWORD_MESSAGE };
}

/**
 * Shared by verify-otp and reset-password. Never consumes the code on success —
 * only reset-password marks it used, inside its own transaction.
 */
async function checkOtp(email: string, otp: string): Promise<{ user: User; otp: PasswordResetOtp }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw invalidOtp("Invalid or expired code");

  const record = await prisma.passwordResetOtp.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw invalidOtp("Invalid or expired code");

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, "OTP_EXPIRED", "This code has expired. Request a new one.");
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.passwordResetOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    throw invalidOtp("Too many attempts. Request a new code.");
  }

  if (!(await verifyPassword(otp, record.codeHash))) {
    const attempts = record.attempts + 1;
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 }, ...(attempts >= MAX_OTP_ATTEMPTS ? { usedAt: new Date() } : {}) },
    });
    // The fifth wrong guess burns the code, so the user is told to request a new one.
    if (attempts >= MAX_OTP_ATTEMPTS) throw invalidOtp("Too many attempts. Request a new code.");
    throw invalidOtp("Incorrect code");
  }

  return { user, otp: record };
}

export async function verifyOtp(input: VerifyOtpInput): Promise<{ valid: true }> {
  await checkOtp(input.email, input.otp);
  return { valid: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  const { user, otp } = await checkOtp(input.email, input.otp);
  const passwordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.passwordResetOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
  ]);

  return { message: "Password updated. You can now log in." };
}
