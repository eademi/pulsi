CREATE TABLE "provider_activity_summaries" (
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
ALTER TABLE "provider_activity_summaries" ADD CONSTRAINT "provider_activity_summaries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_activity_summaries" ADD CONSTRAINT "provider_activity_summaries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_activity_summaries" ADD CONSTRAINT "provider_activity_summaries_connection_id_athlete_device_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."athlete_device_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_activity_summaries_tenant_idx" ON "provider_activity_summaries" USING btree ("tenant_id","summary_type","activity_date");--> statement-breakpoint
CREATE INDEX "provider_activity_summaries_athlete_idx" ON "provider_activity_summaries" USING btree ("athlete_id","activity_date","start_time_in_seconds");--> statement-breakpoint
CREATE INDEX "provider_activity_summaries_provider_user_idx" ON "provider_activity_summaries" USING btree ("provider","provider_user_id","summary_type");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_activity_summaries_summary_key" ON "provider_activity_summaries" USING btree ("provider","athlete_id","summary_type","provider_summary_id");