CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."athlete_status" AS ENUM('active', 'inactive', 'rehab');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."credential_subject_type" AS ENUM('athlete_connection');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('garmin');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."oauth_session_status" AS ENUM('pending', 'completed', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."readiness_band" AS ENUM('ready', 'caution', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."recovery_trend" AS ENUM('stable', 'improving', 'declining');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'running', 'succeeded', 'retryable_failure', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tenant_role" AS ENUM('club_owner', 'coach', 'performance_staff', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."training_recommendation" AS ENUM('full_load', 'reduced_load', 'monitor', 'recovery_focus');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_method" AS ENUM('push', 'ping', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('received', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TABLE "athlete_device_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"provider" "integration_provider" DEFAULT 'garmin' NOT NULL,
	"provider_user_id" text NOT NULL,
	"credential_key" text NOT NULL,
	"status" "connection_status" DEFAULT 'active' NOT NULL,
	"granted_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_permissions_sync_at" timestamp with time zone,
	"last_permission_change_at" timestamp with time zone,
	"last_successful_sync_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"last_cursor" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_ref" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"squad" text,
	"position" text,
	"status" "athlete_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garmin_oauth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"state" text NOT NULL,
	"code_verifier" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"status" "oauth_session_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid,
	"connection_id" uuid,
	"provider" "integration_provider" DEFAULT 'garmin' NOT NULL,
	"status" "sync_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"cursor_start" text,
	"cursor_end" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"subject_type" "credential_subject_type" DEFAULT 'athlete_connection' NOT NULL,
	"subject_id" uuid NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"refresh_token_expires_at" timestamp with time zone NOT NULL,
	"token_type" text NOT NULL,
	"scope" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"jti" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" "integration_provider" DEFAULT 'garmin' NOT NULL,
	"provider_user_id" text NOT NULL,
	"summary_type" text NOT NULL,
	"provider_summary_id" text NOT NULL,
	"summary_date" date,
	"start_time_in_seconds" integer,
	"duration_in_seconds" integer,
	"raw_payload" jsonb NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"provider" "integration_provider" NOT NULL,
	"connection_id" uuid,
	"provider_user_id" text,
	"notification_type" text NOT NULL,
	"delivery_method" "webhook_delivery_method" NOT NULL,
	"status" "webhook_event_status" DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "readiness_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"source_metric_id" uuid,
	"snapshot_date" date NOT NULL,
	"readiness_score" integer NOT NULL,
	"readiness_band" "readiness_band" NOT NULL,
	"recommendation" "training_recommendation" NOT NULL,
	"recovery_trend" "recovery_trend" NOT NULL,
	"rationale" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "tenant_role" NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"is_default_tenant" boolean DEFAULT false NOT NULL,
	"invited_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_memberships_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wearable_daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"source_connection_id" uuid NOT NULL,
	"provider" "integration_provider" DEFAULT 'garmin' NOT NULL,
	"metric_date" date NOT NULL,
	"resting_heart_rate" integer,
	"hrv_nightly_ms" integer,
	"sleep_duration_minutes" integer,
	"sleep_score" integer,
	"body_battery_high" integer,
	"body_battery_low" integer,
	"stress_average" integer,
	"training_readiness" integer,
	"raw_payload" jsonb NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_device_connections" ADD CONSTRAINT "athlete_device_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_device_connections" ADD CONSTRAINT "athlete_device_connections_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_oauth_sessions" ADD CONSTRAINT "garmin_oauth_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_oauth_sessions" ADD CONSTRAINT "garmin_oauth_sessions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_connection_id_athlete_device_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_device_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_subject_id_athlete_device_connections_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."athlete_device_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_health_summaries" ADD CONSTRAINT "provider_health_summaries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_health_summaries" ADD CONSTRAINT "provider_health_summaries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_health_summaries" ADD CONSTRAINT "provider_health_summaries_connection_id_athlete_device_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_device_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhook_events" ADD CONSTRAINT "provider_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_webhook_events" ADD CONSTRAINT "provider_webhook_events_connection_id_athlete_device_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_device_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_source_metric_id_wearable_daily_metrics_id_fk" FOREIGN KEY ("source_metric_id") REFERENCES "public"."wearable_daily_metrics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_daily_metrics" ADD CONSTRAINT "wearable_daily_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_daily_metrics" ADD CONSTRAINT "wearable_daily_metrics_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_daily_metrics" ADD CONSTRAINT "wearable_daily_metrics_source_connection_id_athlete_device_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."athlete_device_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_device_connections_tenant_idx" ON "athlete_device_connections" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "athlete_device_connections_provider_user_idx" ON "athlete_device_connections" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_device_connections_athlete_provider_key" ON "athlete_device_connections" USING btree ("athlete_id","provider");--> statement-breakpoint
CREATE INDEX "athletes_tenant_idx" ON "athletes" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "athletes_tenant_external_ref_key" ON "athletes" USING btree ("tenant_id","external_ref");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_idx" ON "audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "garmin_oauth_sessions_state_key" ON "garmin_oauth_sessions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "garmin_oauth_sessions_tenant_idx" ON "garmin_oauth_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "integration_sync_jobs_tenant_status_idx" ON "integration_sync_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "integration_sync_jobs_due_idx" ON "integration_sync_jobs" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_credentials_subject_key" ON "provider_credentials" USING btree ("provider","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "provider_credentials_tenant_idx" ON "provider_credentials" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "provider_health_summaries_tenant_idx" ON "provider_health_summaries" USING btree ("tenant_id","summary_type","summary_date");--> statement-breakpoint
CREATE INDEX "provider_health_summaries_provider_user_idx" ON "provider_health_summaries" USING btree ("provider","provider_user_id","summary_type");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_health_summaries_summary_key" ON "provider_health_summaries" USING btree ("provider","athlete_id","summary_type","provider_summary_id");--> statement-breakpoint
CREATE INDEX "provider_webhook_events_provider_idx" ON "provider_webhook_events" USING btree ("provider","notification_type","status");--> statement-breakpoint
CREATE INDEX "provider_webhook_events_tenant_idx" ON "provider_webhook_events" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX "readiness_snapshots_tenant_snapshot_idx" ON "readiness_snapshots" USING btree ("tenant_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "readiness_snapshots_athlete_snapshot_key" ON "readiness_snapshots" USING btree ("athlete_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "tenant_memberships_user_idx" ON "tenant_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenant_memberships_tenant_idx" ON "tenant_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "wearable_daily_metrics_tenant_metric_idx" ON "wearable_daily_metrics" USING btree ("tenant_id","metric_date");--> statement-breakpoint
CREATE UNIQUE INDEX "wearable_daily_metrics_athlete_metric_provider_key" ON "wearable_daily_metrics" USING btree ("athlete_id","metric_date","provider");
