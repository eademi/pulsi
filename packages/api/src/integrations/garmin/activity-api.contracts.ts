import { z } from "zod";

const garminCalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const garminTimestampSchema = z.number().finite();
const garminIdentifierSchema = z.union([z.string().min(1), z.number().finite()]).transform(String);
const garminPushUserIdSchema = z.string().min(1);

export const garminActivityNotificationSummaryTypeSchema = z.enum(["activitySummaries"]);

export const garminActivityPingNotificationItemSchema = z.object({
  userId: garminPushUserIdSchema,
  callbackURL: z.string().url().optional()
});

const garminActivitySummaryBaseSchema = z
  .object({
    summaryId: garminIdentifierSchema.optional(),
    activityId: garminIdentifierSchema.optional(),
    calendarDate: garminCalendarDateSchema.optional(),
    activityName: z.string().optional(),
    activityType: z.string().optional(),
    startTimeInSeconds: garminTimestampSchema.optional(),
    startTimeOffsetInSeconds: garminTimestampSchema.optional(),
    durationInSeconds: z.number().int().optional(),
    distanceInMeters: z.number().finite().optional(),
    activeKilocalories: z.number().int().optional(),
    averageHeartRateInBeatsPerMinute: z.number().int().optional(),
    maxHeartRateInBeatsPerMinute: z.number().int().optional(),
    averageSpeedInMetersPerSecond: z.number().finite().optional(),
    maxSpeedInMetersPerSecond: z.number().finite().optional(),
    averageRunCadenceInStepsPerMinute: z.number().finite().optional(),
    maxRunCadenceInStepsPerMinute: z.number().finite().optional(),
    totalElevationGainInMeters: z.number().finite().optional(),
    totalElevationLossInMeters: z.number().finite().optional(),
    elevationGainInMeters: z.number().finite().optional(),
    elevationLossInMeters: z.number().finite().optional(),
    deviceName: z.string().optional(),
    isManual: z.boolean().optional(),
    manual: z.boolean().optional(),
    isWebUpload: z.boolean().optional(),
    webUpload: z.boolean().optional()
  })
  .passthrough();

export const garminActivitySummarySchema = garminActivitySummaryBaseSchema.superRefine(
  (value, context) => {
    if (!value.summaryId && !value.activityId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Activity summary must include summaryId or activityId"
      });
    }
  }
);

export const garminActivityPushSummarySchema = garminActivitySummaryBaseSchema.extend({
  userId: garminPushUserIdSchema
}).superRefine((value, context) => {
  if (!value.summaryId && !value.activityId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Activity summary must include summaryId or activityId"
    });
  }
});

export const garminActivityPushSchema = z
  .object({
    activitySummaries: z.array(garminActivityPushSummarySchema).optional()
  })
  .passthrough();

export const garminActivityPingSchema = z
  .object({
    activitySummaries: z.array(garminActivityPingNotificationItemSchema).optional()
  })
  .passthrough();

export const garminActivityCallbackResponseSchemas = {
  activitySummaries: z.array(garminActivitySummarySchema)
} satisfies Record<GarminActivityNotificationSummaryType, z.ZodTypeAny>;

export const parseGarminActivityCallbackPayload = (
  summaryType: GarminActivityNotificationSummaryType,
  payload: unknown
) => garminActivityCallbackResponseSchemas[summaryType].parse(payload);

export type GarminActivityNotificationSummaryType = z.infer<
  typeof garminActivityNotificationSummaryTypeSchema
>;
export type GarminActivitySummary = z.infer<typeof garminActivitySummarySchema>;
export type GarminActivityPushSummary = z.infer<typeof garminActivityPushSummarySchema>;
export type GarminActivityPushPayload = z.infer<typeof garminActivityPushSchema>;
export type GarminActivityPingPayload = z.infer<typeof garminActivityPingSchema>;
