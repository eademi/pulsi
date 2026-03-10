import { z } from "zod";

export const integrationProviderSchema = z.enum(["garmin"]);
export const syncStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "retryable_failure",
  "failed"
]);
export const garminOauthSessionStatusSchema = z.enum([
  "pending",
  "completed",
  "expired",
  "failed"
]);
export const webhookEventStatusSchema = z.enum(["received", "processed", "ignored", "failed"]);

export const athleteDeviceConnectionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  athleteId: z.string().uuid(),
  provider: integrationProviderSchema,
  providerUserId: z.string(),
  status: z.enum(["active", "revoked"]),
  lastSuccessfulSyncAt: z.string().datetime().nullable(),
  lastCursor: z.string().nullable(),
  grantedPermissions: z.array(z.string()),
  lastPermissionsSyncAt: z.string().datetime().nullable(),
  lastPermissionChangeAt: z.string().datetime().nullable()
});

export const createGarminConnectionSessionInputSchema = z.object({
  athleteId: z.string().uuid()
});

export const garminConnectionSessionSchema = z.object({
  authorizationUrl: z.string().url(),
  state: z.string(),
  expiresAt: z.string().datetime()
});

export const garminOauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});

export const disconnectGarminConnectionInputSchema = z.object({
  athleteId: z.string().uuid()
});

export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;
export type AthleteDeviceConnection = z.infer<typeof athleteDeviceConnectionSchema>;
export type GarminConnectionSession = z.infer<typeof garminConnectionSessionSchema>;
