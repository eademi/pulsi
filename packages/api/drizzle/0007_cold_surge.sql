CREATE TYPE "public"."athlete_user_account_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "athlete_user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"athlete_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "athlete_user_account_status" DEFAULT 'active' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_user_accounts" ADD CONSTRAINT "athlete_user_accounts_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_user_accounts" ADD CONSTRAINT "athlete_user_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_user_accounts_athlete_idx" ON "athlete_user_accounts" USING btree ("athlete_id","status");--> statement-breakpoint
CREATE INDEX "athlete_user_accounts_user_idx" ON "athlete_user_accounts" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_user_accounts_athlete_key" ON "athlete_user_accounts" USING btree ("athlete_id");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_user_accounts_user_key" ON "athlete_user_accounts" USING btree ("user_id");