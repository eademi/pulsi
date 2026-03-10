import type { TenantMembership } from "@pulsi/shared";

export const useTenantMembership = (memberships: TenantMembership[], tenantSlug: string) =>
  memberships.find((membership) => membership.tenantSlug === tenantSlug) ?? null;
