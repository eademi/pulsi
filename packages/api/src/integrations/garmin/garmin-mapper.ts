import type {
  NormalizedMetricIngressRecord,
  ProviderActivitySummaryRecord,
  NormalizedWearableMetricRecord,
  ProviderHealthSummaryRecord
} from "../provider.types";
import {
  garminActivityPushSchema,
  type GarminActivityPushPayload,
  type GarminActivityPushSummary
} from "./activity-api.contracts";
import {
  garminHealthPushSchema,
  type GarminDailyPushSummary,
  type GarminHealthPushPayload,
  type GarminHrvPushSummary,
  type GarminSleepPushSummary
} from "./health-api.contracts";

export class GarminMapper {
  public toInternalMetric(sample: Record<string, unknown>): NormalizedWearableMetricRecord | null {
    const metricDate = asString(sample.calendarDate) ?? asString(sample.date) ?? asString(sample.summaryDate);

    if (!metricDate) {
      return null;
    }

    return {
      metricDate,
      restingHeartRate: asNumber(sample.restingHeartRate),
      hrvNightlyMs: asNumber(sample.hrvNightlyMs ?? sample.heartRateVariabilityMs),
      sleepDurationMinutes: toMinutes(sample.sleepDurationSeconds ?? sample.sleepDurationMinutes),
      sleepScore: asNumber(sample.sleepScore),
      bodyBatteryHigh: asNumber(sample.bodyBatteryHigh),
      bodyBatteryLow: asNumber(sample.bodyBatteryLow),
      stressAverage: asNumber(sample.averageStressLevel ?? sample.stressAverage),
      trainingReadiness: asNumber(sample.trainingReadiness),
      rawPayload: sample
    };
  }

  public extractMetricsFromPushPayload(payload: Record<string, unknown>): NormalizedMetricIngressRecord[] {
    const parsed = garminHealthPushSchema.safeParse(payload);

    if (parsed.success) {
      return this.extractTypedMetrics(parsed.data);
    }

    const containers = [
      payload,
      ...(extractArray(payload.data) ?? []),
      ...(extractArray(payload.dailySummaries) ?? []),
      ...(extractArray(payload.dailies) ?? []),
      ...(extractArray(payload.healthSummaries) ?? [])
    ];

    const normalized: NormalizedMetricIngressRecord[] = [];

    for (const entry of containers.filter(isRecord)) {
      const providerUserId =
        asString(entry.userId) ??
        asString(payload.userId) ??
        asString((entry.summary as Record<string, unknown> | undefined)?.userId);
      const metric = this.toInternalMetric(entry);

      if (!providerUserId || !metric) {
        continue;
      }

      normalized.push({
        provider: "garmin",
        providerUserId,
        summaryId: asString(entry.summaryId) ?? undefined,
        metric
      });
    }

    return normalized;
  }

  public extractSummaryRecordsFromPushPayload(payload: Record<string, unknown>): ProviderHealthSummaryRecord[] {
    const parsed = garminHealthPushSchema.safeParse(payload);

    if (!parsed.success) {
      return [];
    }

    return this.extractTypedSummaryRecords(parsed.data);
  }

  public extractActivitySummaryRecordsFromPushPayload(
    payload: Record<string, unknown>
  ): ProviderActivitySummaryRecord[] {
    const parsed = garminActivityPushSchema.safeParse(payload);

    if (!parsed.success) {
      return [];
    }

    return this.extractTypedActivitySummaryRecords(parsed.data);
  }

  private extractTypedMetrics(payload: GarminHealthPushPayload): NormalizedMetricIngressRecord[] {
    return [
      ...mapPushCollection("dailies", payload.dailies, (summary) => this.fromDailySummary(summary)),
      ...mapPushCollection("sleeps", payload.sleeps, (summary) => this.fromSleepSummary(summary)),
      ...mapPushCollection("hrv", payload.hrv, (summary) => this.fromHrvSummary(summary))
    ];
  }

