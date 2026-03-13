import { z } from "zod";

import {
  adminViewerSchema,
  createApiSuccessSchema,
  garminAdminBackfillRerunSchema,
  garminAdminOverviewSchema
} from "@pulsi/shared";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:3001";
const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;

const adminBootstrapResponseSchema = createApiSuccessSchema(adminViewerSchema);
const garminAdminOverviewResponseSchema = createApiSuccessSchema(garminAdminOverviewSchema);
const authSignInResponseSchema = z.object({
  redirect: z.boolean(),
  token: z.string(),
  url: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    image: z.string().nullable().optional(),
    emailVerified: z.boolean().optional()
  })
});
const authSignOutResponseSchema = z.object({
  success: z.boolean()
});

const getErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return "Request failed";
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.message === "string") {
    return record.message;
  }

  if (record.error && typeof record.error === "object") {
    const nestedError = record.error as Record<string, unknown>;
    if (typeof nestedError.message === "string") {
      return nestedError.message;
    }
  }

  return "Request failed";
};

const parseResponse = async <T extends z.ZodTypeAny>(response: Response, schema: T): Promise<z.infer<T>> => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return schema.parse(payload);
};

const request = async <T extends z.ZodTypeAny>(path: string, schema: T, init?: RequestInit) => {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers
  });

  return parseResponse(response, schema);
};

export const apiClient = {
  async signInEmail(input: { email: string; password: string; rememberMe?: boolean }) {
    return request(`${AUTH_BASE_URL}/sign-in/email`, authSignInResponseSchema, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async signOut() {
    return request(`${AUTH_BASE_URL}/sign-out`, authSignOutResponseSchema, {
      method: "POST",
      body: JSON.stringify({})
    });
  },

  async getAdminBootstrap() {
    const parsed = await request(`${API_BASE_URL}/v1/admin/bootstrap`, adminBootstrapResponseSchema, {
      method: "GET"
    });

    return parsed.data;
  },

  async getAdminBootstrapOptional() {
    const response = await fetch(`${API_BASE_URL}/v1/admin/bootstrap`, {
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    const parsed = await parseResponse(response, adminBootstrapResponseSchema);
    return parsed.data;
  },

  async getAdminGarminOverview() {
    const parsed = await request(`${API_BASE_URL}/v1/admin/garmin`, garminAdminOverviewResponseSchema, {
      method: "GET"
    });

    return parsed.data;
  },

  async rerunAdminGarminBackfill(connectionId: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/admin/garmin/connections/${connectionId}/backfill`,
      createApiSuccessSchema(garminAdminBackfillRerunSchema),
      {
        method: "POST"
      }
    );

    return parsed.data;
  }
};
