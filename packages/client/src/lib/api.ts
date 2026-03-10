import { z } from "zod";

import {
  actorSessionSchema,
  athleteReadinessSchema,
  createApiSuccessSchema
} from "@pulsi/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

const sessionResponseSchema = createApiSuccessSchema(actorSessionSchema);
const readinessResponseSchema = createApiSuccessSchema(athleteReadinessSchema.array());

const parseResponse = async <T extends z.ZodTypeAny>(
  response: Response,
  schema: T
): Promise<z.infer<T>> => {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }

  return schema.parse(payload);
};

export const apiClient = {
  async getSession() {
    const response = await fetch(`${API_BASE_URL}/v1/session`, {
      credentials: "include"
    });

    const parsed = await parseResponse(response, sessionResponseSchema);
    return parsed.data;
  },

  async getTenantReadiness(tenantSlug: string) {
    const response = await fetch(`${API_BASE_URL}/v1/tenants/${tenantSlug}/readiness`, {
      credentials: "include"
    });

    const parsed = await parseResponse(response, readinessResponseSchema);
    return parsed.data;
  }
};
