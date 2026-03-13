import type {
  GarminActivityNotificationSummaryType,
  GarminActivityPingPayload
} from "../integrations/garmin/activity-api.contracts";
import type { GarminApiClient } from "../integrations/garmin/garmin-client";
import type { GarminMapper } from "../integrations/garmin/garmin-mapper";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { IntegrationRepository } from "../repositories/integration-repository";

export class GarminActivityIngestionService {
  public constructor(
    private readonly garminRepository: GarminRepository,
    private readonly apiClient: GarminApiClient,
    private readonly mapper: GarminMapper,
    private readonly integrationRepository: IntegrationRepository
  ) {}

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
    summaryType: GarminActivityNotificationSummaryType,
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
}
