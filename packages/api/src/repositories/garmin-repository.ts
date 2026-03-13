import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "../db/client";
import {
  athleteIntegrations,
  garminOauthSessions,
  integrationCredentials,
  integrationWebhookEvents,
  tenants
} from "../db/schema";
import { AppError } from "../http/errors";

export class GarminRepository {
  public constructor(private readonly db: Database) {}

  public async createOauthSession(input: {
    tenantId: string;
    athleteId: string;
    state: string;
    codeVerifier: string;
    redirectUri: string;
    expiresAt: Date;
    createdByUserId: string;
  }) {
    const [session] = await this.db
      .insert(garminOauthSessions)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        state: input.state,
        codeVerifier: input.codeVerifier,
        redirectUri: input.redirectUri,
        expiresAt: input.expiresAt,
        createdByUserId: input.createdByUserId
      })
      .returning();

    if (!session) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create Garmin OAuth session");
    }

    return session;
  }

  public async findOauthSessionByState(state: string) {
    const [session] = await this.db
      .select({
        session: garminOauthSessions,
        tenantSlug: tenants.slug
      })
      .from(garminOauthSessions)
      .innerJoin(tenants, eq(garminOauthSessions.tenantId, tenants.id))
      .where(eq(garminOauthSessions.state, state))
      .limit(1);

    return session ?? null;
  }

  public async markOauthSessionStatus(
    sessionId: string,
    status: "completed" | "expired" | "failed"
  ) {
    const [session] = await this.db
      .update(garminOauthSessions)
      .set({
        status,
        completedAt: status === "completed" ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(garminOauthSessions.id, sessionId))
      .returning();

    if (!session) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to update Garmin OAuth session");
    }

    return session;
  }

  public async upsertGarminConnection(input: {
    tenantId: string;
    athleteId: string;
    providerUserId: string;
    grantedPermissions: string[];
  }) {
    const [existing] = await this.db
      .select()
      .from(athleteIntegrations)
      .where(
        and(
          eq(athleteIntegrations.tenantId, input.tenantId),
          eq(athleteIntegrations.athleteId, input.athleteId),
          eq(athleteIntegrations.provider, "garmin")
        )
      )
      .limit(1);

    if (existing) {
      const [connection] = await this.db
        .update(athleteIntegrations)
        .set({
          providerUserId: input.providerUserId,
          status: "active",
          grantedPermissions: input.grantedPermissions,
          lastPermissionsSyncAt: new Date(),
          updatedAt: new Date(),
          disconnectedAt: null
        })
        .where(eq(athleteIntegrations.id, existing.id))
        .returning();

      if (!connection) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to update Garmin connection");
      }

      return connection;
    }

    const credentialKey = randomUUID();
    const [connection] = await this.db
      .insert(athleteIntegrations)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        provider: "garmin",
        providerUserId: input.providerUserId,
        credentialKey,
        grantedPermissions: input.grantedPermissions,
        lastPermissionsSyncAt: new Date()
      })
      .returning();

    if (!connection) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create Garmin connection");
    }

    return connection;
  }

  public async upsertProviderCredentials(input: {
    credentialKey: string;
    tenantId: string;
    connectionId: string;
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    tokenType: string;
    scope: string[];
    jti?: string | null;
  }) {
    const [credential] = await this.db
      .insert(integrationCredentials)
      .values({
        id: input.credentialKey,
        tenantId: input.tenantId,
        provider: "garmin",
        subjectType: "athlete_connection",
        subjectId: input.connectionId,
        encryptedAccessToken: input.encryptedAccessToken,
        encryptedRefreshToken: input.encryptedRefreshToken,
        accessTokenExpiresAt: input.accessTokenExpiresAt,
        refreshTokenExpiresAt: input.refreshTokenExpiresAt,
        tokenType: input.tokenType,
        scope: input.scope,
        jti: input.jti ?? null
      })
      .onConflictDoUpdate({
        target: [integrationCredentials.id],
        set: {
          encryptedAccessToken: input.encryptedAccessToken,
          encryptedRefreshToken: input.encryptedRefreshToken,
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          refreshTokenExpiresAt: input.refreshTokenExpiresAt,
          tokenType: input.tokenType,
          scope: input.scope,
          jti: input.jti ?? null,
          updatedAt: new Date()
        }
      })
      .returning();

    if (!credential) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to upsert Garmin credentials");
    }

    return credential;
  }

  public async findCredentialsByConnection(connectionId: string) {
    const [credential] = await this.db
      .select()
      .from(integrationCredentials)
      .where(
        and(
          eq(integrationCredentials.provider, "garmin"),
          eq(integrationCredentials.subjectType, "athlete_connection"),
          eq(integrationCredentials.subjectId, connectionId)
        )
      )
      .limit(1);

    return credential ?? null;
  }

  public async listActiveConnectionsByProviderUserId(providerUserId: string) {
    return this.db
      .select()
      .from(athleteIntegrations)
      .where(
        and(
          eq(athleteIntegrations.provider, "garmin"),
          eq(athleteIntegrations.providerUserId, providerUserId),
          eq(athleteIntegrations.status, "active"),
          isNull(athleteIntegrations.disconnectedAt)
        )
      );
  }

  public async findConnectionByAthlete(tenantId: string, athleteId: string) {
    const [connection] = await this.db
      .select()
      .from(athleteIntegrations)
      .where(
        and(
          eq(athleteIntegrations.tenantId, tenantId),
          eq(athleteIntegrations.athleteId, athleteId),
          eq(athleteIntegrations.provider, "garmin"),
          eq(athleteIntegrations.status, "active")
        )
      )
      .limit(1);

    return connection ?? null;
  }

  public async findConnectionById(connectionId: string) {
    const [connection] = await this.db
      .select()
      .from(athleteIntegrations)
      .where(and(eq(athleteIntegrations.id, connectionId), eq(athleteIntegrations.provider, "garmin")))
      .limit(1);

    return connection ?? null;
  }

  public async listConnectionsForTenant(tenantId: string) {
    return this.db
      .select()
      .from(athleteIntegrations)
      .where(
        and(
          eq(athleteIntegrations.tenantId, tenantId),
          eq(athleteIntegrations.provider, "garmin")
        )
      );
  }

  public async listConnectionsByAthlete(tenantId: string, athleteId: string) {
    return this.db
      .select()
      .from(athleteIntegrations)
      .where(
        and(
          eq(athleteIntegrations.tenantId, tenantId),
          eq(athleteIntegrations.athleteId, athleteId),
          eq(athleteIntegrations.provider, "garmin")
        )
      );
  }

  public async updateConnectionPermissionsByIds(
    connectionIds: string[],
    permissions: string[],
    changedAt?: Date
  ) {
    if (connectionIds.length === 0) {
      return [];
    }

    return this.db
      .update(athleteIntegrations)
      .set({
        grantedPermissions: permissions,
        lastPermissionsSyncAt: new Date(),
        lastPermissionChangeAt: changedAt ?? new Date(),
        updatedAt: new Date()
      })
      .where(inArray(athleteIntegrations.id, connectionIds))
      .returning();
  }

  public async deactivateConnectionsByIds(connectionIds: string[]) {
    if (connectionIds.length === 0) {
      return [];
    }

    return this.db
      .update(athleteIntegrations)
      .set({
        status: "revoked",
        disconnectedAt: new Date(),
        updatedAt: new Date()
      })
      .where(inArray(athleteIntegrations.id, connectionIds))
      .returning();
  }

  public async createWebhookEvent(input: {
    tenantId?: string | null;
    connectionId?: string | null;
    providerUserId?: string | null;
    notificationType: string;
    deliveryMethod: "push" | "ping" | "oauth";
    payload: Record<string, unknown>;
  }) {
    const [event] = await this.db
      .insert(integrationWebhookEvents)
      .values({
        tenantId: input.tenantId ?? null,
        provider: "garmin",
        connectionId: input.connectionId ?? null,
        providerUserId: input.providerUserId ?? null,
        notificationType: input.notificationType,
        deliveryMethod: input.deliveryMethod,
        payload: input.payload
      })
      .returning();

    if (!event) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create Garmin webhook event");
    }

    return event;
  }

  public async markWebhookEventStatus(
    eventId: string,
    status: "processed" | "ignored" | "failed",
    lastError?: string | null
  ) {
    const [event] = await this.db
      .update(integrationWebhookEvents)
      .set({
        status,
        lastError: lastError ?? null,
        attempts: 1,
        processedAt: status === "failed" ? null : new Date()
      })
      .where(eq(integrationWebhookEvents.id, eventId))
      .returning();

    if (!event) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to update Garmin webhook event");
    }

    return event;
  }
}
