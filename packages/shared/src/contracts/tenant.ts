import { z } from "zod";
import { membershipStatusSchema, tenantRoleSchema } from "./auth";
import { squadSummarySchema, tenantAccessScopeSchema } from "./squads";

export const tenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  timezone: z.string().min(2).max(64),
  createdAt: z.string().datetime()
});

export const createTenantInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(64),
  timezone: z.string().min(2).max(64)
});

export const invitationStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);

export const inviteTenantMemberInputSchema = z.object({
  email: z.string().email(),
  role: tenantRoleSchema
});

export const tenantMemberSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: tenantRoleSchema,
  status: membershipStatusSchema,
  accessScope: tenantAccessScopeSchema,
  assignedSquads: z.array(squadSummarySchema),
  isDefaultTenant: z.boolean(),
  joinedAt: z.string().datetime()
});

export const listSquadsQuerySchema = z.object({
  status: z.enum(["active", "inactive", "all"]).default("active")
});

export const tenantInvitationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantSlug: z.string(),
  tenantName: z.string(),
  email: z.string().email(),
  role: tenantRoleSchema,
  status: invitationStatusSchema,
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable().optional()
});

export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantInputSchema>;
export type InviteTenantMemberInput = z.infer<typeof inviteTenantMemberInputSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;
export type TenantMember = z.infer<typeof tenantMemberSchema>;
export type TenantInvitation = z.infer<typeof tenantInvitationSchema>;
export type ListSquadsQuery = z.infer<typeof listSquadsQuerySchema>;
