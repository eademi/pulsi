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

export type TenantAccessScope = z.infer<typeof tenantAccessScopeSchema>;
export type SquadStatus = z.infer<typeof squadStatusSchema>;
export type SquadSummary = z.infer<typeof squadSummarySchema>;
export type Squad = z.infer<typeof squadSchema>;
