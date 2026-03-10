import { and, eq } from "drizzle-orm";
import type { IntegrationProvider } from "@pulsi/shared";

import type { Database } from "../db/client";
import {
  athleteDeviceConnections,
  integrationSyncJobs,
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
      .from(athleteDeviceConnections)
      .where(
        and(
          eq(athleteDeviceConnections.tenantId, tenantId),
          eq(athleteDeviceConnections.athleteId, athleteId),
          eq(athleteDeviceConnections.provider, provider),
          eq(athleteDeviceConnections.status, "active")
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
          restingHeartRate: input.restingHeartRate,
          hrvNightlyMs: input.hrvNightlyMs,
          sleepDurationMinutes: input.sleepDurationMinutes,
          sleepScore: input.sleepScore,
          bodyBatteryHigh: input.bodyBatteryHigh,
          bodyBatteryLow: input.bodyBatteryLow,
          stressAverage: input.stressAverage,
          trainingReadiness: input.trainingReadiness,
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
      .update(athleteDeviceConnections)
      .set({
        lastCursor: nextCursor,
        lastSuccessfulSyncAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(athleteDeviceConnections.id, connectionId))
      .returning();

    if (!connection) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to update connection sync state");
    }

    return connection;
  }
}
