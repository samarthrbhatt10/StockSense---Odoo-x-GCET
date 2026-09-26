import { ApiError } from "@/lib/api";

type ErrorDetails = { fieldErrors?: Record<string, string[] | undefined> } | undefined;

/**
 * The server answers a 400 VALIDATION_ERROR with `details.fieldErrors`, which is
 * how a wrong current password reaches the field it belongs to.
 */
export function fieldErrorsOf(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const details = error.details as ErrorDetails;
  const messages = details?.fieldErrors?.[field];
  if (Array.isArray(messages) && messages.length > 0) return messages[0];
  return undefined;
}

/** Same as {@link fieldErrorsOf} but keeps the first message of any field. */
export function anyFieldErrorOf(error: unknown): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const details = error.details as ErrorDetails;
  const fieldErrors = details?.fieldErrors;
  if (!fieldErrors) return undefined;
  for (const messages of Object.values(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) return messages[0];
  }
  return undefined;
}

export function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** True for a 409, which is how the server reports an email that is already taken. */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
