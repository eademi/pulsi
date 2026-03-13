import { sql } from "drizzle-orm";
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
  "org_admin",
  "coach",
  "performance_staff",
  "analyst"
]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "invited", "disabled"]);
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired"
]);
export const athleteStatusEnum = pgEnum("athlete_status", ["active", "inactive", "rehab"]);
export const athleteUserAccountStatusEnum = pgEnum("athlete_user_account_status", [
  "active",
  "revoked"
]);
export const athleteInviteStatusEnum = pgEnum("athlete_invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired"
]);
export const squadStatusEnum = pgEnum("squad_status", ["active", "inactive"]);
export const tenantAccessScopeEnum = pgEnum("tenant_access_scope", [
  "all_squads",
  "assigned_squads"
]);
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
export const adminRoleEnum = pgEnum("admin_role", ["platform_admin", "support", "manager"]);
export const adminStatusEnum = pgEnum("admin_status", ["active", "disabled"]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    emailKey: uniqueIndex("user_email_key").on(table.email)
  })
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tokenKey: uniqueIndex("session_token_key").on(table.token),
    userLookup: index("session_user_idx").on(table.userId)
  })
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    providerAccountKey: uniqueIndex("account_provider_account_key").on(table.providerId, table.accountId),
    userLookup: index("account_user_idx").on(table.userId)
  })
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    identifierLookup: index("verification_identifier_idx").on(table.identifier)
  })
);

export const adminUser = pgTable(
  "admin_user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    emailKey: uniqueIndex("admin_user_email_key").on(table.email)
  })
);

export const adminSession = pgTable(
  "admin_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tokenKey: uniqueIndex("admin_session_token_key").on(table.token),
    userLookup: index("admin_session_user_idx").on(table.userId)
  })
);

export const adminAccount = pgTable(
  "admin_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    providerAccountKey: uniqueIndex("admin_account_provider_account_key").on(
      table.providerId,
      table.accountId
    ),
    userLookup: index("admin_account_user_idx").on(table.userId)
  })
);

export const adminVerification = pgTable(
  "admin_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    identifierLookup: index("admin_verification_identifier_idx").on(table.identifier)
  })
);

export const adminProfiles = pgTable(
  "admin_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => adminUser.id, { onDelete: "cascade" }),
    role: adminRoleEnum("role").default("platform_admin").notNull(),
    status: adminStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    activeRoleLookup: index("admin_profiles_role_status_idx").on(table.role, table.status)
  })
);

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

export const staffMemberships = pgTable(
  "staff_memberships",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: tenantRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").default("invited").notNull(),
    accessScope: tenantAccessScopeEnum("access_scope").default("all_squads").notNull(),
    isDefaultTenant: boolean("is_default_tenant").default(false).notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId] }),
    userLookup: index("staff_memberships_user_idx").on(table.userId),
    tenantLookup: index("staff_memberships_tenant_idx").on(table.tenantId),
    activeUserKey: uniqueIndex("staff_memberships_active_user_key")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`)
  })
);

export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: tenantRoleEnum("role").notNull(),
    status: invitationStatusEnum("status").default("pending").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("staff_invitations_tenant_idx").on(table.tenantId, table.status, table.createdAt),
    emailLookup: index("staff_invitations_email_idx").on(table.email, table.status, table.expiresAt),
    pendingInviteKey: uniqueIndex("staff_invitations_pending_key")
      .on(table.tenantId, table.email)
      .where(sql`${table.status} = 'pending'`)
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

export const athleteAccounts = pgTable(
  "athlete_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: athleteUserAccountStatusEnum("status").default("active").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    athleteLookup: index("athlete_accounts_athlete_idx").on(table.athleteId, table.status),
    userLookup: index("athlete_accounts_user_idx").on(table.userId, table.status),
    athleteKey: uniqueIndex("athlete_accounts_athlete_key").on(table.athleteId),
    userKey: uniqueIndex("athlete_accounts_user_key").on(table.userId)
  })
);

export const athleteInvites = pgTable(
  "athlete_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    status: athleteInviteStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => user.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("athlete_invites_tenant_idx").on(table.tenantId, table.status),
    athleteLookup: index("athlete_invites_athlete_idx").on(table.athleteId, table.status),
    emailLookup: index("athlete_invites_email_idx").on(table.email, table.status, table.expiresAt),
    pendingAthleteKey: uniqueIndex("athlete_invites_pending_athlete_key")
      .on(table.athleteId)
      .where(sql`${table.status} = 'pending'`),
    tokenHashKey: uniqueIndex("athlete_invites_token_hash_key").on(table.tokenHash)
  })
);

export const squads = pgTable(
  "squads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category"),
    status: squadStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    tenantLookup: index("squads_tenant_idx").on(table.tenantId, table.status),
    tenantSlugKey: uniqueIndex("squads_tenant_slug_key").on(table.tenantId, table.slug)
  })
);

export const athleteSquadAssignments = pgTable(
  "athlete_squad_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    athleteId: uuid("athlete_id")
      .notNull()
      .references(() => athletes.id, { onDelete: "cascade" }),
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    athleteLookup: index("athlete_squad_assignments_athlete_idx").on(table.athleteId, table.endedAt),
    squadLookup: index("athlete_squad_assignments_squad_idx").on(table.squadId, table.endedAt),
    tenantLookup: index("athlete_squad_assignments_tenant_idx").on(table.tenantId, table.endedAt),
    activeAthleteKey: uniqueIndex("athlete_squad_assignments_active_athlete_key")
      .on(table.athleteId)
      .where(sql`${table.endedAt} is null`)
  })
);

export const tenantUserSquadAccess = pgTable(
  "tenant_user_squad_access",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId, table.squadId] }),
    tenantLookup: index("tenant_user_squad_access_tenant_idx").on(table.tenantId, table.userId),
    squadLookup: index("tenant_user_squad_access_squad_idx").on(table.squadId)
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
      .references(() => athleteIntegrations.id, { onDelete: "cascade" }),
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

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
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
