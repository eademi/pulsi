import {
  boolean,
  date,
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
    providerAthleteId: text("provider_athlete_id").notNull(),
    credentialKey: text("credential_key").notNull(),
    status: connectionStatusEnum("status").default("active").notNull(),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", { withTimezone: true }),
    lastCursor: text("last_cursor"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("athlete_device_connections_tenant_idx").on(table.tenantId, table.provider),
    athleteLookup: uniqueIndex("athlete_device_connections_athlete_provider_key").on(
      table.athleteId,
      table.provider
    )
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
