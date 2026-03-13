import type { ActorSession, TenantMembership } from "@pulsi/shared";

export const getActiveMemberships = (session: ActorSession) =>
  session.memberships.filter((membership) => membership.status === "active");

export const hasActiveMemberships = (session: ActorSession) => getActiveMemberships(session).length > 0;

export const getDefaultMembership = (session: ActorSession): TenantMembership | null =>
  getActiveMemberships(session)[0] ?? null;

export const getDashboardPath = (tenantSlug: string) => `/${tenantSlug}/dashboard`;
export const getPlayersPath = (tenantSlug: string) => `/${tenantSlug}/players`;
export const getSquadsPath = (tenantSlug: string) => `/${tenantSlug}/squads`;
export const getOrganizationSettingsPath = (tenantSlug: string) => `/${tenantSlug}/settings`;
export const getGarminIntegrationPath = (tenantSlug: string) => `/${tenantSlug}/integrations/garmin`;
export const getSessionPlannerPath = (tenantSlug: string) => `/${tenantSlug}/session-planner`;
export const getReportsPath = (tenantSlug: string) => `/${tenantSlug}/reports`;
export const getAthleteHomePath = () => "/athlete";
export const getAthleteSetupPath = (token: string) => `/athlete/setup/${token}`;
export const getNoAccessPath = () => "/welcome";

export const getDefaultAppPath = (session: ActorSession) => {
  if (session.actorType === "athlete") {
    return getAthleteHomePath();
  }

  const membership = getDefaultMembership(session);
  return membership ? getDashboardPath(membership.tenantSlug) : getNoAccessPath();
};
