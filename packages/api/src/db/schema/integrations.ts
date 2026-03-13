import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { athletes } from "./athletes";
import {
  connectionStatusEnum,
  credentialSubjectTypeEnum,
  integrationProviderEnum,
  oauthSessionStatusEnum,
  syncStatusEnum,
  webhookDeliveryMethodEnum,
  webhookEventStatusEnum
} from "./enums";
import { tenants } from "./organization";

export const garminOauthSessions = pgTable(
  "garmin_oauth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    state: text("state").notNull(),
    codeVerifier: text("code_verifier").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    status: oauthSessionStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    stateKey: uniqueIndex("garmin_oauth_sessions_state_key").on(table.state),
    tenantLookup: index("garmin_oauth_sessions_tenant_idx").on(table.tenantId, table.status)
  })
);

export const athleteIntegrations = pgTable(
  "athlete_integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").default("garmin").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    credentialKey: text("credential_key").notNull(),
    status: connectionStatusEnum("status").default("active").notNull(),
    grantedPermissions: jsonb("granted_permissions").$type<string[]>().default([]).notNull(),
    lastPermissionsSyncAt: timestamp("last_permissions_sync_at", { withTimezone: true }),
    lastPermissionChangeAt: timestamp("last_permission_change_at", { withTimezone: true }),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", { withTimezone: true }),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
    lastCursor: text("last_cursor"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("athlete_integrations_tenant_idx").on(table.tenantId, table.provider),
    providerUserLookup: index("athlete_integrations_provider_user_idx").on(
      table.provider,
      table.providerUserId
    ),
    athleteLookup: uniqueIndex("athlete_integrations_athlete_provider_key").on(
      table.athleteId,
      table.provider
    )
  })
);

export const integrationCredentials = pgTable(
  "integration_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    subjectType: credentialSubjectTypeEnum("subject_type").default("athlete_connection").notNull(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => athleteIntegrations.id, { onDelete: "cascade" }),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }).notNull(),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }).notNull(),
    tokenType: text("token_type").notNull(),
    scope: jsonb("scope").$type<string[]>().default([]).notNull(),
    jti: text("jti"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    subjectKey: uniqueIndex("integration_credentials_subject_key").on(
      table.provider,
      table.subjectType,
      table.subjectId
    ),
    tenantLookup: index("integration_credentials_tenant_idx").on(table.tenantId, table.provider)
  })
);

export const integrationHealthSummaries = pgTable(
  "integration_health_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => athleteIntegrations.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").default("garmin").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    summaryType: text("summary_type").notNull(),
    providerSummaryId: text("provider_summary_id").notNull(),
    summaryDate: date("summary_date"),
    startTimeInSeconds: integer("start_time_in_seconds"),
    durationInSeconds: integer("duration_in_seconds"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("integration_health_summaries_tenant_idx").on(
      table.tenantId,
      table.summaryType,
      table.summaryDate
    ),
    providerUserLookup: index("integration_health_summaries_provider_user_idx").on(
      table.provider,
      table.providerUserId,
      table.summaryType
    ),
    summaryKey: uniqueIndex("integration_health_summaries_summary_key").on(
      table.provider,
      table.athleteId,
      table.summaryType,
      table.providerSummaryId
    )
  })
);

export const integrationActivitySummaries = pgTable(
  "integration_activity_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => athleteIntegrations.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").default("garmin").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    summaryType: text("summary_type").notNull(),
    providerSummaryId: text("provider_summary_id").notNull(),
    activityDate: date("activity_date"),
    activityType: text("activity_type"),
    activityName: text("activity_name"),
    startTimeInSeconds: integer("start_time_in_seconds"),
    durationInSeconds: integer("duration_in_seconds"),
    distanceInMeters: doublePrecision("distance_in_meters"),
    activeKilocalories: integer("active_kilocalories"),
    averageHeartRateInBeatsPerMinute: integer("average_heart_rate_in_beats_per_minute"),
    maxHeartRateInBeatsPerMinute: integer("max_heart_rate_in_beats_per_minute"),
    averageSpeedInMetersPerSecond: doublePrecision("average_speed_in_meters_per_second"),
    maxSpeedInMetersPerSecond: doublePrecision("max_speed_in_meters_per_second"),
    averageCadenceInStepsPerMinute: doublePrecision("average_cadence_in_steps_per_minute"),
    maxCadenceInStepsPerMinute: doublePrecision("max_cadence_in_steps_per_minute"),
    elevationGainInMeters: doublePrecision("elevation_gain_in_meters"),
    elevationLossInMeters: doublePrecision("elevation_loss_in_meters"),
    deviceName: text("device_name"),
    isManual: boolean("is_manual").default(false).notNull(),
    isWebUpload: boolean("is_web_upload").default(false).notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("integration_activity_summaries_tenant_idx").on(
      table.tenantId,
      table.summaryType,
      table.activityDate
    ),
    athleteLookup: index("integration_activity_summaries_athlete_idx").on(
      table.athleteId,
      table.activityDate,
      table.startTimeInSeconds
    ),
    providerUserLookup: index("integration_activity_summaries_provider_user_idx").on(
      table.provider,
      table.providerUserId,
      table.summaryType
    ),
    summaryKey: uniqueIndex("integration_activity_summaries_summary_key").on(
      table.provider,
      table.athleteId,
      table.summaryType,
      table.providerSummaryId
    )
  })
);

export const integrationWebhookEvents = pgTable(
  "integration_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    provider: integrationProviderEnum("provider").notNull(),
    connectionId: uuid("connection_id").references(() => athleteIntegrations.id, {
      onDelete: "set null"
    }),
    providerUserId: text("provider_user_id"),
    notificationType: text("notification_type").notNull(),
    deliveryMethod: webhookDeliveryMethodEnum("delivery_method").notNull(),
    status: webhookEventStatusEnum("status").default("received").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
  },
  (table) => ({
    providerLookup: index("integration_webhook_events_provider_idx").on(
      table.provider,
      table.notificationType,
      table.status
    ),
    tenantLookup: index("integration_webhook_events_tenant_idx").on(table.tenantId, table.receivedAt)
  })
);

export const integrationSyncJobs = pgTable(
  "integration_sync_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id").references(() => athletes.id, { onDelete: "set null" }),
    connectionId: uuid("connection_id").references(() => athleteIntegrations.id, {
      onDelete: "set null"
    }),
    provider: integrationProviderEnum("provider").default("garmin").notNull(),
    status: syncStatusEnum("status").default("pending").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).defaultNow().notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    cursorStart: text("cursor_start"),
    cursorEnd: text("cursor_end"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantStatusLookup: index("integration_sync_jobs_tenant_status_idx").on(table.tenantId, table.status),
    dueJobsLookup: index("integration_sync_jobs_due_idx").on(table.status, table.scheduledFor)
  })
);
