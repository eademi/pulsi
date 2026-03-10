import type { IntegrationProvider } from "@pulsi/shared";

export interface NormalizedWearableMetricRecord {
  metricDate: string;
  restingHeartRate: number | null;
  hrvNightlyMs: number | null;
  sleepDurationMinutes: number | null;
  sleepScore: number | null;
  bodyBatteryHigh: number | null;
  bodyBatteryLow: number | null;
  stressAverage: number | null;
  trainingReadiness: number | null;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedMetricIngressRecord {
  providerUserId: string;
  provider: IntegrationProvider;
  metric: NormalizedWearableMetricRecord;
  cursor?: string | null;
}
