import { z } from "zod";

const garminCalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const garminTimestampSchema = z.number().finite();
const garminNumberMapSchema = z.record(z.string(), z.number().finite());
const garminTimeRangeSchema = z.object({
  startTimeInSeconds: garminTimestampSchema,
  endTimeInSeconds: garminTimestampSchema
});
const garminSummaryIdSchema = z.string().min(1);
const garminPushUserIdSchema = z.string().min(1);

export const garminNotificationSummaryTypeSchema = z.enum([
  "dailies",
  "epochs",
  "sleeps",
  "bodyComps",
  "stressDetails",
  "userMetrics",
  "pulseox",
  "allDayRespiration",
  "healthSnapshot",
  "hrv",
  "bloodPressures",
  "skinTemp"
]);

export const garminBackfillSummaryTypeSchema = z.enum([
  "dailies",
  "epochs",
  "sleeps",
  "bodyComps",
  "stressDetails",
  "userMetrics",
  "pulseOx",
  "respiration",
  "healthSnapshot",
  "hrv",
  "bloodPressures",
  "skinTemp"
]);

export const garminPingNotificationItemSchema = z.object({
  userId: garminPushUserIdSchema,
  callbackURL: z.string().url().optional()
});

export const garminHealthBackfillQuerySchema = z.object({
  summaryStartTimeInSeconds: garminTimestampSchema,
  summaryEndTimeInSeconds: garminTimestampSchema
});

export const garminDailySummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  startTimeInSeconds: garminTimestampSchema,
  startTimeOffsetInSeconds: garminTimestampSchema,
  activityType: z.string().optional(),
  durationInSeconds: garminTimestampSchema,
  steps: z.number().int().optional(),
  pushes: z.number().int().optional(),
  distanceInMeters: z.number().finite().optional(),
  pushDistanceInMeters: z.number().finite().optional(),
  activeTimeInSeconds: z.number().int().optional(),
  activeKilocalories: z.number().int().optional(),
  bmrKilocalories: z.number().int().optional(),
  moderateIntensityDurationInSeconds: z.number().int().optional(),
  vigorousIntensityDurationInSeconds: z.number().int().optional(),
  floorsClimbed: z.number().int().optional(),
  minHeartRateInBeatsPerMinute: z.number().int().optional(),
  averageHeartRateInBeatsPerMinute: z.number().int().optional(),
  maxHeartRateInBeatsPerMinute: z.number().int().optional(),
  restingHeartRateInBeatsPerMinute: z.number().int().optional(),
  timeOffsetHeartRateSamples: garminNumberMapSchema.optional(),
  averageStressLevel: z.number().int().optional(),
  maxStressLevel: z.number().int().optional(),
  stressDurationInSeconds: z.number().int().optional(),
  restStressDurationInSeconds: z.number().int().optional(),
  activityStressDurationInSeconds: z.number().int().optional(),
  lowStressDurationInSeconds: z.number().int().optional(),
  mediumStressDurationInSeconds: z.number().int().optional(),
  highStressDurationInSeconds: z.number().int().optional(),
  stressQualifier: z.string().optional(),
  bodyBatteryChargedValue: z.number().int().optional(),
  bodyBatteryDrainedValue: z.number().int().optional(),
  stepsGoal: z.number().int().optional(),
  pushesGoal: z.number().int().optional(),
  intensityDurationGoalInSeconds: z.number().int().optional(),
  floorsClimbedGoal: z.number().int().optional()
});

export const garminEpochSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  startTimeInSeconds: garminTimestampSchema,
  startTimeOffsetInSeconds: garminTimestampSchema,
  activityType: z.string(),
  durationInSeconds: z.number().int(),
  activeTimeInSeconds: z.number().int().optional(),
  steps: z.number().int().optional(),
  pushes: z.number().int().optional(),
  distanceInMeters: z.number().finite().optional(),
  pushDistanceInMeters: z.number().finite().optional(),
  activeKilocalories: z.number().int().optional(),
  met: z.number().finite().optional(),
  intensity: z.string().optional(),
  meanMotionIntensity: z.number().finite().optional(),
  maxMotionIntensity: z.number().finite().optional()
});

export const garminSleepValidationSchema = z.enum([
  "MANUAL",
  "DEVICE",
  "OFF_WRIST",
  "AUTO_TENTATIVE",
  "AUTO_FINAL",
  "AUTO_MANUAL",
  "ENHANCED_TENTATIVE",
  "ENHANCED_FINAL"
]);

