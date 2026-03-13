import type { Logger } from "pino";

import type {
  AthleteActorProfile,
  SquadSummary,
  TenantAccessScope,
  TenantRole
} from "@pulsi/shared";

export interface TenantMembershipRecord {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: TenantRole;
  status: "active" | "invited" | "disabled";
  accessScope: TenantAccessScope;
  assignedSquads: SquadSummary[];
}

interface BaseAuthenticatedActor {
  actorType: "staff" | "athlete";
  userId: string;
  email: string;
  name: string;
  image?: string | null;
  sessionId: string;
  sessionExpiresAt: string;
}

export interface StaffAuthenticatedActor extends BaseAuthenticatedActor {
  actorType: "staff";
  memberships: TenantMembershipRecord[];
  athleteProfile: null;
}

export interface AthleteAuthenticatedActor extends BaseAuthenticatedActor {
  actorType: "athlete";
  memberships: [];
  athleteProfile: AthleteActorProfile;
}

export type AuthenticatedActor = StaffAuthenticatedActor | AthleteAuthenticatedActor;

export interface AuthenticatedIdentity {
  userId: string;
  email: string;
  name: string;
  image?: string | null;
  sessionId: string;
  sessionExpiresAt: string;
}

export interface AuthenticatedAdminIdentity {
  userId: string;
  email: string;
  name: string;
  image?: string | null;
  sessionId: string;
  sessionExpiresAt: string;
  role: "platform_admin" | "support" | "manager";
  status: "active" | "disabled";
}

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  role: TenantRole;
  accessScope: TenantAccessScope;
  accessibleSquadIds: string[];
  assignedSquads: SquadSummary[];
}

export interface RequestContext {
  requestId: string;
  logger: Logger;
  now: Date;
  identity: AuthenticatedIdentity | null;
  actor: AuthenticatedActor | null;
  actorResolutionError: Error | null;
  tenant: TenantContext | null;
}

export interface AdminContext {
  requestId: string;
  logger: Logger;
  now: Date;
  identity: AuthenticatedAdminIdentity | null;
}

export type AppBindings = {
  Variables: {
    requestContext: RequestContext;
    adminContext: AdminContext;
  };
};
