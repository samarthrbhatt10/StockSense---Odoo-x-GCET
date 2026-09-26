import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { Role, User } from "@prisma/client";
import { AppError } from "./http";

export type AuthUser = { id: number; name: string; email: string; role: Role };
export type PublicUser = AuthUser & { createdAt: Date };

const BCRYPT_ROUNDS = 10;
const DEFAULT_EXPIRES_IN = "7d";

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set. Copy server/.env.example to server/.env.");
  return secret;
}

function unauthorized(): AppError {
  return new AppError(401, "UNAUTHORIZED", "Your session is invalid or has expired. Please log in again.");
}

export function signToken(userId: number): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN) as jwt.SignOptions["expiresIn"];
  return jwt.sign({ sub: String(userId) }, jwtSecret(), { expiresIn, algorithm: "HS256" });
}

export function verifyToken(token: string): number {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] });
  } catch {
    throw unauthorized();
  }
  const userId = typeof payload === "string" ? NaN : Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) throw unauthorized();
  return userId;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function toPublicUser(u: User): PublicUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one digit");