  private extractTypedSummaryRecords(payload: GarminHealthPushPayload): ProviderHealthSummaryRecord[] {
    return [
      ...mapSummaryCollection("dailies", payload.dailies),
      ...mapSummaryCollection("epochs", payload.epochs),
      ...mapSummaryCollection("sleeps", payload.sleeps),
      ...mapSummaryCollection("bodyComps", payload.bodyComps),
      ...mapSummaryCollection("stressDetails", payload.stressDetails),
      ...mapSummaryCollection("userMetrics", payload.userMetrics),
      ...mapSummaryCollection("pulseox", payload.pulseox),
      ...mapSummaryCollection("allDayRespiration", payload.allDayRespiration),
      ...mapSummaryCollection("healthSnapshot", payload.healthSnapshot),
      ...mapSummaryCollection("hrv", payload.hrv),
      ...mapSummaryCollection("bloodPressures", payload.bloodPressures),
      ...mapSummaryCollection("skinTemp", payload.skinTemp)
    ];
  }

  private extractTypedActivitySummaryRecords(
    payload: GarminActivityPushPayload
  ): ProviderActivitySummaryRecord[] {
    return mapActivitySummaryCollection("activitySummaries", payload.activitySummaries);
  }

  private fromDailySummary(summary: GarminDailyPushSummary): NormalizedWearableMetricRecord {
    return {
      metricDate: summary.calendarDate,
      restingHeartRate: summary.restingHeartRateInBeatsPerMinute ?? null,
      hrvNightlyMs: null,
      sleepDurationMinutes: null,
      sleepScore: null,
      bodyBatteryHigh: summary.bodyBatteryChargedValue ?? null,
      bodyBatteryLow: summary.bodyBatteryDrainedValue ?? null,
      stressAverage: summary.averageStressLevel ?? null,
      trainingReadiness: null,
      rawPayload: summary as Record<string, unknown>
    };
  }

  private fromSleepSummary(summary: GarminSleepPushSummary): NormalizedWearableMetricRecord {
    return {
      metricDate: summary.calendarDate,
      restingHeartRate: null,
      hrvNightlyMs: null,
      sleepDurationMinutes: toMinutes(summary.durationInSeconds),
      sleepScore: summary.overallSleepScore?.value ?? null,
      bodyBatteryHigh: null,
      bodyBatteryLow: null,
      stressAverage: null,
      trainingReadiness: null,
      rawPayload: summary as Record<string, unknown>
    };
  }

  private fromHrvSummary(summary: GarminHrvPushSummary): NormalizedWearableMetricRecord {
    return {
      metricDate: summary.calendarDate,
      restingHeartRate: null,
      hrvNightlyMs: summary.lastNightAvg,
      sleepDurationMinutes: null,
      sleepScore: null,
      bodyBatteryHigh: null,
      bodyBatteryLow: null,
      stressAverage: null,
      trainingReadiness: null,
      rawPayload: summary as Record<string, unknown>
    };
  }
}

const mapPushCollection = <T extends { userId: string }>(
  summaryType: string,
  collection: T[] | undefined,
  toMetric: (summary: T) => NormalizedWearableMetricRecord | null
): NormalizedMetricIngressRecord[] =>
  (collection ?? [])
    .map((summary) => ({
      provider: "garmin" as const,
      providerUserId: summary.userId,
      summaryType,
      summaryId: extractSummaryId(summary),
      metric: toMetric(summary)
    }))
    .filter(
      (
        item
      ): item is {
        provider: "garmin";
        providerUserId: string;
        summaryType: string;
        summaryId: string;
        metric: NormalizedWearableMetricRecord;
      } => Boolean(item.metric && item.summaryId)
    );

const mapSummaryCollection = <T extends { userId: string }>(
  summaryType: string,
  collection: T[] | undefined
): ProviderHealthSummaryRecord[] =>
  (collection ?? [])
    .map((summary) => ({
      provider: "garmin" as const,
      providerUserId: summary.userId,
      summaryType,
      summaryId: extractSummaryId(summary),
      summaryDate: extractSummaryDate(summary),
      startTimeInSeconds: extractStartTime(summary),
      durationInSeconds: extractDuration(summary),
      rawPayload: summary as Record<string, unknown>
    }))
    .filter((summary) => summary.summaryId.length > 0);

