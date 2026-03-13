import { and, desc, eq } from "drizzle-orm";

import type { GarminAdminOverview } from "@pulsi/shared";

import type { Database } from "../db/client";
import {
  athleteIntegrations,
  athletes,
  garminOauthSessions,
  integrationCredentials,
  integrationSyncJobs,
  integrationWebhookEvents,
  tenants
} from "../db/schema";
import { env } from "../env";
import { AppError } from "../http/errors";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { GarminBackfillService } from "./garmin-backfill-service";

const DEFAULT_LIMIT = 20;

type GarminAdminOverviewData = Omit<GarminAdminOverview, "viewer">;

export class AdminGarminService {
  public constructor(
    private readonly db: Database,
    private readonly garminRepository: GarminRepository,
    private readonly garminBackfillService: GarminBackfillService
  ) {}

  public async getOverview(): Promise<GarminAdminOverviewData> {
    const [oauthSessions, connections, syncJobs, webhookEvents] = await Promise.all([
      this.listOauthSessions(),
      this.listConnections(),
      this.listSyncJobs(),
      this.listWebhookEvents()
    ]);

    return {
      config: {
        configured:
          !env.GARMIN_CLIENT_ID.startsWith("replace-with-") &&
          !env.GARMIN_CLIENT_SECRET.startsWith("replace-with-") &&
          !env.GARMIN_TOKEN_ENCRYPTION_KEY.startsWith("replace-with-"),
        oauthRedirectUri: env.GARMIN_OAUTH_REDIRECT_URI,
        apiBaseUrl: env.GARMIN_API_BASE_URL
      },
      oauthSessions,
      connections,
      syncJobs,
      webhookEvents
    };
  }

  public async rerunBackfill(input: { connectionId: string; createdByUserId: string }) {
    const connection = await this.garminRepository.findConnectionById(input.connectionId);

    if (!connection) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Garmin connection not found");
    }

    await this.garminBackfillService.startOnboardingBackfill({
      athleteId: connection.athleteId,
      connectionId: connection.id,
      createdByUserId: input.createdByUserId,
      providerUserId: connection.providerUserId,
      tenantId: connection.tenantId
    });

