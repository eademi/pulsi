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
  summaryType?: string;
  summaryId?: string;
  metric: NormalizedWearableMetricRecord;
  cursor?: string | null;
}

export interface ProviderHealthSummaryRecord {
  providerUserId: string;
  provider: IntegrationProvider;
  summaryType: string;
  summaryId: string;
  summaryDate?: string | null;
  startTimeInSeconds?: number | null;
  durationInSeconds?: number | null;
  rawPayload: Record<string, unknown>;
}
