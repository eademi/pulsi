import type { Context } from "hono";

import type { ApiMeta } from "@pulsi/shared";

import { AppError, isAppError } from "./errors";

export const ok = <T>(c: Context, data: T, meta?: ApiMeta) => c.json({ data, meta }, 200);

export const created = <T>(c: Context, data: T, meta?: ApiMeta) => c.json({ data, meta }, 201);

export const parseOrThrow = <T>(
  parsed:
    | { success: true; data: T }
    | { success: false; error: { flatten: () => unknown } }
): T => {
  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", parsed.error.flatten());
  }

  return parsed.data;
};

export const toErrorResponse = (requestId: string, error: unknown) => {
  if (isAppError(error)) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          details: error.details
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "Internal server error",
        requestId
      }
    }
  };
};
