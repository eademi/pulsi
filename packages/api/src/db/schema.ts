import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const tenantRoleEnum = pgEnum("tenant_role", [
  "club_owner",
  "coach",
  "performance_staff",
  "analyst"
]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "invited", "disabled"]);
export const athleteStatusEnum = pgEnum("athlete_status", ["active", "inactive", "rehab"]);
export const readinessBandEnum = pgEnum("readiness_band", ["ready", "caution", "restricted"]);
export const trainingRecommendationEnum = pgEnum("training_recommendation", [
  "full_load",
  "reduced_load",
  "monitor",
  "recovery_focus"
]);
export const recoveryTrendEnum = pgEnum("recovery_trend", ["stable", "improving", "declining"]);
export const integrationProviderEnum = pgEnum("integration_provider", ["garmin"]);
export const connectionStatusEnum = pgEnum("connection_status", ["active", "revoked"]);
export const syncStatusEnum = pgEnum("sync_status", [
  "pending",
  "running",
  "succeeded",
  "retryable_failure",
  "failed"
]);
export const oauthSessionStatusEnum = pgEnum("oauth_session_status", [
  "pending",
  "completed",
  "expired",
  "failed"
]);
export const credentialSubjectTypeEnum = pgEnum("credential_subject_type", ["athlete_connection"]);
export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "received",
  "processed",
  "ignored",
  "failed"
]);
export const webhookDeliveryMethodEnum = pgEnum("webhook_delivery_method", [
  "push",
  "ping",
  "oauth"
]);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugKey: uniqueIndex("tenants_slug_key").on(table.slug)
  })
);

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: tenantRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").default("invited").notNull(),
    isDefaultTenant: boolean("is_default_tenant").default(false).notNull(),
    invitedByUserId: text("invited_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId] }),
    userLookup: index("tenant_memberships_user_idx").on(table.userId),
    tenantLookup: index("tenant_memberships_tenant_idx").on(table.tenantId)
  })
);

export const athletes = pgTable(
  "athletes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalRef: text("external_ref"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    squad: text("squad"),
    position: text("position"),
    status: athleteStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("athletes_tenant_idx").on(table.tenantId, table.status),
    tenantExternalRefKey: uniqueIndex("athletes_tenant_external_ref_key").on(table.tenantId, table.externalRef)
  })
);

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
    createdByUserId: text("created_by_user_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    stateKey: uniqueIndex("garmin_oauth_sessions_state_key").on(table.state),
    tenantLookup: index("garmin_oauth_sessions_tenant_idx").on(table.tenantId, table.status)
  })
);

export const athleteDeviceConnections = pgTable(
  "athlete_device_connections",
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
    tenantLookup: index("athlete_device_connections_tenant_idx").on(table.tenantId, table.provider),
    providerUserLookup: index("athlete_device_connections_provider_user_idx").on(
      table.provider,
      table.providerUserId
    ),
    athleteLookup: uniqueIndex("athlete_device_connections_athlete_provider_key").on(
      table.athleteId,
      table.provider
    )
  })
);

export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    subjectType: credentialSubjectTypeEnum("subject_type").default("athlete_connection").notNull(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => athleteDeviceConnections.id, { onDelete: "cascade" }),
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
    subjectKey: uniqueIndex("provider_credentials_subject_key").on(
      table.provider,
      table.subjectType,
      table.subjectId
    ),
    tenantLookup: index("provider_credentials_tenant_idx").on(table.tenantId, table.provider)
  })
);

export const wearableDailyMetrics = pgTable(
  "wearable_daily_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => athleteDeviceConnections.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").default("garmin").notNull(),
    metricDate: date("metric_date").notNull(),
    restingHeartRate: integer("resting_heart_rate"),
    hrvNightlyMs: integer("hrv_nightly_ms"),
    sleepDurationMinutes: integer("sleep_duration_minutes"),
    sleepScore: integer("sleep_score"),
    bodyBatteryHigh: integer("body_battery_high"),
    bodyBatteryLow: integer("body_battery_low"),
    stressAverage: integer("stress_average"),
    trainingReadiness: integer("training_readiness"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantMetricLookup: index("wearable_daily_metrics_tenant_metric_idx").on(table.tenantId, table.metricDate),
    athleteMetricLookup: uniqueIndex("wearable_daily_metrics_athlete_metric_provider_key").on(
      table.athleteId,
      table.metricDate,
      table.provider
    )
  })
);

