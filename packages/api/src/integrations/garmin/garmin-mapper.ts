import type { GarminDailyMetricSample } from "./garmin.types";
import type { NormalizedWearableMetricRecord } from "../provider.types";

export class GarminMapper {
  public toInternalMetric(sample: GarminDailyMetricSample): NormalizedWearableMetricRecord {
    return {
      metricDate: sample.calendarDate,
      restingHeartRate: sample.restingHeartRate,
      hrvNightlyMs: sample.heartRateVariabilityMs,
      sleepDurationMinutes:
        sample.sleepDurationSeconds === null ? null : Math.round(sample.sleepDurationSeconds / 60),
      sleepScore: sample.sleepScore,
      bodyBatteryHigh: sample.bodyBatteryHigh,
      bodyBatteryLow: sample.bodyBatteryLow,
      stressAverage: sample.averageStressLevel,
      trainingReadiness: sample.trainingReadiness,
      rawPayload: sample.rawPayload
    };
  }
}
