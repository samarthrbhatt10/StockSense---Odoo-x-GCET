import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/http";
import { validationError } from "../lib/validate";

export const notFoundHandler: RequestHandler = () => {
  throw new AppError(404, "NOT_FOUND", "Route not found");
};

/** Errors raised by express.json() (body-parser) carry a `type` and a 4xx `status`. */
function bodyParserError(err: unknown): AppError | undefined {
  if (typeof err !== "object" || err === null || !("type" in err)) return undefined;
  const { type } = err as { type: unknown };
  if (type === "entity.parse.failed") {
    return new AppError(400, "VALIDATION_ERROR", "The request body is not valid JSON");
  }
  if (type === "entity.too.large") {
    return new AppError(400, "VALIDATION_ERROR", "The request body is too large");
  }
  return undefined;
}

function prismaError(err: Prisma.PrismaClientKnownRequestError): AppError | undefined {
  switch (err.code) {
    case "P2002": {
      const target = err.meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : target ? [String(target)] : [];
      const label = fields.length > 0 ? fields.join(", ") : "value";
      return new AppError(409, "CONFLICT", `A record with this ${label} already exists`, { fields });
    }
    case "P2003":
      return new AppError(409, "IN_USE", "This record is in use by other records and cannot be deleted");
    case "P2025":
      return new AppError(404, "NOT_FOUND", "Record not found");
    default:
      return undefined;
  }
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return validationError(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaError(err);
    if (mapped) return mapped;
  }
  return bodyParserError(err) ?? new AppError(500, "INTERNAL", "Something went wrong on the server");
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const appError = toAppError(err);
  if (appError.status === 500) console.error(err);

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  });
};