export const providerHealthSummaries = pgTable(
  "provider_health_summaries",
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
      .references(() => athleteDeviceConnections.id, { onDelete: "cascade" }),
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
    tenantLookup: index("provider_health_summaries_tenant_idx").on(
      table.tenantId,
      table.summaryType,
      table.summaryDate
    ),
    providerUserLookup: index("provider_health_summaries_provider_user_idx").on(
      table.provider,
      table.providerUserId,
      table.summaryType
    ),
    summaryKey: uniqueIndex("provider_health_summaries_summary_key").on(
      table.provider,
      table.athleteId,
      table.summaryType,
      table.providerSummaryId
    )
  })
);

export const providerActivitySummaries = pgTable(
  "provider_activity_summaries",
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
      .references(() => athleteDeviceConnections.id, { onDelete: "cascade" }),
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
    tenantLookup: index("provider_activity_summaries_tenant_idx").on(
      table.tenantId,
      table.summaryType,
      table.activityDate
    ),
    athleteLookup: index("provider_activity_summaries_athlete_idx").on(
      table.athleteId,
      table.activityDate,
      table.startTimeInSeconds
    ),
    providerUserLookup: index("provider_activity_summaries_provider_user_idx").on(
      table.provider,
      table.providerUserId,
      table.summaryType
    ),
    summaryKey: uniqueIndex("provider_activity_summaries_summary_key").on(
      table.provider,
      table.athleteId,
      table.summaryType,
      table.providerSummaryId
    )
  })
);

export const providerWebhookEvents = pgTable(
  "provider_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    provider: integrationProviderEnum("provider").notNull(),
    connectionId: uuid("connection_id").references(() => athleteDeviceConnections.id, {
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
    providerLookup: index("provider_webhook_events_provider_idx").on(
      table.provider,
      table.notificationType,
      table.status
    ),
    tenantLookup: index("provider_webhook_events_tenant_idx").on(table.tenantId, table.receivedAt)
  })
);

export const readinessSnapshots = pgTable(
  "readiness_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    sourceMetricId: uuid("source_metric_id").references(() => wearableDailyMetrics.id, {
      onDelete: "set null"
    }),
    snapshotDate: date("snapshot_date").notNull(),
    readinessScore: integer("readiness_score").notNull(),
    readinessBand: readinessBandEnum("readiness_band").notNull(),
    recommendation: trainingRecommendationEnum("recommendation").notNull(),
    recoveryTrend: recoveryTrendEnum("recovery_trend").notNull(),
    rationale: jsonb("rationale").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantSnapshotLookup: index("readiness_snapshots_tenant_snapshot_idx").on(
      table.tenantId,
      table.snapshotDate
    ),
    athleteSnapshotLookup: uniqueIndex("readiness_snapshots_athlete_snapshot_key").on(
      table.athleteId,
      table.snapshotDate
    )
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
    connectionId: uuid("connection_id").references(() => athleteDeviceConnections.id, {
      onDelete: "set null"
    }),
    provider: integrationProviderEnum("provider").default("garmin").notNull(),
    status: syncStatusEnum("status").default("pending").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).defaultNow().notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    cursorStart: text("cursor_start"),
    cursorEnd: text("cursor_end"),
    createdByUserId: text("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantStatusLookup: index("integration_sync_jobs_tenant_status_idx").on(table.tenantId, table.status),
    dueJobsLookup: index("integration_sync_jobs_due_idx").on(table.status, table.scheduledFor)
  })
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("audit_events_tenant_idx").on(table.tenantId, table.createdAt)
  })
);
