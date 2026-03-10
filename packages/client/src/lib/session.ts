import type { ActorSession, TenantMembership } from "@pulsi/shared";

export const getActiveMemberships = (session: ActorSession) =>
  session.memberships.filter((membership) => membership.status === "active");

export const hasActiveMemberships = (session: ActorSession) => getActiveMemberships(session).length > 0;

export const getDefaultMembership = (session: ActorSession): TenantMembership | null =>
  getActiveMemberships(session)[0] ?? null;

export const getDashboardPath = (tenantSlug: string) => `/${tenantSlug}/dashboard`;
export const getOrganizationSettingsPath = (tenantSlug: string) => `/${tenantSlug}/settings`;
export const getGarminIntegrationPath = (tenantSlug: string) => `/${tenantSlug}/integrations/garmin`;
export const getNoAccessPath = () => "/welcome";

export const getDefaultAppPath = (session: ActorSession) => {
  const membership = getDefaultMembership(session);
  return membership ? getDashboardPath(membership.tenantSlug) : getNoAccessPath();
};
