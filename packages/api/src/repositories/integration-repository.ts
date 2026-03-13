import { and, eq, sql } from "drizzle-orm";
import type { IntegrationProvider } from "@pulsi/shared";

import type { Database } from "../db/client";
import {
  athleteIntegrations,
  integrationSyncJobs,
  integrationActivitySummaries,
  integrationHealthSummaries,
  readinessSnapshots,
  wearableDailyMetrics
} from "../db/schema";
import { AppError } from "../http/errors";

export class IntegrationRepository {
  public constructor(private readonly db: Database) {}

  public async findConnectionByAthlete(
    tenantId: string,
    athleteId: string,
    provider: IntegrationProvider
  ) {
    const [connection] = await this.db
      .select()
      .from(athleteIntegrations)
      .where(
        and(
          eq(athleteIntegrations.tenantId, tenantId),
          eq(athleteIntegrations.athleteId, athleteId),
          eq(athleteIntegrations.provider, provider),
          eq(athleteIntegrations.status, "active")
        )
      )
      .limit(1);

    return connection ?? null;
  }

  public async createSyncJob(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    provider: IntegrationProvider;
    createdByUserId: string;
    cursorStart?: string | null;
  }) {
    const [job] = await this.db
      .insert(integrationSyncJobs)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        connectionId: input.connectionId,
        provider: input.provider,
        status: "pending",
        createdByUserId: input.createdByUserId,
        cursorStart: input.cursorStart ?? null
      })
      .returning();

    if (!job) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create sync job");
    }

    return job;
  }

  public async markSyncJob(
    jobId: string,
    update: { status: "running" | "succeeded" | "retryable_failure" | "failed"; attempts?: number; lastError?: string | null; cursorEnd?: string | null }
  ) {
    const [job] = await this.db
      .update(integrationSyncJobs)
      .set({
        status: update.status,
        attempts: update.attempts,
        lastError: update.lastError ?? null,
        cursorEnd: update.cursorEnd ?? null,
        updatedAt: new Date()
      })
      .where(eq(integrationSyncJobs.id, jobId))
      .returning();

    if (!job) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to update sync job");
    }

    return job;
  }

  public async upsertDailyMetric(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    provider: IntegrationProvider;
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
  }) {
    const [metric] = await this.db
      .insert(wearableDailyMetrics)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        sourceConnectionId: input.connectionId,
        provider: input.provider,
        metricDate: input.metricDate,
        restingHeartRate: input.restingHeartRate,
        hrvNightlyMs: input.hrvNightlyMs,
        sleepDurationMinutes: input.sleepDurationMinutes,
        sleepScore: input.sleepScore,
        bodyBatteryHigh: input.bodyBatteryHigh,
        bodyBatteryLow: input.bodyBatteryLow,
        stressAverage: input.stressAverage,
        trainingReadiness: input.trainingReadiness,
        rawPayload: input.rawPayload
      })
      .onConflictDoUpdate({
        target: [
          wearableDailyMetrics.athleteId,
          wearableDailyMetrics.metricDate,
          wearableDailyMetrics.provider
        ],
        set: {
          sourceConnectionId: input.connectionId,
          restingHeartRate: sql`coalesce(excluded.resting_heart_rate, ${wearableDailyMetrics.restingHeartRate})`,
          hrvNightlyMs: sql`coalesce(excluded.hrv_nightly_ms, ${wearableDailyMetrics.hrvNightlyMs})`,
          sleepDurationMinutes: sql`coalesce(excluded.sleep_duration_minutes, ${wearableDailyMetrics.sleepDurationMinutes})`,
          sleepScore: sql`coalesce(excluded.sleep_score, ${wearableDailyMetrics.sleepScore})`,
          bodyBatteryHigh: sql`coalesce(excluded.body_battery_high, ${wearableDailyMetrics.bodyBatteryHigh})`,
          bodyBatteryLow: sql`coalesce(excluded.body_battery_low, ${wearableDailyMetrics.bodyBatteryLow})`,
          stressAverage: sql`coalesce(excluded.stress_average, ${wearableDailyMetrics.stressAverage})`,
          trainingReadiness: sql`coalesce(excluded.training_readiness, ${wearableDailyMetrics.trainingReadiness})`,
          rawPayload: input.rawPayload,
          ingestedAt: new Date()
        }
      })
      .returning();

    if (!metric) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to upsert wearable metric");
    }

    return metric;
  }

  public async upsertHealthSummary(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    provider: IntegrationProvider;
    providerUserId: string;
    summaryType: string;
    providerSummaryId: string;
    summaryDate?: string | null;
    startTimeInSeconds?: number | null;
    durationInSeconds?: number | null;
    rawPayload: Record<string, unknown>;
  }) {
    const [summary] = await this.db
      .insert(integrationHealthSummaries)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        connectionId: input.connectionId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        summaryType: input.summaryType,
        providerSummaryId: input.providerSummaryId,
        summaryDate: input.summaryDate ?? null,
        startTimeInSeconds: input.startTimeInSeconds ?? null,
        durationInSeconds: input.durationInSeconds ?? null,
        rawPayload: input.rawPayload
      })
      .onConflictDoUpdate({
        target: [
          integrationHealthSummaries.provider,
          integrationHealthSummaries.athleteId,
          integrationHealthSummaries.summaryType,
          integrationHealthSummaries.providerSummaryId
        ],
        set: {
          summaryDate: input.summaryDate ?? null,
          startTimeInSeconds: input.startTimeInSeconds ?? null,
          durationInSeconds: input.durationInSeconds ?? null,
          rawPayload: input.rawPayload,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!summary) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to upsert provider health summary");
    }

    return summary;
  }

  public async upsertActivitySummary(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    provider: IntegrationProvider;
    providerUserId: string;
    summaryType: string;
    providerSummaryId: string;
    activityDate?: string | null;
    activityType?: string | null;
    activityName?: string | null;
    startTimeInSeconds?: number | null;
    durationInSeconds?: number | null;
    distanceInMeters?: number | null;
    activeKilocalories?: number | null;
    averageHeartRateInBeatsPerMinute?: number | null;
    maxHeartRateInBeatsPerMinute?: number | null;
    averageSpeedInMetersPerSecond?: number | null;
    maxSpeedInMetersPerSecond?: number | null;
    averageCadenceInStepsPerMinute?: number | null;
    maxCadenceInStepsPerMinute?: number | null;
    elevationGainInMeters?: number | null;
    elevationLossInMeters?: number | null;
    deviceName?: string | null;
    isManual: boolean;
    isWebUpload: boolean;
    rawPayload: Record<string, unknown>;
  }) {
    const [summary] = await this.db
      .insert(integrationActivitySummaries)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        connectionId: input.connectionId,
        provider: input.provider,
        providerUserId: input.providerUserId,
        summaryType: input.summaryType,
        providerSummaryId: input.providerSummaryId,
        activityDate: input.activityDate ?? null,
        activityType: input.activityType ?? null,
        activityName: input.activityName ?? null,
        startTimeInSeconds: input.startTimeInSeconds ?? null,
        durationInSeconds: input.durationInSeconds ?? null,
        distanceInMeters: input.distanceInMeters ?? null,
        activeKilocalories: input.activeKilocalories ?? null,
        averageHeartRateInBeatsPerMinute: input.averageHeartRateInBeatsPerMinute ?? null,
        maxHeartRateInBeatsPerMinute: input.maxHeartRateInBeatsPerMinute ?? null,
        averageSpeedInMetersPerSecond: input.averageSpeedInMetersPerSecond ?? null,
        maxSpeedInMetersPerSecond: input.maxSpeedInMetersPerSecond ?? null,
        averageCadenceInStepsPerMinute: input.averageCadenceInStepsPerMinute ?? null,
        maxCadenceInStepsPerMinute: input.maxCadenceInStepsPerMinute ?? null,
        elevationGainInMeters: input.elevationGainInMeters ?? null,
        elevationLossInMeters: input.elevationLossInMeters ?? null,
        deviceName: input.deviceName ?? null,
        isManual: input.isManual,
        isWebUpload: input.isWebUpload,
        rawPayload: input.rawPayload
      })
      .onConflictDoUpdate({
        target: [
          integrationActivitySummaries.provider,
          integrationActivitySummaries.athleteId,
          integrationActivitySummaries.summaryType,
          integrationActivitySummaries.providerSummaryId
        ],
        set: {
          activityDate: input.activityDate ?? null,
          activityType: input.activityType ?? null,
          activityName: input.activityName ?? null,
          startTimeInSeconds: input.startTimeInSeconds ?? null,
          durationInSeconds: input.durationInSeconds ?? null,
          distanceInMeters: input.distanceInMeters ?? null,
          activeKilocalories: input.activeKilocalories ?? null,
          averageHeartRateInBeatsPerMinute: input.averageHeartRateInBeatsPerMinute ?? null,
          maxHeartRateInBeatsPerMinute: input.maxHeartRateInBeatsPerMinute ?? null,
          averageSpeedInMetersPerSecond: input.averageSpeedInMetersPerSecond ?? null,
          maxSpeedInMetersPerSecond: input.maxSpeedInMetersPerSecond ?? null,
          averageCadenceInStepsPerMinute: input.averageCadenceInStepsPerMinute ?? null,
          maxCadenceInStepsPerMinute: input.maxCadenceInStepsPerMinute ?? null,
          elevationGainInMeters: input.elevationGainInMeters ?? null,
          elevationLossInMeters: input.elevationLossInMeters ?? null,
          deviceName: input.deviceName ?? null,
          isManual: input.isManual,
          isWebUpload: input.isWebUpload,
          rawPayload: input.rawPayload,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!summary) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to upsert provider activity summary");
    }

    return summary;
  }

  public async upsertReadinessSnapshot(input: {
    tenantId: string;
    athleteId: string;
    sourceMetricId: string;
    snapshotDate: string;
    readinessScore: number;
    readinessBand: "ready" | "caution" | "restricted";
    recommendation: "full_load" | "reduced_load" | "monitor" | "recovery_focus";
    recoveryTrend: "stable" | "improving" | "declining";
    rationale: string[];
  }) {
    const [snapshot] = await this.db
      .insert(readinessSnapshots)
      .values(input)
      .onConflictDoUpdate({
        target: [readinessSnapshots.athleteId, readinessSnapshots.snapshotDate],
        set: {
          sourceMetricId: input.sourceMetricId,
          readinessScore: input.readinessScore,
          readinessBand: input.readinessBand,
          recommendation: input.recommendation,
          recoveryTrend: input.recoveryTrend,
          rationale: input.rationale
        }
      })
      .returning();

    if (!snapshot) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to upsert readiness snapshot");
    }

    return snapshot;
  }

  public async markConnectionSync(connectionId: string, nextCursor: string | null) {
    const [connection] = await this.db
      .update(athleteIntegrations)
      .set({
        lastCursor: nextCursor,
        lastSuccessfulSyncAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(athleteIntegrations.id, connectionId))
      .returning();

    if (!connection) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to update connection sync state");
    }

    return connection;
  }
}
