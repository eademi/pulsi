import { z } from "zod";

export const integrationProviderSchema = z.enum(["garmin"]);
export const syncStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "retryable_failure",
  "failed"
]);

export const athleteDeviceConnectionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  athleteId: z.string().uuid(),
  provider: integrationProviderSchema,
  providerAthleteId: z.string(),
  status: z.enum(["active", "revoked"]),
  lastSuccessfulSyncAt: z.string().datetime().nullable(),
  lastCursor: z.string().nullable()
});

export const syncJobSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  provider: integrationProviderSchema,
  status: syncStatusSchema,
  scheduledFor: z.string().datetime(),
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable()
});

export const triggerIntegrationSyncInputSchema = z.object({
  athleteId: z.string().uuid()
});

export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;
export type AthleteDeviceConnection = z.infer<typeof athleteDeviceConnectionSchema>;
export type SyncJob = z.infer<typeof syncJobSchema>;
