import { z } from "zod";

import { garminOauthSessionStatusSchema, syncStatusSchema, webhookEventStatusSchema } from "./integrations";

export const adminViewerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().url().nullable().optional(),
  role: z.enum(["platform_admin", "support", "manager"])
});

export const garminAdminConfigSchema = z.object({
  configured: z.boolean(),
  oauthRedirectUri: z.string().url(),
  apiBaseUrl: z.string().url()
});

export const garminAdminOauthSessionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantName: z.string(),
  tenantSlug: z.string(),
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  status: garminOauthSessionStatusSchema,
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable()
});

export const garminAdminConnectionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantName: z.string(),
  tenantSlug: z.string(),
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  providerUserId: z.string(),
  status: z.enum(["active", "revoked"]),
  grantedPermissions: z.array(z.string()),
  accessTokenExpiresAt: z.string().datetime().nullable(),
  refreshTokenExpiresAt: z.string().datetime().nullable(),
  lastSuccessfulSyncAt: z.string().datetime().nullable(),
  lastPermissionsSyncAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const garminAdminSyncJobSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  tenantName: z.string(),
  tenantSlug: z.string(),
  athleteId: z.string().uuid().nullable(),
  athleteName: z.string().nullable(),
  connectionId: z.string().uuid().nullable(),
  status: syncStatusSchema,
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  scheduledFor: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const garminAdminWebhookEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  tenantName: z.string().nullable(),
  tenantSlug: z.string().nullable(),
  connectionId: z.string().uuid().nullable(),
  providerUserId: z.string().nullable(),
  notificationType: z.string(),
  deliveryMethod: z.enum(["push", "ping", "oauth"]),
  status: webhookEventStatusSchema,
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  receivedAt: z.string().datetime(),
  processedAt: z.string().datetime().nullable()
});

export const garminAdminOverviewSchema = z.object({
  viewer: adminViewerSchema,
  config: garminAdminConfigSchema,
  oauthSessions: z.array(garminAdminOauthSessionSchema),
  connections: z.array(garminAdminConnectionSchema),
  syncJobs: z.array(garminAdminSyncJobSchema),
  webhookEvents: z.array(garminAdminWebhookEventSchema)
});

export const garminAdminBackfillRerunSchema = z.object({
  connectionId: z.string().uuid(),
  scheduled: z.boolean()
});

export type GarminAdminOverview = z.infer<typeof garminAdminOverviewSchema>;
