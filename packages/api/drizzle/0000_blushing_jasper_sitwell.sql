CREATE TYPE "public"."admin_role" AS ENUM('platform_admin', 'support', 'manager');--> statement-breakpoint
CREATE TYPE "public"."admin_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."athlete_invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."athlete_status" AS ENUM('active', 'inactive', 'rehab');--> statement-breakpoint
CREATE TYPE "public"."athlete_user_account_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."credential_subject_type" AS ENUM('athlete_connection');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('garmin');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."oauth_session_status" AS ENUM('pending', 'completed', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."readiness_band" AS ENUM('ready', 'caution', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."recovery_trend" AS ENUM('stable', 'improving', 'declining');--> statement-breakpoint
CREATE TYPE "public"."squad_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'running', 'succeeded', 'retryable_failure', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tenant_access_scope" AS ENUM('all_squads', 'assigned_squads');--> statement-breakpoint
CREATE TYPE "public"."tenant_role" AS ENUM('club_owner', 'org_admin', 'coach', 'performance_staff', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."training_recommendation" AS ENUM('full_load', 'reduced_load', 'monitor', 'recovery_focus');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_method" AS ENUM('push', 'ping', 'oauth');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('received', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "admin_role" DEFAULT 'platform_admin' NOT NULL,
	"status" "admin_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "athlete_user_account_status" DEFAULT 'active' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_integrations" (
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
CREATE TABLE "athlete_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" "athlete_invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text NOT NULL,
	"accepted_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete_squad_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"squad_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
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
CREATE TABLE "integration_activity_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" "integration_provider" DEFAULT 'garmin' NOT NULL,
	"provider_user_id" text NOT NULL,
	"summary_type" text NOT NULL,
	"provider_summary_id" text NOT NULL,
	"activity_date" date,
	"activity_type" text,
	"activity_name" text,
	"start_time_in_seconds" integer,
	"duration_in_seconds" integer,
	"distance_in_meters" double precision,
	"active_kilocalories" integer,
	"average_heart_rate_in_beats_per_minute" integer,
	"max_heart_rate_in_beats_per_minute" integer,
	"average_speed_in_meters_per_second" double precision,
	"max_speed_in_meters_per_second" double precision,
	"average_cadence_in_steps_per_minute" double precision,
	"max_cadence_in_steps_per_minute" double precision,
	"elevation_gain_in_meters" double precision,
	"elevation_loss_in_meters" double precision,
	"device_name" text,
	"is_manual" boolean DEFAULT false NOT NULL,
	"is_web_upload" boolean DEFAULT false NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_credentials" (
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
CREATE TABLE "integration_health_summaries" (
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
CREATE TABLE "integration_webhook_events" (
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"status" "squad_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "tenant_role" NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"accepted_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_memberships" (
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "tenant_role" NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"access_scope" "tenant_access_scope" DEFAULT 'all_squads' NOT NULL,
	"is_default_tenant" boolean DEFAULT false NOT NULL,
	"invited_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_memberships_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_user_squad_access" (
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"squad_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_user_squad_access_tenant_id_user_id_squad_id_pk" PRIMARY KEY("tenant_id","user_id","squad_id")
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
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_account" ADD CONSTRAINT "admin_account_user_id_admin_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_admin_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_session" ADD CONSTRAINT "admin_session_user_id_admin_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_accounts" ADD CONSTRAINT "athlete_accounts_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_accounts" ADD CONSTRAINT "athlete_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_integrations" ADD CONSTRAINT "athlete_integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_integrations" ADD CONSTRAINT "athlete_integrations_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_invites" ADD CONSTRAINT "athlete_invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_invites" ADD CONSTRAINT "athlete_invites_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_invites" ADD CONSTRAINT "athlete_invites_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_invites" ADD CONSTRAINT "athlete_invites_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_squad_assignments" ADD CONSTRAINT "athlete_squad_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_squad_assignments" ADD CONSTRAINT "athlete_squad_assignments_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_squad_assignments" ADD CONSTRAINT "athlete_squad_assignments_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_oauth_sessions" ADD CONSTRAINT "garmin_oauth_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_oauth_sessions" ADD CONSTRAINT "garmin_oauth_sessions_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_oauth_sessions" ADD CONSTRAINT "garmin_oauth_sessions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_activity_summaries" ADD CONSTRAINT "integration_activity_summaries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_activity_summaries" ADD CONSTRAINT "integration_activity_summaries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_activity_summaries" ADD CONSTRAINT "integration_activity_summaries_connection_id_athlete_integrations_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_subject_id_athlete_integrations_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."athlete_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_health_summaries" ADD CONSTRAINT "integration_health_summaries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_health_summaries" ADD CONSTRAINT "integration_health_summaries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_health_summaries" ADD CONSTRAINT "integration_health_summaries_connection_id_athlete_integrations_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_connection_id_athlete_integrations_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_events" ADD CONSTRAINT "integration_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_events" ADD CONSTRAINT "integration_webhook_events_connection_id_athlete_integrations_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_source_metric_id_wearable_daily_metrics_id_fk" FOREIGN KEY ("source_metric_id") REFERENCES "public"."wearable_daily_metrics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_accepted_by_user_id_user_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_squad_access" ADD CONSTRAINT "tenant_user_squad_access_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_squad_access" ADD CONSTRAINT "tenant_user_squad_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_squad_access" ADD CONSTRAINT "tenant_user_squad_access_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_daily_metrics" ADD CONSTRAINT "wearable_daily_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_daily_metrics" ADD CONSTRAINT "wearable_daily_metrics_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_daily_metrics" ADD CONSTRAINT "wearable_daily_metrics_source_connection_id_athlete_integrations_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."athlete_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_key" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_account_provider_account_key" ON "admin_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "admin_account_user_idx" ON "admin_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_profiles_role_status_idx" ON "admin_profiles" USING btree ("role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_session_token_key" ON "admin_session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "admin_session_user_idx" ON "admin_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_verification_identifier_idx" ON "admin_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "athlete_accounts_athlete_idx" ON "athlete_accounts" USING btree ("athlete_id","status");--> statement-breakpoint
CREATE INDEX "athlete_accounts_user_idx" ON "athlete_accounts" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_accounts_athlete_key" ON "athlete_accounts" USING btree ("athlete_id");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_accounts_user_key" ON "athlete_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "athlete_integrations_tenant_idx" ON "athlete_integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "athlete_integrations_provider_user_idx" ON "athlete_integrations" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_integrations_athlete_provider_key" ON "athlete_integrations" USING btree ("athlete_id","provider");--> statement-breakpoint
CREATE INDEX "athlete_invites_tenant_idx" ON "athlete_invites" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "athlete_invites_athlete_idx" ON "athlete_invites" USING btree ("athlete_id","status");--> statement-breakpoint
CREATE INDEX "athlete_invites_email_idx" ON "athlete_invites" USING btree ("email","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_invites_pending_athlete_key" ON "athlete_invites" USING btree ("athlete_id") WHERE "athlete_invites"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_invites_token_hash_key" ON "athlete_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "athlete_squad_assignments_athlete_idx" ON "athlete_squad_assignments" USING btree ("athlete_id","ended_at");--> statement-breakpoint
CREATE INDEX "athlete_squad_assignments_squad_idx" ON "athlete_squad_assignments" USING btree ("squad_id","ended_at");--> statement-breakpoint
CREATE INDEX "athlete_squad_assignments_tenant_idx" ON "athlete_squad_assignments" USING btree ("tenant_id","ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_squad_assignments_active_athlete_key" ON "athlete_squad_assignments" USING btree ("athlete_id") WHERE "athlete_squad_assignments"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "athletes_tenant_idx" ON "athletes" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "athletes_tenant_external_ref_key" ON "athletes" USING btree ("tenant_id","external_ref");--> statement-breakpoint
CREATE INDEX "audit_events_tenant_idx" ON "audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "garmin_oauth_sessions_state_key" ON "garmin_oauth_sessions" USING btree ("state");--> statement-breakpoint
CREATE INDEX "garmin_oauth_sessions_tenant_idx" ON "garmin_oauth_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "integration_activity_summaries_tenant_idx" ON "integration_activity_summaries" USING btree ("tenant_id","summary_type","activity_date");--> statement-breakpoint
CREATE INDEX "integration_activity_summaries_athlete_idx" ON "integration_activity_summaries" USING btree ("athlete_id","activity_date","start_time_in_seconds");--> statement-breakpoint
CREATE INDEX "integration_activity_summaries_provider_user_idx" ON "integration_activity_summaries" USING btree ("provider","provider_user_id","summary_type");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_activity_summaries_summary_key" ON "integration_activity_summaries" USING btree ("provider","athlete_id","summary_type","provider_summary_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_credentials_subject_key" ON "integration_credentials" USING btree ("provider","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "integration_credentials_tenant_idx" ON "integration_credentials" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "integration_health_summaries_tenant_idx" ON "integration_health_summaries" USING btree ("tenant_id","summary_type","summary_date");--> statement-breakpoint
CREATE INDEX "integration_health_summaries_provider_user_idx" ON "integration_health_summaries" USING btree ("provider","provider_user_id","summary_type");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_health_summaries_summary_key" ON "integration_health_summaries" USING btree ("provider","athlete_id","summary_type","provider_summary_id");--> statement-breakpoint
CREATE INDEX "integration_sync_jobs_tenant_status_idx" ON "integration_sync_jobs" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "integration_sync_jobs_due_idx" ON "integration_sync_jobs" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "integration_webhook_events_provider_idx" ON "integration_webhook_events" USING btree ("provider","notification_type","status");--> statement-breakpoint
CREATE INDEX "integration_webhook_events_tenant_idx" ON "integration_webhook_events" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX "readiness_snapshots_tenant_snapshot_idx" ON "readiness_snapshots" USING btree ("tenant_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "readiness_snapshots_athlete_snapshot_key" ON "readiness_snapshots" USING btree ("athlete_id","snapshot_date");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "squads_tenant_idx" ON "squads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "squads_tenant_slug_key" ON "squads" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "staff_invitations_tenant_idx" ON "staff_invitations" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "staff_invitations_email_idx" ON "staff_invitations" USING btree ("email","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_invitations_pending_key" ON "staff_invitations" USING btree ("tenant_id","email") WHERE "staff_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "staff_memberships_user_idx" ON "staff_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_memberships_tenant_idx" ON "staff_memberships" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_memberships_active_user_key" ON "staff_memberships" USING btree ("user_id") WHERE "staff_memberships"."status" = 'active';--> statement-breakpoint
CREATE INDEX "tenant_user_squad_access_tenant_idx" ON "tenant_user_squad_access" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "tenant_user_squad_access_squad_idx" ON "tenant_user_squad_access" USING btree ("squad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "wearable_daily_metrics_tenant_metric_idx" ON "wearable_daily_metrics" USING btree ("tenant_id","metric_date");--> statement-breakpoint
CREATE UNIQUE INDEX "wearable_daily_metrics_athlete_metric_provider_key" ON "wearable_daily_metrics" USING btree ("athlete_id","metric_date","provider");