export const garminNapValidationSchema = z.enum(["MANUAL", "DEVICE"]);
export const garminSleepScoreQualifierSchema = z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]);

export const garminSleepScoreValueSchema = z.object({
  qualifierKey: garminSleepScoreQualifierSchema,
  value: z.number().int().optional()
});

export const garminSleepLevelRangesSchema = z.object({
  deep: z.array(garminTimeRangeSchema).optional(),
  light: z.array(garminTimeRangeSchema).optional(),
  rem: z.array(garminTimeRangeSchema).optional(),
  awake: z.array(garminTimeRangeSchema).optional()
});

export const garminSleepNapSchema = z.object({
  napDurationInSeconds: z.number().int(),
  napStartTimeInSeconds: garminTimestampSchema,
  napValidation: garminNapValidationSchema,
  napOffsetInSeconds: garminTimestampSchema
});

export const garminSleepSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  startTimeInSeconds: garminTimestampSchema,
  startTimeOffsetInSeconds: garminTimestampSchema,
  durationInSeconds: z.number().int(),
  totalNapDurationInSeconds: z.number().int().optional(),
  unmeasurableSleepInSeconds: z.number().int().optional(),
  unmeasurableSleepDurationInSeconds: z.number().int().optional(),
  deepSleepDurationInSeconds: z.number().int().optional(),
  lightSleepDurationInSeconds: z.number().int().optional(),
  remSleepInSeconds: z.number().int().optional(),
  awakeDurationInSeconds: z.number().int().optional(),
  sleepLevelsMap: garminSleepLevelRangesSchema.optional(),
  validation: garminSleepValidationSchema,
  timeOffsetSleepRespiration: garminNumberMapSchema.optional(),
  timeOffsetSleepSpo2: garminNumberMapSchema.optional(),
  overallSleepScore: garminSleepScoreValueSchema.optional(),
  sleepScores: z.record(z.string(), garminSleepScoreValueSchema).optional(),
  naps: z.array(garminSleepNapSchema).optional()
});

export const garminBodyCompositionSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  measurementTimeInSeconds: garminTimestampSchema,
  measurementTimeOffsetInSeconds: garminTimestampSchema,
  muscleMassInGrams: z.number().int().optional(),
  boneMassInGrams: z.number().int().optional(),
  bodyWaterInPercent: z.number().finite().optional(),
  bodyFatInPercent: z.number().finite().optional(),
  bodyMassIndex: z.number().finite().optional(),
  weightInGrams: z.number().int().optional()
});

export const garminStressLevelValueSchema = z.number().int().min(-5).max(100);
export const garminBodyBatteryLevelSchema = z.enum(["VERY_LOW", "LOW", "MODERATE", "HIGH"]);
export const garminBodyBatteryEventTypeSchema = z.enum([
  "SLEEP",
  "RECOVERY",
  "NAP",
  "ACTIVITY",
  "STRESS"
]);

export const garminStressBodyBatteryDynamicFeedbackSchema = z.object({
  eventStartTimeInSeconds: garminTimestampSchema,
  bodyBatteryLevel: garminBodyBatteryLevelSchema
});

export const garminStressBodyBatteryActivityEventSchema = z.object({
  eventType: garminBodyBatteryEventTypeSchema,
  eventStartTimeInSeconds: garminTimestampSchema,
  eventStartTimeOffsetInSeconds: garminTimestampSchema.optional(),
  eventStartTimeOffsetINSeconds: garminTimestampSchema.optional(),
  duration: z.number().int(),
  bodyBatteryImpact: z.number().int()
});

export const garminStressDetailsSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  startTimeInSeconds: garminTimestampSchema,
  startTimeOffsetInSeconds: garminTimestampSchema,
  durationInSeconds: z.number().int(),
  calendarDate: garminCalendarDateSchema,
  timeOffsetStressLevelValues: z.record(z.string(), garminStressLevelValueSchema).optional(),
  timeOffsetBodyBatteryValues: garminNumberMapSchema.optional(),
  bodyBatteryDynamicFeedbackEvent: garminStressBodyBatteryDynamicFeedbackSchema.optional(),
  bodyBatteryActivityEvents: z.array(garminStressBodyBatteryActivityEventSchema).optional()
});

