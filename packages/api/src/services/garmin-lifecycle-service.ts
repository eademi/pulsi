import type { GarminApiClient } from "../integrations/garmin/garmin-client";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { GarminTokenService } from "./garmin-token-service";
import { AppError } from "../http/errors";

export class GarminLifecycleService {
  public constructor(
    private readonly garminRepository: GarminRepository,
    private readonly tokenService: GarminTokenService,
    private readonly apiClient: GarminApiClient
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
}
