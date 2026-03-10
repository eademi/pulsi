import { z } from "zod";

import { athleteSchema } from "./readiness";
import { integrationProviderSchema } from "./integrations";

export const activitySummarySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  athleteId: z.string().uuid(),
  provider: integrationProviderSchema,
  providerActivityId: z.string(),
  summaryType: z.string(),
  activityDate: z.string().date().nullable(),
  activityType: z.string().nullable(),
  activityName: z.string().nullable(),
  startTimeInSeconds: z.number().int().nullable(),
  durationInSeconds: z.number().int().nullable(),
  distanceInMeters: z.number().nonnegative().nullable(),
  activeKilocalories: z.number().int().nonnegative().nullable(),
  averageHeartRate: z.number().int().nonnegative().nullable(),
  maxHeartRate: z.number().int().nonnegative().nullable(),
  averageSpeedMetersPerSecond: z.number().nonnegative().nullable(),
  maxSpeedMetersPerSecond: z.number().nonnegative().nullable(),
  averageCadenceStepsPerMinute: z.number().nonnegative().nullable(),
  maxCadenceStepsPerMinute: z.number().nonnegative().nullable(),
  elevationGainInMeters: z.number().nullable(),
  elevationLossInMeters: z.number().nullable(),
  deviceName: z.string().nullable(),
  isManual: z.boolean(),
  isWebUpload: z.boolean(),
  ingestedAt: z.string().datetime()
});

export const athleteActivitySummarySchema = z.object({
  athlete: athleteSchema,
  activities: z.array(activitySummarySchema)
});

export const listAthleteActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional()
});

export type ActivitySummary = z.infer<typeof activitySummarySchema>;
export type AthleteActivitySummary = z.infer<typeof athleteActivitySummarySchema>;
export type ListAthleteActivitiesQuery = z.infer<typeof listAthleteActivitiesQuerySchema>;