export const garminUserMetricsSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  vo2Max: z.number().finite().optional(),
  vo2MaxCycling: z.number().finite().optional(),
  enhanced: z.boolean().optional(),
  fitnessAge: z.number().int().optional()
});

export const garminPulseOxSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  startTimeInSeconds: garminTimestampSchema,
  startTimeOffsetInSeconds: garminTimestampSchema,
  durationInSeconds: z.number().int(),
  timeOffsetSpo2Values: garminNumberMapSchema.optional(),
  onDemand: z.boolean()
});

export const garminRespirationSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  startTimeInSeconds: garminTimestampSchema,
  durationInSeconds: z.number().int(),
  startTimeOffsetInSeconds: garminTimestampSchema,
  timeOffsetEpochToBreaths: garminNumberMapSchema.optional()
});

export const garminHealthSnapshotSummaryTypeSchema = z.enum([
  "heart_rate",
  "stress",
  "spo2",
  "respiration",
  "sdrr_hrv",
  "rmssd_hrv"
]);

export const garminHealthSnapshotMetricSchema = z.object({
  summaryType: garminHealthSnapshotSummaryTypeSchema,
  minValue: z.number().finite().optional(),
  maxValue: z.number().finite().optional(),
  avgValue: z.number().finite().optional(),
  epochSummaries: garminNumberMapSchema.optional()
});

export const garminHealthSnapshotSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  startTimeInSeconds: garminTimestampSchema,
  durationInSeconds: z.number().int(),
  startTimeOffsetInSeconds: garminTimestampSchema.optional(),
  offsetStartTimeInSeconds: garminTimestampSchema.optional(),
  summaries: z.array(garminHealthSnapshotMetricSchema)
});

export const garminHrvSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  startTimeInSeconds: garminTimestampSchema,
  durationInSeconds: z.number().int(),
  startTimeOffsetInSeconds: garminTimestampSchema,
  lastNightAvg: z.number().int(),
  lastNight5MinHigh: z.number().int(),
  hrvValues: garminNumberMapSchema.optional()
});

export const garminBloodPressureSourceTypeSchema = z.enum(["MANUAL", "DEVICE"]);

export const garminBloodPressureSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  measurementTimeInSeconds: garminTimestampSchema,
  measurementTimeOffsetInSeconds: garminTimestampSchema,
  systolic: z.number().int(),
  diastolic: z.number().int(),
  pulse: z.number().int(),
  sourceType: garminBloodPressureSourceTypeSchema
});

export const garminSkinTemperatureSummarySchema = z.object({
  summaryId: garminSummaryIdSchema,
  calendarDate: garminCalendarDateSchema,
  avgDeviationCelsius: z.number().finite(),
  durationInSeconds: z.number().int(),
  startTimeInSeconds: garminTimestampSchema,
  startTimeOffsetInSeconds: garminTimestampSchema
});

export const garminDailyPushSummarySchema = garminDailySummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminEpochPushSummarySchema = garminEpochSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminSleepPushSummarySchema = garminSleepSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminBodyCompositionPushSummarySchema = garminBodyCompositionSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminStressDetailsPushSummarySchema = garminStressDetailsSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminUserMetricsPushSummarySchema = garminUserMetricsSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminPulseOxPushSummarySchema = garminPulseOxSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminRespirationPushSummarySchema = garminRespirationSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminHealthSnapshotPushSummarySchema = garminHealthSnapshotSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminHrvPushSummarySchema = garminHrvSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminBloodPressurePushSummarySchema = garminBloodPressureSummarySchema.extend({
  userId: garminPushUserIdSchema
});
export const garminSkinTemperaturePushSummarySchema = garminSkinTemperatureSummarySchema.extend({
  userId: garminPushUserIdSchema
});

export const garminHealthPushSchema = z
  .object({
    dailies: z.array(garminDailyPushSummarySchema).optional(),
    epochs: z.array(garminEpochPushSummarySchema).optional(),
    sleeps: z.array(garminSleepPushSummarySchema).optional(),
    bodyComps: z.array(garminBodyCompositionPushSummarySchema).optional(),
    stressDetails: z.array(garminStressDetailsPushSummarySchema).optional(),
    userMetrics: z.array(garminUserMetricsPushSummarySchema).optional(),
    pulseox: z.array(garminPulseOxPushSummarySchema).optional(),
    allDayRespiration: z.array(garminRespirationPushSummarySchema).optional(),
    healthSnapshot: z.array(garminHealthSnapshotPushSummarySchema).optional(),
    hrv: z.array(garminHrvPushSummarySchema).optional(),
    bloodPressures: z.array(garminBloodPressurePushSummarySchema).optional(),
    skinTemp: z.array(garminSkinTemperaturePushSummarySchema).optional()
  })
  .passthrough();

