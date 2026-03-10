import {
  garminBackfillSummaryTypeToNotificationSummaryType,
  type GarminBackfillSummaryType
} from "../integrations/garmin/health-api.contracts";
import type { GarminMapper } from "../integrations/garmin/garmin-mapper";
import type { GarminApiClient } from "../integrations/garmin/garmin-client";
import type { IntegrationRepository } from "../repositories/integration-repository";
import { AppError, isAppError } from "../http/errors";
import { logger } from "../telemetry/logger";
import type { MetricIngestionService } from "./metric-ingestion-service";
import type { GarminTokenService } from "./garmin-token-service";

const SECONDS_PER_DAY = 86_400;
const ONBOARDING_BACKFILL_DAYS = 30;
const onboardingBackfillSummaryTypes: GarminBackfillSummaryType[] = [
  "dailies",
  "epochs",
  "sleeps",
  "bodyComps",
  "stressDetails",
  "userMetrics",
  "pulseOx",
  "respiration",
  "healthSnapshot",
  "hrv",
  "bloodPressures",
  "skinTemp"
];

export class GarminBackfillService {
  public constructor(
    private readonly apiClient: GarminApiClient,
    private readonly tokenService: GarminTokenService,
    private readonly mapper: GarminMapper,
    private readonly integrationRepository: IntegrationRepository,
    private readonly metricIngestionService: MetricIngestionService
  ) {}

  public async startOnboardingBackfill(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    providerUserId: string;
    createdByUserId: string;
  }) {
    const summaryEndTimeInSeconds = Math.floor(Date.now() / 1000);
    const summaryStartTimeInSeconds =
      summaryEndTimeInSeconds - ONBOARDING_BACKFILL_DAYS * SECONDS_PER_DAY;

    const job = await this.integrationRepository.createSyncJob({
      tenantId: input.tenantId,
      athleteId: input.athleteId,
      connectionId: input.connectionId,
      provider: "garmin",
      createdByUserId: input.createdByUserId,
      cursorStart: String(summaryStartTimeInSeconds)
    });

    void this.runOnboardingBackfill({
      ...input,
      jobId: job.id,
      summaryStartTimeInSeconds,
      summaryEndTimeInSeconds
    }).catch((error) => {
      logger.error(
        {
          err: error,
          provider: "garmin",
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          connectionId: input.connectionId,
          syncJobId: job.id
        },
        "garmin_onboarding_backfill_failed"
      );
    });

    return job;
  }

  private async runOnboardingBackfill(input: {
    jobId: string;
    tenantId: string;
    athleteId: string;
    connectionId: string;
    providerUserId: string;
    summaryStartTimeInSeconds: number;
    summaryEndTimeInSeconds: number;
  }) {
    await this.integrationRepository.markSyncJob(input.jobId, {
      status: "running",
      attempts: 1,
      lastError: null,
      cursorEnd: null
    });

    try {
      const accessToken = await this.tokenService.getValidAccessToken(input.connectionId);
      const skippedSummaryTypes: string[] = [];

      for (const summaryType of onboardingBackfillSummaryTypes) {
        try {
          const summaries = await this.apiClient.fetchHealthBackfill(
            summaryType,
            {
              summaryStartTimeInSeconds: input.summaryStartTimeInSeconds,
              summaryEndTimeInSeconds: input.summaryEndTimeInSeconds
            },
            accessToken
          );

          if (summaries.length === 0) {
            continue;
          }

          await this.ingestBackfillSummaries({
            tenantId: input.tenantId,
            athleteId: input.athleteId,
            connectionId: input.connectionId,
            providerUserId: input.providerUserId,
            summaryType,
            summaries
          });
        } catch (error) {
          if (isSkippableBackfillFailure(error)) {
            skippedSummaryTypes.push(summaryType);
            continue;
          }

          throw error;
        }
      }

      if (skippedSummaryTypes.length > 0) {
        logger.warn(
          {
            provider: "garmin",
            tenantId: input.tenantId,
            athleteId: input.athleteId,
            connectionId: input.connectionId,
            syncJobId: input.jobId,
            skippedSummaryTypes
          },
          "garmin_onboarding_backfill_skipped_summary_types"
        );
      }

      await this.integrationRepository.markConnectionSync(input.connectionId, null);
      await this.integrationRepository.markSyncJob(input.jobId, {
        status: "succeeded",
        attempts: 1,
        lastError: null,
        cursorEnd: String(input.summaryEndTimeInSeconds)
      });
    } catch (error) {
      await this.integrationRepository.markSyncJob(input.jobId, {
        status: "retryable_failure",
        attempts: 1,
        lastError: error instanceof Error ? error.message : "Unknown Garmin backfill failure",
        cursorEnd: String(input.summaryEndTimeInSeconds)
      });
      throw error;
    }
  }

  private async ingestBackfillSummaries(input: {
    tenantId: string;
    athleteId: string;
    connectionId: string;
    providerUserId: string;
    summaryType: GarminBackfillSummaryType;
    summaries: Array<Record<string, unknown>>;
  }) {
    const pushSummaryType = garminBackfillSummaryTypeToNotificationSummaryType[input.summaryType];
    const pushPayload = {
      [pushSummaryType]: input.summaries.map((summary) => ({
        ...summary,
        userId: input.providerUserId
      }))
    } as Record<string, unknown>;

    const extractedSummaries = this.mapper.extractSummaryRecordsFromPushPayload(pushPayload);
    const extractedMetrics = this.mapper.extractMetricsFromPushPayload(pushPayload);
    const metricLookup = new Map(
      extractedMetrics
        .filter((item) => item.summaryType && item.summaryId)
        .map((item) => [`${item.summaryType}:${item.summaryId}`, item.metric])
    );

    for (const summary of extractedSummaries) {
      await this.integrationRepository.upsertHealthSummary({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        connectionId: input.connectionId,
        provider: "garmin",
        providerUserId: input.providerUserId,
        summaryType: summary.summaryType,
        providerSummaryId: summary.summaryId,
        summaryDate: summary.summaryDate,
        startTimeInSeconds: summary.startTimeInSeconds,
        durationInSeconds: summary.durationInSeconds,
        rawPayload: summary.rawPayload
      });

      const metric = metricLookup.get(`${summary.summaryType}:${summary.summaryId}`);

      if (!metric) {
        continue;
      }

      await this.metricIngestionService.ingestDailyMetric({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        connectionId: input.connectionId,
        provider: "garmin",
        metric,
        nextCursor: null
      });
    }
  }
}

const isSkippableBackfillFailure = (error: unknown) => {
  if (!isAppError(error) || error.code !== "EXTERNAL_SERVICE_FAILURE") {
    return false;
  }

  const status = getExternalStatusCode(error);
  return status === 403 || status === 404;
};

const getExternalStatusCode = (error: AppError) => {
  if (typeof error.details !== "object" || error.details === null) {
    return null;
  }

  const status = (error.details as Record<string, unknown>).status;
  return typeof status === "number" ? status : null;
};
