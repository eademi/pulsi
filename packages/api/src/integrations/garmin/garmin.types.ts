export interface GarminDailyMetricSample {
  calendarDate: string;
  restingHeartRate: number | null;
  heartRateVariabilityMs: number | null;
  sleepDurationSeconds: number | null;
  sleepScore: number | null;
  bodyBatteryHigh: number | null;
  bodyBatteryLow: number | null;
  averageStressLevel: number | null;
  trainingReadiness: number | null;
  rawPayload: Record<string, unknown>;
}

export interface GarminMetricsResponse {
  samples: GarminDailyMetricSample[];
  nextCursor: string | null;
}

export interface GarminCredentialProvider {
  getAccessToken(credentialKey: string): Promise<string>;
}