const mapActivitySummaryCollection = (
  summaryType: string,
  collection: GarminActivityPushSummary[] | undefined
): ProviderActivitySummaryRecord[] =>
  (collection ?? [])
    .map((summary) => ({
      provider: "garmin" as const,
      providerUserId: summary.userId,
      summaryType,
      summaryId: extractActivitySummaryId(summary),
      summaryDate: extractActivityDate(summary),
      startTimeInSeconds: extractStartTime(summary),
      durationInSeconds: extractActivityDuration(summary),
      activityType: asString(summary.activityType) ?? null,
      activityName: asString(summary.activityName) ?? null,
      distanceInMeters: asNumber(summary.distanceInMeters),
      activeKilocalories: asInteger(summary.activeKilocalories),
      averageHeartRateInBeatsPerMinute: asInteger(summary.averageHeartRateInBeatsPerMinute),
      maxHeartRateInBeatsPerMinute: asInteger(summary.maxHeartRateInBeatsPerMinute),
      averageSpeedInMetersPerSecond: asNumber(summary.averageSpeedInMetersPerSecond),
      maxSpeedInMetersPerSecond: asNumber(summary.maxSpeedInMetersPerSecond),
      averageCadenceInStepsPerMinute: asNumber(summary.averageRunCadenceInStepsPerMinute),
      maxCadenceInStepsPerMinute: asNumber(summary.maxRunCadenceInStepsPerMinute),
      elevationGainInMeters:
        asNumber(summary.totalElevationGainInMeters) ?? asNumber(summary.elevationGainInMeters),
      elevationLossInMeters:
        asNumber(summary.totalElevationLossInMeters) ?? asNumber(summary.elevationLossInMeters),
      deviceName: asString(summary.deviceName) ?? null,
      isManual: asBoolean(summary.isManual) ?? asBoolean(summary.manual) ?? false,
      isWebUpload: asBoolean(summary.isWebUpload) ?? asBoolean(summary.webUpload) ?? false,
      rawPayload: summary as Record<string, unknown>
    }))
    .filter((summary) => summary.summaryId.length > 0);

const extractSummaryId = (summary: { userId: string }) =>
  asString((summary as Record<string, unknown>).summaryId) ?? "";

const extractActivitySummaryId = (summary: GarminActivityPushSummary) =>
  asString(summary.summaryId) ?? asString(summary.activityId) ?? "";

const extractSummaryDate = (summary: { userId: string }) =>
  asString((summary as Record<string, unknown>).calendarDate) ??
  deriveLocalCalendarDate(summary as Record<string, unknown>);

const extractActivityDate = (summary: GarminActivityPushSummary) =>
  asString(summary.calendarDate) ?? deriveLocalCalendarDate(summary as Record<string, unknown>);

const extractStartTime = (summary: { userId: string }) =>
  asNumber(
    (summary as Record<string, unknown>).startTimeInSeconds ??
      (summary as Record<string, unknown>).measurementTimeInSeconds
  );

const extractDuration = (summary: { userId: string }) =>
  asNumber((summary as Record<string, unknown>).durationInSeconds);

const extractActivityDuration = (summary: GarminActivityPushSummary) =>
  asInteger(summary.durationInSeconds);

const deriveLocalCalendarDate = (summary: Record<string, unknown>): string | null => {
  const timestamp =
    asNumber(summary.startTimeInSeconds) ??
    asNumber(summary.measurementTimeInSeconds);

  if (timestamp === null) {
    return null;
  }

  const offsetSeconds =
    asNumber(summary.startTimeOffsetInSeconds) ??
    asNumber(summary.measurementTimeOffsetInSeconds) ??
    asNumber(summary.offsetStartTimeInSeconds) ??
    asNumber(summary.offsetInSeconds) ??
    0;

  const shiftedDate = new Date((timestamp + offsetSeconds) * 1000);
  const year = shiftedDate.getUTCFullYear();
  const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shiftedDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const extractArray = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asInteger = (value: unknown): number | null => {
  const number = asNumber(value);

  if (number === null) {
    return null;
  }

  return Math.round(number);
};

const asBoolean = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const toMinutes = (value: unknown): number | null => {
  const number = asNumber(value);

  if (number === null) {
    return null;
  }

  return number > 1000 ? Math.round(number / 60) : Math.round(number);
};