export const garminHealthPingSchema = z
  .object({
    dailies: z.array(garminPingNotificationItemSchema).optional(),
    epochs: z.array(garminPingNotificationItemSchema).optional(),
    sleeps: z.array(garminPingNotificationItemSchema).optional(),
    bodyComps: z.array(garminPingNotificationItemSchema).optional(),
    stressDetails: z.array(garminPingNotificationItemSchema).optional(),
    userMetrics: z.array(garminPingNotificationItemSchema).optional(),
    pulseox: z.array(garminPingNotificationItemSchema).optional(),
    allDayRespiration: z.array(garminPingNotificationItemSchema).optional(),
    healthSnapshot: z.array(garminPingNotificationItemSchema).optional(),
    hrv: z.array(garminPingNotificationItemSchema).optional(),
    bloodPressures: z.array(garminPingNotificationItemSchema).optional(),
    skinTemp: z.array(garminPingNotificationItemSchema).optional()
  })
  .passthrough();

export const garminHealthCallbackResponseSchemas = {
  dailies: z.array(garminDailySummarySchema),
  epochs: z.array(garminEpochSummarySchema),
  sleeps: z.array(garminSleepSummarySchema),
  bodyComps: z.array(garminBodyCompositionSummarySchema),
  stressDetails: z.array(garminStressDetailsSummarySchema),
  userMetrics: z.array(garminUserMetricsSummarySchema),
  pulseox: z.array(garminPulseOxSummarySchema),
  allDayRespiration: z.array(garminRespirationSummarySchema),
  healthSnapshot: z.array(garminHealthSnapshotSummarySchema),
  hrv: z.array(garminHrvSummarySchema),
  bloodPressures: z.array(garminBloodPressureSummarySchema),
  skinTemp: z.array(garminSkinTemperatureSummarySchema)
} satisfies Record<GarminNotificationSummaryType, z.ZodTypeAny>;

export const parseGarminHealthCallbackPayload = (
  summaryType: GarminNotificationSummaryType,
  payload: unknown
) => garminHealthCallbackResponseSchemas[summaryType].parse(payload);

export type GarminNotificationSummaryType = z.infer<typeof garminNotificationSummaryTypeSchema>;
export type GarminBackfillSummaryType = z.infer<typeof garminBackfillSummaryTypeSchema>;
export type GarminDailySummary = z.infer<typeof garminDailySummarySchema>;
export type GarminDailyPushSummary = z.infer<typeof garminDailyPushSummarySchema>;
export type GarminEpochSummary = z.infer<typeof garminEpochSummarySchema>;
export type GarminSleepSummary = z.infer<typeof garminSleepSummarySchema>;
export type GarminSleepPushSummary = z.infer<typeof garminSleepPushSummarySchema>;
export type GarminBodyCompositionSummary = z.infer<typeof garminBodyCompositionSummarySchema>;
export type GarminStressDetailsSummary = z.infer<typeof garminStressDetailsSummarySchema>;
export type GarminUserMetricsSummary = z.infer<typeof garminUserMetricsSummarySchema>;
export type GarminPulseOxSummary = z.infer<typeof garminPulseOxSummarySchema>;
export type GarminRespirationSummary = z.infer<typeof garminRespirationSummarySchema>;
export type GarminHealthSnapshotSummary = z.infer<typeof garminHealthSnapshotSummarySchema>;
export type GarminHrvSummary = z.infer<typeof garminHrvSummarySchema>;
export type GarminHrvPushSummary = z.infer<typeof garminHrvPushSummarySchema>;
export type GarminBloodPressureSummary = z.infer<typeof garminBloodPressureSummarySchema>;
export type GarminSkinTemperatureSummary = z.infer<typeof garminSkinTemperatureSummarySchema>;
export type GarminHealthPushPayload = z.infer<typeof garminHealthPushSchema>;
export type GarminHealthPingPayload = z.infer<typeof garminHealthPingSchema>;
