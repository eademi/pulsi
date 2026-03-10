import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "TENANT_NOT_FOUND",
  "RESOURCE_NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "RATE_LIMITED",
  "EXTERNAL_SERVICE_FAILURE",
  "INTERNAL_ERROR"
]);

export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  requestId: z.string(),
  details: z.unknown().optional()
});

export const paginationMetaSchema = z.object({
  count: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  nextCursor: z.string().nullable().optional()
});

export const apiMetaSchema = z.object({
  pagination: paginationMetaSchema.optional(),
  generatedAt: z.string().datetime().optional()
});

export const createApiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: apiMetaSchema.optional()
  });

export const apiErrorResponseSchema = z.object({
  error: apiErrorSchema
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
