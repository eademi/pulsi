import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { athletes } from "./athletes";
import {
  integrationProviderEnum,
  readinessBandEnum,
  recoveryTrendEnum,
  trainingRecommendationEnum
} from "./enums";
import { athleteIntegrations } from "./integrations";
import { tenants } from "./organization";

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
