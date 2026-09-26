import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { verifyToken } from "../lib/auth";
import { AppError } from "../lib/http";
import { prisma } from "../lib/prisma";

const BEARER = /^Bearer\s+(\S+)$/i;

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const match = req.headers.authorization?.match(BEARER);
  if (!match) throw new AppError(401, "UNAUTHORIZED", "Please log in to continue");

  const userId = verifyToken(match[1]);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Your account no longer exists. Please log in again.");

  req.user = user;
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Please log in to continue");
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action");
    }
    next();
  };
}