    return {
      connectionId: connection.id,
      scheduled: true
    };
  }

  private async listOauthSessions() {
    const rows = await this.db
      .select({
        id: garminOauthSessions.id,
        tenantId: garminOauthSessions.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        athleteId: garminOauthSessions.athleteId,
        athleteFirstName: athletes.firstName,
        athleteLastName: athletes.lastName,
        status: garminOauthSessions.status,
        createdByUserId: garminOauthSessions.createdByUserId,
        createdAt: garminOauthSessions.createdAt,
        expiresAt: garminOauthSessions.expiresAt,
        completedAt: garminOauthSessions.completedAt
      })
      .from(garminOauthSessions)
      .innerJoin(tenants, eq(garminOauthSessions.tenantId, tenants.id))
      .innerJoin(athletes, eq(garminOauthSessions.athleteId, athletes.id))
      .orderBy(desc(garminOauthSessions.createdAt))
      .limit(DEFAULT_LIMIT);

    return rows.map((row) => ({
      athleteId: row.athleteId,
      athleteName: `${row.athleteFirstName} ${row.athleteLastName}`,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      createdByUserId: row.createdByUserId,
      expiresAt: row.expiresAt.toISOString(),
      id: row.id,
      status: row.status,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantSlug: row.tenantSlug
    }));
  }

  private async listConnections() {
    const rows = await this.db
      .select({
        id: athleteIntegrations.id,
        tenantId: athleteIntegrations.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        athleteId: athleteIntegrations.athleteId,
        athleteFirstName: athletes.firstName,
        athleteLastName: athletes.lastName,
        providerUserId: athleteIntegrations.providerUserId,
        status: athleteIntegrations.status,
        grantedPermissions: athleteIntegrations.grantedPermissions,
        accessTokenExpiresAt: integrationCredentials.accessTokenExpiresAt,
        refreshTokenExpiresAt: integrationCredentials.refreshTokenExpiresAt,
        lastSuccessfulSyncAt: athleteIntegrations.lastSuccessfulSyncAt,
        lastPermissionsSyncAt: athleteIntegrations.lastPermissionsSyncAt,
        createdAt: athleteIntegrations.createdAt,
        updatedAt: athleteIntegrations.updatedAt
      })
      .from(athleteIntegrations)
      .innerJoin(tenants, eq(athleteIntegrations.tenantId, tenants.id))
      .innerJoin(athletes, eq(athleteIntegrations.athleteId, athletes.id))
      .leftJoin(
        integrationCredentials,
        and(
          eq(integrationCredentials.subjectId, athleteIntegrations.id),
          eq(integrationCredentials.provider, "garmin"),
          eq(integrationCredentials.subjectType, "athlete_connection")
        )
      )
      .where(eq(athleteIntegrations.provider, "garmin"))
      .orderBy(desc(athleteIntegrations.updatedAt))
      .limit(DEFAULT_LIMIT);

    return rows.map((row) => ({
      accessTokenExpiresAt: row.accessTokenExpiresAt?.toISOString() ?? null,
      athleteId: row.athleteId,
      athleteName: `${row.athleteFirstName} ${row.athleteLastName}`,
      createdAt: row.createdAt.toISOString(),
      grantedPermissions: row.grantedPermissions,
      id: row.id,
      lastPermissionsSyncAt: row.lastPermissionsSyncAt?.toISOString() ?? null,
      lastSuccessfulSyncAt: row.lastSuccessfulSyncAt?.toISOString() ?? null,
      providerUserId: row.providerUserId,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt?.toISOString() ?? null,
      status: row.status,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantSlug: row.tenantSlug,
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  private async listSyncJobs() {
    const rows = await this.db
      .select({
        id: integrationSyncJobs.id,
        tenantId: integrationSyncJobs.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        athleteId: integrationSyncJobs.athleteId,
        athleteFirstName: athletes.firstName,
        athleteLastName: athletes.lastName,
        connectionId: integrationSyncJobs.connectionId,
        status: integrationSyncJobs.status,
        attempts: integrationSyncJobs.attempts,
        lastError: integrationSyncJobs.lastError,
        scheduledFor: integrationSyncJobs.scheduledFor,
        createdAt: integrationSyncJobs.createdAt,
        updatedAt: integrationSyncJobs.updatedAt
      })
      .from(integrationSyncJobs)
      .innerJoin(tenants, eq(integrationSyncJobs.tenantId, tenants.id))
      .leftJoin(athletes, eq(integrationSyncJobs.athleteId, athletes.id))
      .where(eq(integrationSyncJobs.provider, "garmin"))
      .orderBy(desc(integrationSyncJobs.createdAt))
      .limit(DEFAULT_LIMIT);

    return rows.map((row) => ({
      athleteId: row.athleteId,
      athleteName:
        row.athleteId && row.athleteFirstName && row.athleteLastName
          ? `${row.athleteFirstName} ${row.athleteLastName}`
          : null,
      attempts: row.attempts,
      connectionId: row.connectionId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      lastError: row.lastError,
      scheduledFor: row.scheduledFor.toISOString(),
      status: row.status,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantSlug: row.tenantSlug,
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  private async listWebhookEvents() {
    const rows = await this.db
      .select({
        id: integrationWebhookEvents.id,
        tenantId: integrationWebhookEvents.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        connectionId: integrationWebhookEvents.connectionId,
        providerUserId: integrationWebhookEvents.providerUserId,
        notificationType: integrationWebhookEvents.notificationType,
        deliveryMethod: integrationWebhookEvents.deliveryMethod,
        status: integrationWebhookEvents.status,
        attempts: integrationWebhookEvents.attempts,
        lastError: integrationWebhookEvents.lastError,
        receivedAt: integrationWebhookEvents.receivedAt,
        processedAt: integrationWebhookEvents.processedAt
      })
      .from(integrationWebhookEvents)
      .leftJoin(tenants, eq(integrationWebhookEvents.tenantId, tenants.id))
      .where(eq(integrationWebhookEvents.provider, "garmin"))
      .orderBy(desc(integrationWebhookEvents.receivedAt))
      .limit(DEFAULT_LIMIT);

    return rows.map((row) => ({
      attempts: row.attempts,
      connectionId: row.connectionId,
      deliveryMethod: row.deliveryMethod,
      id: row.id,
      lastError: row.lastError,
      notificationType: row.notificationType,
      processedAt: row.processedAt?.toISOString() ?? null,
      providerUserId: row.providerUserId,
      receivedAt: row.receivedAt.toISOString(),
      status: row.status,
      tenantId: row.tenantId,
      tenantName: row.tenantName ?? null,
      tenantSlug: row.tenantSlug ?? null
    }));
  }
}
