import { z } from "zod";

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

export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantInputSchema>;
