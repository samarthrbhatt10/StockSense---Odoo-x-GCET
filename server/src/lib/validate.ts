import { z } from "zod";
import { AppError } from "./http";

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyToUndefined(value: unknown): unknown {
  return value === "" || value === null ? undefined : value;
}

function describeIssue(issue: z.ZodIssue): string {
  if (issue.path.length === 0) return issue.message;
  return `${issue.path.join(".")}: ${issue.message}`;
}

export function validationError(error: z.ZodError): AppError {
  const { fieldErrors, formErrors } = error.flatten();
  const first = error.issues[0];
  const message = first ? describeIssue(first) : "Invalid input";
  return new AppError(400, "VALIDATION_ERROR", message, { fieldErrors, formErrors });
}

export function parse<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

const ID_MESSAGE = "Must be a positive integer id";

function idNumber() {
  return z.coerce.number({ invalid_type_error: ID_MESSAGE }).int(ID_MESSAGE).positive(ID_MESSAGE);
}

export const idParamSchema = z.object({ id: idNumber() });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "page must be at least 1").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, "pageSize must be at least 1")
    .max(100, "pageSize must be at most 100")
    .default(20),
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

export function toSkipTake(p: { page: number; pageSize: number }): { skip: number; take: number } {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}

export const optionalId = z.preprocess(emptyToUndefined, idNumber().optional());

export function enumList<T extends [string, ...string[]]>(values: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    const raw = Array.isArray(value) ? value.map(String) : [String(value)];
    const items = raw
      .flatMap((part) => part.split(","))
      .map((part) => part.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }, z.array(z.enum(values)).optional());
}

export const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD")
    .transform((value, ctx) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" });
        return z.NEVER;
      }
      return date;
    })
    .optional(),
);

export function toDateRange(from?: Date, to?: Date): { gte?: Date; lt?: Date } | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lt: new Date(to.getTime() + DAY_MS) } : {}),
  };
}
