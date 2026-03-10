import type { Logger } from "pino";

import type { TenantRole } from "@pulsi/shared";

export interface TenantMembershipRecord {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: TenantRole;
  status: "active" | "invited" | "disabled";
}

export interface AuthenticatedActor {
  userId: string;
  email: string;
  name: string;
  image?: string | null;
  sessionId: string;
  sessionExpiresAt: string;
  memberships: TenantMembershipRecord[];
}

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  role: TenantRole;
}

export interface RequestContext {
  requestId: string;
  logger: Logger;
  now: Date;
  actor: AuthenticatedActor | null;
  tenant: TenantContext | null;
}

export type AppBindings = {
  Variables: {
    requestContext: RequestContext;
  };
};
