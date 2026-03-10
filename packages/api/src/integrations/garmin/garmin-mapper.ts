import type { NormalizedMetricIngressRecord, NormalizedWearableMetricRecord } from "../provider.types";
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

    return containers
      .filter(isRecord)
      .map((entry) => ({
        provider: "garmin" as const,
        providerUserId:
          asString(entry.userId) ??
          asString(payload.userId) ??
          asString((entry.summary as Record<string, unknown> | undefined)?.userId),
        metric: this.toInternalMetric(entry)
      }))
      .filter(
        (
          item
        ): item is {
          provider: "garmin";
          providerUserId: string;
          metric: NormalizedWearableMetricRecord;
        } => Boolean(item.providerUserId && item.metric)
      );
  }

  private extractTypedMetrics(payload: GarminHealthPushPayload): NormalizedMetricIngressRecord[] {
    return [
      ...mapPushCollection(payload.dailies, (summary) => this.fromDailySummary(summary)),
      ...mapPushCollection(payload.sleeps, (summary) => this.fromSleepSummary(summary)),
      ...mapPushCollection(payload.hrv, (summary) => this.fromHrvSummary(summary))
    ];
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
  collection: T[] | undefined,
  toMetric: (summary: T) => NormalizedWearableMetricRecord | null
): NormalizedMetricIngressRecord[] =>
  (collection ?? [])
    .map((summary) => ({
      provider: "garmin" as const,
      providerUserId: summary.userId,
      metric: toMetric(summary)
    }))
    .filter(
      (
        item
      ): item is {
        provider: "garmin";
        providerUserId: string;
        metric: NormalizedWearableMetricRecord;
      } => Boolean(item.metric)
    );

const extractArray = (value: unknown): unknown[] | null => (Array.isArray(value) ? value : null);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toMinutes = (value: unknown): number | null => {
  const number = asNumber(value);

  if (number === null) {
    return null;
  }

  return number > 1000 ? Math.round(number / 60) : Math.round(number);
};
