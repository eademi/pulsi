import type { IntegrationProvider } from "@pulsi/shared";

import type { NormalizedWearableMetricRecord } from "../integrations/provider.types";
import type { IntegrationRepository } from "../repositories/integration-repository";
import type { ReadinessEngine } from "./readiness-engine";

export class MetricIngestionService {
  public constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly readinessEngine: ReadinessEngine
  ) {}

  public async ingestDailyMetric(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    provider: IntegrationProvider;
    metric: NormalizedWearableMetricRecord;
    nextCursor?: string | null;
  }) {
    const decision = this.readinessEngine.derive(input.metric);
    const metric = await this.integrationRepository.upsertDailyMetric({
      tenantId: input.tenantId,
      athleteId: input.athleteId,
      connectionId: input.connectionId,
      provider: input.provider,
      ...input.metric
    });

    await this.integrationRepository.upsertReadinessSnapshot({
      tenantId: input.tenantId,
      athleteId: input.athleteId,
      sourceMetricId: metric.id,
      snapshotDate: input.metric.metricDate,
      readinessScore: decision.readinessScore,
      readinessBand: decision.readinessBand,
      recommendation: decision.recommendation,
      recoveryTrend: decision.recoveryTrend,
      rationale: decision.rationale
    });

    await this.integrationRepository.markConnectionSync(input.connectionId, input.nextCursor ?? null);

    return {
      metric,
      decision
    };
  }
}
