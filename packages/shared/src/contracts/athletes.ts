import { z } from "zod";

import {
  athleteSchema,
  athleteStatusSchema,
  readinessBandSchema,
  recoveryTrendSchema,
  trainingRecommendationSchema,
  wearableMetricsSchema
} from "./readiness";

export { athleteStatusSchema };

export const listAthletesQuerySchema = z.object({
  status: z.enum(["active", "inactive", "rehab", "all"]).default("active").optional(),
  squadId: z.string().uuid().optional(),
  squadSlug: z.string().min(1).max(64).optional()
});

export const createAthleteInputSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().trim().email(),
  externalRef: z.string().trim().min(1).max(120).nullable().optional(),
  position: z.string().trim().min(1).max(80).nullable().optional(),
  squadId: z.string().uuid(),
  status: athleteStatusSchema.default("active")
});

export const updateAthleteSquadInputSchema = z.object({
  squadId: z.string().uuid()
});

export const restoreAthleteInputSchema = z.object({
  squadId: z.string().uuid()
});

export const deleteAthleteResponseSchema = z.object({
  athleteId: z.string().uuid(),
  deleted: z.boolean()
});

export const athleteInviteStatusSchema = z.enum(["pending", "accepted", "revoked", "expired"]);

export const createAthleteInviteInputSchema = z.object({
  email: z.string().trim().email()
});

export const athleteInviteSchema = z.object({
  id: z.string().uuid(),
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  email: z.string().email(),
  status: athleteInviteStatusSchema,
  inviteUrl: z.string().url(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime()
});

export const athleteInviteDetailsSchema = z.object({
  token: z.string(),
  athleteId: z.string().uuid(),
  athleteName: z.string(),
  email: z.string().email(),
  tenantId: z.string().uuid(),
  tenantName: z.string(),
  tenantSlug: z.string(),
  currentSquad: athleteSchema.shape.currentSquad,
  expiresAt: z.string().datetime()
});

export const athletePortalSchema = z.object({
  athlete: athleteSchema,
  latestSnapshot: z.object({
    readinessBand: readinessBandSchema.nullable(),
    readinessScore: z.number().int().min(0).max(100).nullable(),
    recommendation: trainingRecommendationSchema.nullable(),
    recoveryTrend: recoveryTrendSchema.nullable(),
    snapshotDate: z.string().date().nullable(),
    rationale: z.array(z.string()),
    metrics: wearableMetricsSchema.nullable()
  }),
  trendSummary: z.object({
    windowDays: z.number().int().positive(),
    daysWithData: z.number().int().nonnegative(),
    averageReadinessScore: z.number().min(0).max(100).nullable(),
    readinessDelta: z.number().nullable(),
    averageSleepDurationMinutes: z.number().nonnegative().nullable(),
    averageHrvNightlyMs: z.number().nonnegative().nullable(),
    bandCounts: z.object({
      ready: z.number().int().nonnegative(),
      caution: z.number().int().nonnegative(),
      restricted: z.number().int().nonnegative()
    })
  }),
  recentSnapshots: z.array(
    z.object({
      snapshotDate: z.string().date(),
      readinessScore: z.number().int().min(0).max(100),
      readinessBand: readinessBandSchema
    })
  ),
  syncStatus: z.object({
    garminConnected: z.boolean(),
    lastSuccessfulSyncAt: z.string().datetime().nullable(),
    lastPermissionsSyncAt: z.string().datetime().nullable()
  }),
  garminConnected: z.boolean()
});

export const createAthleteResponseSchema = z.object({
  athlete: athleteSchema,
  invite: athleteInviteSchema
});

export type ListAthletesQuery = z.infer<typeof listAthletesQuerySchema>;
export type CreateAthleteInput = z.infer<typeof createAthleteInputSchema>;
export type UpdateAthleteSquadInput = z.infer<typeof updateAthleteSquadInputSchema>;
export type RestoreAthleteInput = z.infer<typeof restoreAthleteInputSchema>;
export type CreateAthleteInviteInput = z.infer<typeof createAthleteInviteInputSchema>;
export type AthleteInvite = z.infer<typeof athleteInviteSchema>;
export type AthleteInviteDetails = z.infer<typeof athleteInviteDetailsSchema>;
export type AthletePortal = z.infer<typeof athletePortalSchema>;
