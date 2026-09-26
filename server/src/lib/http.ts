import type { Response } from "express";

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ListMeta = { total: number; page: number; pageSize: number };

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function list<T>(res: Response, items: T[], meta: ListMeta): void {
  res.status(200).json({ data: items, meta });
}

export function notFound(entity: string): AppError {
  return new AppError(404, "NOT_FOUND", `${entity} not found`);
}

export function invalidState(message: string): AppError {
  return new AppError(409, "INVALID_STATE", message);
}
