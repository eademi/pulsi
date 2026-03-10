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

export interface ProviderSyncInput {
  providerAthleteId: string;
  credentialKey: string;
  cursor?: string | null;
}

export interface ProviderSyncResult {
  metrics: NormalizedWearableMetricRecord[];
  nextCursor: string | null;
}

export interface HealthDataProvider {
  readonly provider: IntegrationProvider;
  pullAthleteMetrics(input: ProviderSyncInput): Promise<ProviderSyncResult>;
}
