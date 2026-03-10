import { z } from "zod";
import { squadSummarySchema, tenantAccessScopeSchema } from "./squads";

export const tenantRoleSchema = z.enum([
  "club_owner",
  "coach",
  "performance_staff",
  "analyst"
]);

export const membershipStatusSchema = z.enum(["active", "invited", "disabled"]);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().url().nullable().optional()
});

export const sessionSchema = z.object({
  id: z.string(),
  expiresAt: z.string().datetime()
});

export const tenantMembershipSchema = z.object({
  tenantId: z.string().uuid(),
  tenantSlug: z.string(),
  tenantName: z.string(),
  role: tenantRoleSchema,
  status: membershipStatusSchema,
  accessScope: tenantAccessScopeSchema,
  assignedSquads: z.array(squadSummarySchema)
});

export const actorSessionSchema = z.object({
  user: authUserSchema,
  session: sessionSchema,
  memberships: z.array(tenantMembershipSchema)
});

export type TenantRole = z.infer<typeof tenantRoleSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type ActorSession = z.infer<typeof actorSessionSchema>;
export type TenantMembership = z.infer<typeof tenantMembershipSchema>;
