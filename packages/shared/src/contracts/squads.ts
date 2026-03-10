import { z } from "zod";

export const tenantAccessScopeSchema = z.enum(["all_squads", "assigned_squads"]);
export const squadStatusSchema = z.enum(["active", "inactive"]);

export const squadSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(120)
});

export const squadSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  category: z.string().nullable(),
  status: squadStatusSchema,
  athleteCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime()
});

export const createSquadInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(2)
    .max(64)
    .optional(),
  category: z.string().trim().min(1).max(80).nullable().optional()
});

export type TenantAccessScope = z.infer<typeof tenantAccessScopeSchema>;
export type SquadStatus = z.infer<typeof squadStatusSchema>;
export type SquadSummary = z.infer<typeof squadSummarySchema>;
export type Squad = z.infer<typeof squadSchema>;
export type CreateSquadInput = z.infer<typeof createSquadInputSchema>;
