import type { GarminMapper } from "../integrations/garmin/garmin-mapper";
import type {
  GarminActivityNotificationSummaryType,
  GarminActivityPingPayload
} from "../integrations/garmin/activity-api.contracts";
import type {
  GarminHealthPingPayload,
  GarminNotificationSummaryType
} from "../integrations/garmin/health-api.contracts";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { GarminApiClient } from "../integrations/garmin/garmin-client";
import type { IntegrationRepository } from "../repositories/integration-repository";
import type { MetricIngestionService } from "./metric-ingestion-service";
import type { GarminTokenService } from "./garmin-token-service";
import { AppError } from "../http/errors";

export class GarminConnectionService {
  public constructor(
    private readonly garminRepository: GarminRepository,
    private readonly tokenService: GarminTokenService,
    private readonly apiClient: GarminApiClient,
    private readonly mapper: GarminMapper,
    private readonly integrationRepository: IntegrationRepository,
    private readonly metricIngestionService: MetricIngestionService
  ) {}

  public async disconnectAthleteConnection(input: {
    tenantId: string;
    athleteId: string;
  }) {
    const connection = await this.garminRepository.findConnectionByAthlete(input.tenantId, input.athleteId);

    if (!connection) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "No active Garmin connection for athlete");
    }

    const accessToken = await this.tokenService.getValidAccessToken(connection.id);
    await this.apiClient.deleteUserRegistration(accessToken);
    await this.garminRepository.deactivateConnectionsByIds([connection.id]);

    return connection;
  }

  public async handleDeregistrations(payload: {
    deregistrations: Array<{ userId: string }>;
  }) {
    for (const item of payload.deregistrations) {
      const connections = await this.garminRepository.listActiveConnectionsByProviderUserId(item.userId);
      const event = await this.garminRepository.createWebhookEvent({
        tenantId: connections[0]?.tenantId ?? null,
        connectionId: connections[0]?.id ?? null,
        providerUserId: item.userId,
        notificationType: "deregistration",
        deliveryMethod: "push",
        payload: item
      });

      try {
        await this.garminRepository.deactivateConnectionsByIds(connections.map((connection) => connection.id));
        await this.garminRepository.markWebhookEventStatus(event.id, "processed");
      } catch (error) {
        await this.garminRepository.markWebhookEventStatus(
          event.id,
          "failed",
          error instanceof Error ? error.message : "Unknown Garmin deregistration failure"
        );
        throw error;
      }
    }
  }

  public async handlePermissionChanges(payload: {
    userPermissionsChange: Array<{
      userId: string;
      permissions: string[];
      changeTimeInSeconds: number;
    }>;
  }) {
    for (const item of payload.userPermissionsChange) {
      const connections = await this.garminRepository.listActiveConnectionsByProviderUserId(item.userId);
      const event = await this.garminRepository.createWebhookEvent({
        tenantId: connections[0]?.tenantId ?? null,
        connectionId: connections[0]?.id ?? null,
        providerUserId: item.userId,
        notificationType: "user_permission",
        deliveryMethod: "push",
        payload: {
          userId: item.userId,
          permissions: item.permissions,
          changeTimeInSeconds: item.changeTimeInSeconds
        }
      });

      try {
        await this.garminRepository.updateConnectionPermissionsByIds(
          connections.map((connection) => connection.id),
          item.permissions,
          new Date(item.changeTimeInSeconds * 1000)
        );
        await this.garminRepository.markWebhookEventStatus(event.id, "processed");
      } catch (error) {
        await this.garminRepository.markWebhookEventStatus(
          event.id,
          "failed",
          error instanceof Error ? error.message : "Unknown Garmin permission webhook failure"
        );
        throw error;
      }
    }
  }

  public async handleHealthPush(payload: Record<string, unknown>) {
    const summaries = this.mapper.extractSummaryRecordsFromPushPayload(payload);
    const extracted = this.mapper.extractMetricsFromPushPayload(payload);
    const metricLookup = new Map(
      extracted
        .filter((item) => item.summaryType && item.summaryId)
        .map((item) => [this.createMetricKey(item.providerUserId, item.summaryType!, item.summaryId!), item.metric])
    );

    if (summaries.length === 0 && extracted.length === 0) {
      const event = await this.garminRepository.createWebhookEvent({
        notificationType: "health_push",
        deliveryMethod: "push",
        payload
      });
      await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
      return { processed: 0, ignored: true };
    }

    if (summaries.length === 0) {
      return this.processMetricsOnly(extracted);
    }

    let processed = 0;
    for (const summary of summaries) {
      const connections = await this.garminRepository.listActiveConnectionsByProviderUserId(
        summary.providerUserId
      );

      if (connections.length === 0) {
        const event = await this.garminRepository.createWebhookEvent({
          providerUserId: summary.providerUserId,
          notificationType: "health_push",
          deliveryMethod: "push",
          payload: summary.rawPayload
        });
        await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
        continue;
      }

      for (const connection of connections) {
        const event = await this.garminRepository.createWebhookEvent({
          tenantId: connection.tenantId,
          connectionId: connection.id,
          providerUserId: summary.providerUserId,
          notificationType: "health_push",
          deliveryMethod: "push",
          payload: summary.rawPayload
        });

        try {
          await this.integrationRepository.upsertHealthSummary({
            tenantId: connection.tenantId,
            athleteId: connection.athleteId,
            connectionId: connection.id,
            provider: "garmin",
            providerUserId: summary.providerUserId,
            summaryType: summary.summaryType,
            providerSummaryId: summary.summaryId,
            summaryDate: summary.summaryDate,
            startTimeInSeconds: summary.startTimeInSeconds,
            durationInSeconds: summary.durationInSeconds,
            rawPayload: summary.rawPayload
          });

          const metric = metricLookup.get(
            this.createMetricKey(summary.providerUserId, summary.summaryType, summary.summaryId)
          );

          if (metric) {
            await this.metricIngestionService.ingestDailyMetric({
              tenantId: connection.tenantId,
              athleteId: connection.athleteId,
              connectionId: connection.id,
              provider: "garmin",
              metric,
              nextCursor: connection.lastCursor
            });
          }

          await this.garminRepository.markWebhookEventStatus(event.id, "processed");
          processed += 1;
        } catch (error) {
          await this.garminRepository.markWebhookEventStatus(
            event.id,
            "failed",
            error instanceof Error ? error.message : "Unknown Garmin health push failure"
          );
          throw error;
        }
      }
    }

    return { processed, ignored: false };
  }

  public async handleHealthPing(payload: GarminHealthPingPayload) {
    const summaryTypes = Object.keys(payload) as GarminNotificationSummaryType[];

    let accepted = 0;
    let failed = 0;
    for (const summaryType of summaryTypes) {
      const notifications = payload[summaryType];

      if (!notifications) {
        continue;
      }

      for (const notification of notifications) {
        accepted += 1;

        const event = await this.garminRepository.createWebhookEvent({
          providerUserId: notification.userId,
          notificationType: `ping_${summaryType}`,
          deliveryMethod: "ping",
          payload: {
            summaryType,
            userId: notification.userId,
            callbackURL: notification.callbackURL ?? null
          }
        });

        if (!notification.callbackURL) {
          await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
          continue;
        }

        try {
          const summaries = await this.apiClient.fetchPingCallbackData(
            summaryType,
            notification.callbackURL
          );
          const pushPayload = this.toPushPayload(summaryType, notification.userId, summaries);
          await this.handleHealthPush(pushPayload);
          await this.garminRepository.markWebhookEventStatus(event.id, "processed");
        } catch (error) {
          failed += 1;
          await this.garminRepository.markWebhookEventStatus(
            event.id,
            "failed",
            error instanceof Error ? error.message : "Unknown Garmin ping processing failure"
          );
        }
      }
    }

    return { accepted, failed };
  }

  public async handleActivityPush(payload: Record<string, unknown>) {
    const summaries = this.mapper.extractActivitySummaryRecordsFromPushPayload(payload);

    if (summaries.length === 0) {
      const event = await this.garminRepository.createWebhookEvent({
        notificationType: "activity_push",
        deliveryMethod: "push",
        payload
      });
      await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
      return { processed: 0, ignored: true };
    }

    let processed = 0;

    for (const summary of summaries) {
      const connections = await this.garminRepository.listActiveConnectionsByProviderUserId(
        summary.providerUserId
      );

      if (connections.length === 0) {
        const event = await this.garminRepository.createWebhookEvent({
          providerUserId: summary.providerUserId,
          notificationType: "activity_push",
          deliveryMethod: "push",
          payload: summary.rawPayload
        });
        await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
        continue;
      }

      for (const connection of connections) {
        const event = await this.garminRepository.createWebhookEvent({
          tenantId: connection.tenantId,
          connectionId: connection.id,
          providerUserId: summary.providerUserId,
          notificationType: "activity_push",
          deliveryMethod: "push",
          payload: summary.rawPayload
        });

        try {
          await this.integrationRepository.upsertActivitySummary({
            tenantId: connection.tenantId,
            athleteId: connection.athleteId,
            connectionId: connection.id,
            provider: "garmin",
            providerUserId: summary.providerUserId,
            summaryType: summary.summaryType,
            providerSummaryId: summary.summaryId,
            activityDate: summary.summaryDate,
            activityType: summary.activityType,
            activityName: summary.activityName,
            startTimeInSeconds: summary.startTimeInSeconds,
            durationInSeconds: summary.durationInSeconds,
            distanceInMeters: summary.distanceInMeters,
            activeKilocalories: summary.activeKilocalories,
            averageHeartRateInBeatsPerMinute: summary.averageHeartRateInBeatsPerMinute,
            maxHeartRateInBeatsPerMinute: summary.maxHeartRateInBeatsPerMinute,
            averageSpeedInMetersPerSecond: summary.averageSpeedInMetersPerSecond,
            maxSpeedInMetersPerSecond: summary.maxSpeedInMetersPerSecond,
            averageCadenceInStepsPerMinute: summary.averageCadenceInStepsPerMinute,
            maxCadenceInStepsPerMinute: summary.maxCadenceInStepsPerMinute,
            elevationGainInMeters: summary.elevationGainInMeters,
            elevationLossInMeters: summary.elevationLossInMeters,
            deviceName: summary.deviceName,
            isManual: summary.isManual,
            isWebUpload: summary.isWebUpload,
            rawPayload: summary.rawPayload
          });

          await this.garminRepository.markWebhookEventStatus(event.id, "processed");
          processed += 1;
        } catch (error) {
          await this.garminRepository.markWebhookEventStatus(
            event.id,
            "failed",
            error instanceof Error ? error.message : "Unknown Garmin activity push failure"
          );
          throw error;
        }
      }
    }

    return { processed, ignored: false };
  }

  public async handleActivityPing(payload: GarminActivityPingPayload) {
    const summaryTypes = Object.keys(payload) as GarminActivityNotificationSummaryType[];

    let accepted = 0;
    let failed = 0;

    for (const summaryType of summaryTypes) {
      const notifications = payload[summaryType];

      if (!notifications) {
        continue;
      }

      for (const notification of notifications) {
        accepted += 1;

        const event = await this.garminRepository.createWebhookEvent({
          providerUserId: notification.userId,
          notificationType: `activity_ping_${summaryType}`,
          deliveryMethod: "ping",
          payload: {
            summaryType,
            userId: notification.userId,
            callbackURL: notification.callbackURL ?? null
          }
        });

        if (!notification.callbackURL) {
          await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
          continue;
        }

        try {
          const summaries = await this.apiClient.fetchActivityPingCallbackData(
            summaryType,
            notification.callbackURL
          );
          const pushPayload = this.toPushPayload(summaryType, notification.userId, summaries);
          await this.handleActivityPush(pushPayload);
          await this.garminRepository.markWebhookEventStatus(event.id, "processed");
        } catch (error) {
          failed += 1;
          await this.garminRepository.markWebhookEventStatus(
            event.id,
            "failed",
            error instanceof Error ? error.message : "Unknown Garmin activity ping processing failure"
          );
        }
      }
    }

    return { accepted, failed };
  }

  private toPushPayload(
    summaryType: GarminNotificationSummaryType | GarminActivityNotificationSummaryType,
    userId: string,
    summaries: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    return {
      [summaryType]: summaries.map((summary) => ({
        ...summary,
        userId
      }))
    };
  }

  private async processMetricsOnly(
    extracted: Array<{
      providerUserId: string;
      metric: {
        rawPayload: Record<string, unknown>;
      } & import("../integrations/provider.types").NormalizedWearableMetricRecord;
    }>
  ) {
    let processed = 0;

    for (const item of extracted) {
      const connections = await this.garminRepository.listActiveConnectionsByProviderUserId(
        item.providerUserId
      );

      if (connections.length === 0) {
        const event = await this.garminRepository.createWebhookEvent({
          providerUserId: item.providerUserId,
          notificationType: "health_push",
          deliveryMethod: "push",
          payload: item.metric.rawPayload
        });
        await this.garminRepository.markWebhookEventStatus(event.id, "ignored");
        continue;
      }

      for (const connection of connections) {
        const event = await this.garminRepository.createWebhookEvent({
          tenantId: connection.tenantId,
          connectionId: connection.id,
          providerUserId: item.providerUserId,
          notificationType: "health_push",
          deliveryMethod: "push",
          payload: item.metric.rawPayload
        });

        try {
          await this.metricIngestionService.ingestDailyMetric({
            tenantId: connection.tenantId,
            athleteId: connection.athleteId,
            connectionId: connection.id,
            provider: "garmin",
            metric: item.metric,
            nextCursor: connection.lastCursor
          });
          await this.garminRepository.markWebhookEventStatus(event.id, "processed");
          processed += 1;
        } catch (error) {
          await this.garminRepository.markWebhookEventStatus(
            event.id,
            "failed",
            error instanceof Error ? error.message : "Unknown Garmin health push failure"
          );
          throw error;
        }
      }
    }

    return { processed, ignored: false };
  }

  private createMetricKey(providerUserId: string, summaryType: string, summaryId: string) {
    return `${providerUserId}:${summaryType}:${summaryId}`;
  }
}
