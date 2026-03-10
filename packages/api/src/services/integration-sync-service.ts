import type { IntegrationProvider } from "@pulsi/shared";

import { AppError } from "../http/errors";
import type { HealthProviderRegistry } from "../integrations/provider-registry";
import type { IntegrationRepository } from "../repositories/integration-repository";
import type { ReadinessEngine } from "./readiness-engine";

export class IntegrationSyncService {
  public constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly providerRegistry: HealthProviderRegistry,
    private readonly readinessEngine: ReadinessEngine
  ) {}

  public async syncAthleteConnection(input: {
    tenantId: string;
    athleteId: string;
    provider: IntegrationProvider;
    actorUserId: string;
  }) {
    const connection = await this.integrationRepository.findConnectionByAthlete(
      input.tenantId,
      input.athleteId,
      input.provider
    );

    if (!connection) {
      throw new AppError(
        404,
        "RESOURCE_NOT_FOUND",
        `No active ${input.provider} connection for athlete`
      );
    }

    const providerAdapter = this.providerRegistry.get(input.provider);
    const job = await this.integrationRepository.createSyncJob({
      tenantId: input.tenantId,
      athleteId: input.athleteId,
      connectionId: connection.id,
      provider: input.provider,
      createdByUserId: input.actorUserId,
      cursorStart: connection.lastCursor
    });

    await this.integrationRepository.markSyncJob(job.id, {
      status: "running",
      attempts: job.attempts + 1
    });

    try {
      const pullResult = await providerAdapter.pullAthleteMetrics({
        providerAthleteId: connection.providerAthleteId,
        credentialKey: connection.credentialKey,
        cursor: connection.lastCursor
      });

      let processed = 0;
      for (const metricRecord of pullResult.metrics) {
        const decision = this.readinessEngine.derive(metricRecord);
        const metric = await this.integrationRepository.upsertDailyMetric({
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          connectionId: connection.id,
          provider: input.provider,
          ...metricRecord
        });

        await this.integrationRepository.upsertReadinessSnapshot({
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          sourceMetricId: metric.id,
          snapshotDate: metricRecord.metricDate,
          readinessScore: decision.readinessScore,
          readinessBand: decision.readinessBand,
          recommendation: decision.recommendation,
          recoveryTrend: decision.recoveryTrend,
          rationale: decision.rationale
        });
        processed += 1;
      }

      await this.integrationRepository.markConnectionSync(connection.id, pullResult.nextCursor);
      const finalJob = await this.integrationRepository.markSyncJob(job.id, {
        status: "succeeded",
        attempts: job.attempts + 1,
        cursorEnd: pullResult.nextCursor
      });

      return {
        job: finalJob,
        processed
      };
    } catch (error) {
      await this.integrationRepository.markSyncJob(job.id, {
        status: error instanceof AppError ? "failed" : "retryable_failure",
        attempts: job.attempts + 1,
        lastError: error instanceof Error ? error.message : "Unknown provider sync failure"
      });

      throw error;
    }
  }
}
