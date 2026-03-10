import { z } from "zod";

import {
  athleteDeviceConnectionSchema,
  athleteSchema,
  actorSessionSchema,
  athleteReadinessSchema,
  createApiSuccessSchema,
  createTenantInputSchema,
  createGarminConnectionSessionInputSchema,
  garminConnectionSessionSchema,
  garminIntegrationStatusSchema,
  inviteTenantMemberInputSchema,
  tenantInvitationSchema,
  tenantMemberSchema,
  tenantSchema
} from "@pulsi/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;

const sessionResponseSchema = createApiSuccessSchema(actorSessionSchema);
const readinessResponseSchema = createApiSuccessSchema(athleteReadinessSchema.array());
const athletesResponseSchema = createApiSuccessSchema(athleteSchema.array());
const tenantsResponseSchema = createApiSuccessSchema(tenantSchema.array());
const createTenantResponseSchema = createApiSuccessSchema(tenantSchema);
const tenantMembersResponseSchema = createApiSuccessSchema(tenantMemberSchema.array());
const tenantInvitationsResponseSchema = createApiSuccessSchema(tenantInvitationSchema.array());
const inviteTenantMemberResponseSchema = createApiSuccessSchema(tenantInvitationSchema);
const garminConnectionsResponseSchema = createApiSuccessSchema(athleteDeviceConnectionSchema.array());
const createGarminConnectionSessionResponseSchema = createApiSuccessSchema(garminConnectionSessionSchema);
const garminIntegrationStatusResponseSchema = createApiSuccessSchema(garminIntegrationStatusSchema);
const acceptInvitationResponseSchema = createApiSuccessSchema(
  z.object({
    accepted: z.boolean()
  })
);
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
const authSignUpResponseSchema = z.object({
  token: z.string().nullable(),
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

const parseResponse = async <T extends z.ZodTypeAny>(
  response: Response,
  schema: T
): Promise<z.infer<T>> => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(getErrorMessage(payload));
  }

  return schema.parse(payload);
};

const request = async <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  init?: RequestInit
) => {
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
  async getSession() {
    const parsed = await request(`${API_BASE_URL}/v1/session`, sessionResponseSchema, {
      method: "GET"
    });
    return parsed.data;
  },

  async getSessionOptional() {
    const response = await fetch(`${API_BASE_URL}/v1/session`, {
      credentials: "include"
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    const parsed = await parseResponse(response, sessionResponseSchema);
    return parsed.data;
  },

  async getTenantReadiness(tenantSlug: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/readiness`,
      readinessResponseSchema,
      {
        method: "GET"
      }
    );

    return parsed.data;
  },

  async getTenantAthletes(tenantSlug: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes`,
      athletesResponseSchema,
      {
        method: "GET"
      }
    );

    return parsed.data;
  },

  async listTenants() {
    const parsed = await request(`${API_BASE_URL}/v1/tenants`, tenantsResponseSchema, {
      method: "GET"
    });
    return parsed.data;
  },

  async createTenant(input: z.infer<typeof createTenantInputSchema>) {
    const parsed = await request(`${API_BASE_URL}/v1/tenants`, createTenantResponseSchema, {
      method: "POST",
      body: JSON.stringify(input)
    });
    return parsed.data;
  },

  async getPendingInvitations() {
    const parsed = await request(`${API_BASE_URL}/v1/invitations`, tenantInvitationsResponseSchema, {
      method: "GET"
    });
    return parsed.data;
  },

  async acceptInvitation(invitationId: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/invitations/${invitationId}/accept`,
      acceptInvitationResponseSchema,
      {
        method: "POST"
      }
    );
    return parsed.data;
  },

  async getTenantMembers(tenantSlug: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/memberships`,
      tenantMembersResponseSchema,
      {
        method: "GET"
      }
    );
    return parsed.data;
  },

  async getTenantInvitations(tenantSlug: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/invitations`,
      tenantInvitationsResponseSchema,
      {
        method: "GET"
      }
    );
    return parsed.data;
  },

  async getGarminConnections(tenantSlug: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/integrations/garmin/connections`,
      garminConnectionsResponseSchema,
      {
        method: "GET"
      }
    );
    return parsed.data;
  },

  async getGarminIntegrationStatus(tenantSlug: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/integrations/garmin/status`,
      garminIntegrationStatusResponseSchema,
      {
        method: "GET"
      }
    );
    return parsed.data;
  },

  async createGarminConnectionSession(
    tenantSlug: string,
    input: z.infer<typeof createGarminConnectionSessionInputSchema>
  ) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/integrations/garmin/connection-sessions`,
      createGarminConnectionSessionResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
    return parsed.data;
  },

  async disconnectGarminConnection(tenantSlug: string, athleteId: string) {
    return request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/integrations/garmin/connections/${athleteId}`,
      createApiSuccessSchema(
        z.object({
          athleteId: z.string().uuid(),
          disconnected: z.boolean()
        })
      ),
      {
        method: "DELETE"
      }
    );
  },

  async inviteTenantMember(tenantSlug: string, input: z.infer<typeof inviteTenantMemberInputSchema>) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/invitations`,
      inviteTenantMemberResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
    return parsed.data;
  },

  async signInEmail(input: { email: string; password: string; rememberMe?: boolean }) {
    return request(`${AUTH_BASE_URL}/sign-in/email`, authSignInResponseSchema, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async signUpEmail(input: {
    name: string;
    email: string;
    password: string;
    rememberMe?: boolean;
  }) {
    return request(`${AUTH_BASE_URL}/sign-up/email`, authSignUpResponseSchema, {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  async signOut() {
    return request(`${AUTH_BASE_URL}/sign-out`, authSignOutResponseSchema, {
      method: "POST",
      body: JSON.stringify({})
    });
  }
};
