import type { TenantRole } from "../contracts/auth";

export type TenantCapability =
  | "activities:view"
  | "athletes:manage"
  | "athletes:view"
  | "garmin:manage"
  | "readiness:view"
  | "squads:manage"
  | "squads:view"
  | "staff:manage";

const roleCapabilities: Record<TenantRole, ReadonlySet<TenantCapability>> = {
  club_owner: new Set([
    "activities:view",
    "athletes:manage",
    "athletes:view",
    "garmin:manage",
    "readiness:view",
    "squads:manage",
    "squads:view",
    "staff:manage"
  ]),
  org_admin: new Set([
    "activities:view",
    "athletes:manage",
    "athletes:view",
    "garmin:manage",
    "readiness:view",
    "squads:manage",
    "squads:view",
    "staff:manage"
  ]),
  coach: new Set([
    "activities:view",
    "athletes:manage",
    "athletes:view",
    "readiness:view",
    "squads:view"
  ]),
  performance_staff: new Set([
    "activities:view",
    "athletes:view",
    "garmin:manage",
    "readiness:view",
    "squads:view"
  ]),
  analyst: new Set(["activities:view", "athletes:view", "readiness:view", "squads:view"])
};

export const hasTenantCapability = (role: TenantRole, capability: TenantCapability) =>
  roleCapabilities[role].has(capability);
