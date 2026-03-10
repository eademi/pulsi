CREATE TYPE "public"."squad_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."tenant_access_scope" AS ENUM('all_squads', 'assigned_squads');--> statement-breakpoint
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
CREATE TABLE "tenant_user_access_scopes" (
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"access_scope" "tenant_access_scope" DEFAULT 'all_squads' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_user_access_scopes_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id")
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
INSERT INTO "tenant_user_access_scopes" ("tenant_id", "user_id", "access_scope")
SELECT "tenant_id", "user_id", 'all_squads'::"tenant_access_scope"
FROM "tenant_memberships"
ON CONFLICT ("tenant_id", "user_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "squads" ("tenant_id", "slug", "name", "status")
WITH normalized_squads AS (
  SELECT
    "tenant_id",
    CASE
      WHEN regexp_replace(lower(regexp_replace(btrim("squad"), '[^a-zA-Z0-9]+', '-', 'g')), '(^-|-$)', '', 'g') = ''
        THEN 'squad-' || substr(md5(btrim("squad")), 1, 8)
      ELSE regexp_replace(lower(regexp_replace(btrim("squad"), '[^a-zA-Z0-9]+', '-', 'g')), '(^-|-$)', '', 'g')
    END AS "slug",
    btrim("squad") AS "name"
  FROM "athletes"
  WHERE nullif(btrim("squad"), '') IS NOT NULL
)
SELECT DISTINCT ON ("tenant_id", "slug")
  "tenant_id",
  "slug",
  "name",
  'active'::"squad_status"
FROM normalized_squads
ORDER BY "tenant_id", "slug", "name";--> statement-breakpoint
INSERT INTO "athlete_squad_assignments" ("tenant_id", "athlete_id", "squad_id", "started_at")
SELECT
  a."tenant_id",
  a."id",
  s."id",
  a."created_at"
FROM "athletes" a
INNER JOIN "squads" s
  ON s."tenant_id" = a."tenant_id"
 AND s."slug" = CASE
    WHEN regexp_replace(lower(regexp_replace(btrim(a."squad"), '[^a-zA-Z0-9]+', '-', 'g')), '(^-|-$)', '', 'g') = ''
      THEN 'squad-' || substr(md5(btrim(a."squad")), 1, 8)
    ELSE regexp_replace(lower(regexp_replace(btrim(a."squad"), '[^a-zA-Z0-9]+', '-', 'g')), '(^-|-$)', '', 'g')
  END
LEFT JOIN "athlete_squad_assignments" asa
  ON asa."athlete_id" = a."id"
 AND asa."ended_at" IS NULL
WHERE nullif(btrim(a."squad"), '') IS NOT NULL
  AND asa."id" IS NULL;--> statement-breakpoint
ALTER TABLE "athlete_squad_assignments" ADD CONSTRAINT "athlete_squad_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_squad_assignments" ADD CONSTRAINT "athlete_squad_assignments_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "athlete_squad_assignments" ADD CONSTRAINT "athlete_squad_assignments_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_access_scopes" ADD CONSTRAINT "tenant_user_access_scopes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_access_scopes" ADD CONSTRAINT "tenant_user_access_scopes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_squad_access" ADD CONSTRAINT "tenant_user_squad_access_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_squad_access" ADD CONSTRAINT "tenant_user_squad_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user_squad_access" ADD CONSTRAINT "tenant_user_squad_access_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "athlete_squad_assignments_athlete_idx" ON "athlete_squad_assignments" USING btree ("athlete_id","ended_at");--> statement-breakpoint
CREATE INDEX "athlete_squad_assignments_squad_idx" ON "athlete_squad_assignments" USING btree ("squad_id","ended_at");--> statement-breakpoint
CREATE INDEX "athlete_squad_assignments_tenant_idx" ON "athlete_squad_assignments" USING btree ("tenant_id","ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "athlete_squad_assignments_active_athlete_key" ON "athlete_squad_assignments" USING btree ("athlete_id") WHERE "athlete_squad_assignments"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "squads_tenant_idx" ON "squads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "squads_tenant_slug_key" ON "squads" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE INDEX "tenant_user_access_scopes_user_idx" ON "tenant_user_access_scopes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenant_user_access_scopes_tenant_idx" ON "tenant_user_access_scopes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_user_squad_access_tenant_idx" ON "tenant_user_squad_access" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "tenant_user_squad_access_squad_idx" ON "tenant_user_squad_access" USING btree ("squad_id");
