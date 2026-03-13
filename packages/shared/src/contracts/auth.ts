import { z } from "zod";
import { squadSummarySchema, tenantAccessScopeSchema } from "./squads";
import { athleteStatusSchema } from "./athletes";

export const tenantRoleSchema = z.enum([
  "club_owner",
  "org_admin",
  "coach",
  "performance_staff",
  "analyst"
]);

export const membershipStatusSchema = z.enum(["active", "invited", "disabled"]);
export const actorTypeSchema = z.enum(["staff", "athlete"]);

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

export const athleteActorProfileSchema = z.object({
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  tenantId: z.string().uuid(),
  tenantSlug: z.string(),
  tenantName: z.string(),
  timezone: z.string(),
  status: athleteStatusSchema,
  currentSquad: squadSummarySchema.nullable()
});

const baseActorSessionSchema = z.object({
  platformAdmin: z.boolean(),
  user: authUserSchema,
  session: sessionSchema
});

export const staffActorSessionSchema = baseActorSessionSchema.extend({
  actorType: z.literal("staff"),
  memberships: z.array(tenantMembershipSchema),
  athleteProfile: z.null()
});

export const athleteActorSessionSchema = baseActorSessionSchema.extend({
  actorType: z.literal("athlete"),
  memberships: z.array(tenantMembershipSchema).max(0),
  athleteProfile: athleteActorProfileSchema
});

export const actorSessionSchema = z.discriminatedUnion("actorType", [
  staffActorSessionSchema,
  athleteActorSessionSchema
]);

export type TenantRole = z.infer<typeof tenantRoleSchema>;
export type MembershipStatus = z.infer<typeof membershipStatusSchema>;
export type ActorType = z.infer<typeof actorTypeSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type ActorSession = z.infer<typeof actorSessionSchema>;
export type TenantMembership = z.infer<typeof tenantMembershipSchema>;
export type AthleteActorProfile = z.infer<typeof athleteActorProfileSchema>;
