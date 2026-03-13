import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { invitationStatusEnum, membershipStatusEnum, tenantAccessScopeEnum, tenantRoleEnum } from "./enums";

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
