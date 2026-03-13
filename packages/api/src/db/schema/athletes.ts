import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import {
  athleteInviteStatusEnum,
  athleteStatusEnum,
  athleteUserAccountStatusEnum,
  squadStatusEnum
} from "./enums";
import { tenants } from "./organization";

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
