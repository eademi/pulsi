import { z } from "zod";

import {
  athleteGarminConnectionSchema,
  athleteDeviceConnectionSchema,
  athleteClaimDetailsSchema,
  athleteClaimLinkSchema,
  athletePortalSchema,
  athleteSchema,
  createAthleteClaimLinkInputSchema,
  actorSessionSchema,
  athleteReadinessSchema,
  createAthleteInputSchema,
  createApiSuccessSchema,
  createSquadInputSchema,
  createTenantInputSchema,
  createGarminConnectionSessionInputSchema,
  deleteAthleteResponseSchema,
  garminConnectionSessionSchema,
  garminIntegrationStatusSchema,
  inviteTenantMemberInputSchema,
  listSquadsQuerySchema,
  listAthletesQuerySchema,
  restoreAthleteInputSchema,
  squadSchema,
  tenantInvitationSchema,
  tenantMemberSchema,
  tenantSchema,
  updateAthleteSquadInputSchema,
  updateTenantMemberAccessInputSchema
} from "@pulsi/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;

const sessionResponseSchema = createApiSuccessSchema(actorSessionSchema);
const readinessResponseSchema = createApiSuccessSchema(athleteReadinessSchema.array());
const athletesResponseSchema = createApiSuccessSchema(athleteSchema.array());
const athleteClaimLinkResponseSchema = createApiSuccessSchema(athleteClaimLinkSchema);
const athleteClaimDetailsResponseSchema = createApiSuccessSchema(athleteClaimDetailsSchema);
const athletePortalResponseSchema = createApiSuccessSchema(athletePortalSchema);
const athleteGarminConnectionResponseSchema = createApiSuccessSchema(athleteGarminConnectionSchema);
const tenantsResponseSchema = createApiSuccessSchema(tenantSchema.array());
const createTenantResponseSchema = createApiSuccessSchema(tenantSchema);
const tenantMembersResponseSchema = createApiSuccessSchema(tenantMemberSchema.array());
const tenantInvitationsResponseSchema = createApiSuccessSchema(tenantInvitationSchema.array());
const inviteTenantMemberResponseSchema = createApiSuccessSchema(tenantInvitationSchema);
const squadsResponseSchema = createApiSuccessSchema(squadSchema.array());
const squadResponseSchema = createApiSuccessSchema(squadSchema);
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

  async getTenantAthletes(
    tenantSlug: string,
    query: Partial<z.infer<typeof listAthletesQuerySchema>> = {}
  ) {
    const search = new URLSearchParams();
    if (query.status) {
      search.set("status", query.status);
    }
    if (query.squadId) {
      search.set("squadId", query.squadId);
    }
    if (query.squadSlug) {
      search.set("squadSlug", query.squadSlug);
    }

    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes${search.size > 0 ? `?${search.toString()}` : ""}`,
      athletesResponseSchema,
      {
        method: "GET"
      }
    );

    return parsed.data;
  },

  async createAthlete(tenantSlug: string, input: z.infer<typeof createAthleteInputSchema>) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes`,
      createApiSuccessSchema(athleteSchema),
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );

    return parsed.data;
  },

  async updateAthleteSquad(
    tenantSlug: string,
    athleteId: string,
    input: z.infer<typeof updateAthleteSquadInputSchema>
  ) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes/${athleteId}/squad`,
      createApiSuccessSchema(athleteSchema),
      {
        method: "PATCH",
        body: JSON.stringify(input)
      }
    );

    return parsed.data;
  },

  async archiveAthlete(tenantSlug: string, athleteId: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes/${athleteId}/archive`,
      createApiSuccessSchema(athleteSchema),
      {
        method: "PATCH"
      }
    );

    return parsed.data;
  },

  async restoreAthlete(
    tenantSlug: string,
    athleteId: string,
    input: z.infer<typeof restoreAthleteInputSchema>
  ) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes/${athleteId}/restore`,
      createApiSuccessSchema(athleteSchema),
      {
        method: "PATCH",
        body: JSON.stringify(input)
      }
    );

    return parsed.data;
  },

  async deleteAthlete(tenantSlug: string, athleteId: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes/${athleteId}`,
      createApiSuccessSchema(deleteAthleteResponseSchema),
      {
        method: "DELETE"
      }
    );

    return parsed.data;
  },

  async createAthleteClaimLink(
    tenantSlug: string,
    athleteId: string,
    input: z.infer<typeof createAthleteClaimLinkInputSchema>
  ) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/athletes/${athleteId}/claim-links`,
      athleteClaimLinkResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );

    return parsed.data;
  },

  async getAthleteClaim(token: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/athlete-claims/${token}`,
      athleteClaimDetailsResponseSchema,
      {
        method: "GET"
      }
    );

    return parsed.data;
  },

  async acceptAthleteClaim(token: string) {
    const parsed = await request(
      `${API_BASE_URL}/v1/athlete-claims/${token}/accept`,
      createApiSuccessSchema(
        z.object({
          accepted: z.boolean()
        })
      ),
      {
        method: "POST"
      }
    );

    return parsed.data;
  },

  async getAthletePortal() {
    const parsed = await request(`${API_BASE_URL}/v1/me/athlete`, athletePortalResponseSchema, {
      method: "GET"
    });

    return parsed.data;
  },

  async getAthleteGarminConnection() {
    const parsed = await request(
      `${API_BASE_URL}/v1/me/athlete/garmin`,
      athleteGarminConnectionResponseSchema,
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

  async updateTenantMemberAccess(
    tenantSlug: string,
    userId: string,
    input: z.infer<typeof updateTenantMemberAccessInputSchema>
  ) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/memberships/${userId}/access`,
      createApiSuccessSchema(tenantMemberSchema),
      {
        method: "PATCH",
        body: JSON.stringify(input)
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

  async getTenantSquads(
    tenantSlug: string,
    query: z.infer<typeof listSquadsQuerySchema> = { status: "active" }
  ) {
    const search = new URLSearchParams();
    if (query.status) {
      search.set("status", query.status);
    }

    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/squads?${search.toString()}`,
      squadsResponseSchema,
      {
        method: "GET"
      }
    );

    return parsed.data;
  },

  async createSquad(tenantSlug: string, input: z.infer<typeof createSquadInputSchema>) {
    const parsed = await request(
      `${API_BASE_URL}/v1/tenants/${tenantSlug}/squads`,
      squadResponseSchema,
      {
        method: "POST",
        body: JSON.stringify(input)
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

  async createAthleteGarminConnectionSession() {
    const parsed = await request(
      `${API_BASE_URL}/v1/me/athlete/garmin/connection-sessions`,
      createGarminConnectionSessionResponseSchema,
      {
        method: "POST",
        body: JSON.stringify({})
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

  async disconnectAthleteGarminConnection() {
    return request(
      `${API_BASE_URL}/v1/me/athlete/garmin`,
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
