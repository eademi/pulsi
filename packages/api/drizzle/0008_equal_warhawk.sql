CREATE TYPE "public"."athlete_claim_link_status" AS ENUM('pending', 'claimed', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "athlete_claim_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"status" "athlete_claim_link_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text NOT NULL,
	"claimed_by_user_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "athlete_claim_links" ADD CONSTRAINT "athlete_claim_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_claim_links" ADD CONSTRAINT "athlete_claim_links_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_claim_links" ADD CONSTRAINT "athlete_claim_links_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_claim_links" ADD CONSTRAINT "athlete_claim_links_claimed_by_user_id_user_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_claim_links_tenant_idx" ON "athlete_claim_links" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "athlete_claim_links_athlete_idx" ON "athlete_claim_links" USING btree ("athlete_id","status");--> statement-breakpoint
CREATE INDEX "athlete_claim_links_email_idx" ON "athlete_claim_links" USING btree ("email","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_claim_links_pending_athlete_key" ON "athlete_claim_links" USING btree ("athlete_id") WHERE "athlete_claim_links"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_claim_links_token_hash_key" ON "athlete_claim_links" USING btree ("token_hash");