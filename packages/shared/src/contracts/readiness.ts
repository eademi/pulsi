import { z } from "zod";
import { squadSummarySchema } from "./squads";

export const athleteStatusSchema = z.enum(["active", "inactive", "rehab"]);
export const athleteAccountStateSchema = z.enum(["unlinked", "invited", "linked"]);
export const athleteAccountDetailsSchema = z.object({
  userId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  linkedAt: z.string().datetime().nullable(),
  pendingEmail: z.string().email().nullable(),
  pendingExpiresAt: z.string().datetime().nullable()
});
export const readinessBandSchema = z.enum(["ready", "caution", "restricted"]);
export const trainingRecommendationSchema = z.enum([
  "full_load",
  "reduced_load",
  "monitor",
  "recovery_focus"
]);
export const recoveryTrendSchema = z.enum(["stable", "improving", "declining"]);

export const athleteSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  currentSquad: squadSummarySchema.nullable(),
  position: z.string().nullable(),
  status: athleteStatusSchema,
  accountState: athleteAccountStateSchema,
  accountDetails: athleteAccountDetailsSchema.nullable(),
  externalRef: z.string().nullable(),
  createdAt: z.string().datetime()
});

export const wearableMetricsSchema = z.object({
  metricDate: z.string().date(),
  restingHeartRate: z.number().int().nonnegative().nullable(),
  hrvNightlyMs: z.number().nonnegative().nullable(),
  sleepDurationMinutes: z.number().int().nonnegative().nullable(),
  sleepScore: z.number().int().min(0).max(100).nullable(),
  bodyBatteryHigh: z.number().int().min(0).max(100).nullable(),
  bodyBatteryLow: z.number().int().min(0).max(100).nullable(),
  stressAverage: z.number().min(0).max(100).nullable(),
  trainingReadiness: z.number().int().min(0).max(100).nullable()
});

export const readinessSnapshotSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  athleteId: z.string().uuid(),
  snapshotDate: z.string().date(),
  readinessScore: z.number().int().min(0).max(100),
  readinessBand: readinessBandSchema,
  recommendation: trainingRecommendationSchema,
  recoveryTrend: recoveryTrendSchema,
  rationale: z.array(z.string()).min(1),
  metrics: wearableMetricsSchema,
  createdAt: z.string().datetime()
});

export const athleteReadinessSchema = z.object({
  athlete: athleteSchema,
  latestSnapshot: readinessSnapshotSchema.nullable()
});

export const listReadinessQuerySchema = z.object({
  onDate: z.string().date().optional(),
  squadId: z.string().uuid().optional(),
  squadSlug: z.string().min(1).max(64).optional(),
  squad: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export type Athlete = z.infer<typeof athleteSchema>;
export type AthleteAccountState = z.infer<typeof athleteAccountStateSchema>;
export type AthleteAccountDetails = z.infer<typeof athleteAccountDetailsSchema>;
export type ReadinessSnapshot = z.infer<typeof readinessSnapshotSchema>;
export type AthleteReadiness = z.infer<typeof athleteReadinessSchema>;
export type ListReadinessQuery = z.infer<typeof listReadinessQuerySchema>;
export type TrainingRecommendation = z.infer<typeof trainingRecommendationSchema>;
export type ReadinessBand = z.infer<typeof readinessBandSchema>;
