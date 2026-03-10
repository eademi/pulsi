import { and, desc, eq, sql } from "drizzle-orm";

import type { Database, DbExecutor } from "../db/client";
import { tenantMemberships, tenants, user } from "../db/schema";

export class MembershipRepository {
  public constructor(private readonly db: Database) {}

  public async listForUser(userId: string) {
    return this.db
      .select({
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: tenantMemberships.role,
        status: tenantMemberships.status
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(eq(tenantMemberships.userId, userId))
      .orderBy(desc(tenantMemberships.isDefaultTenant), tenants.name);
  }

  public async findActiveMembership(userId: string, tenantSlug: string) {
    const [membership] = await this.db
      .select({
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: tenantMemberships.role,
        status: tenantMemberships.status
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(
        and(
          eq(tenantMemberships.userId, userId),
          eq(tenantMemberships.status, "active"),
          eq(tenants.slug, tenantSlug)
        )
      )
      .limit(1);

    return membership ?? null;
  }

  public async findAnyActiveMembership(userId: string) {
    const [membership] = await this.db
      .select({
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: tenantMemberships.role,
        status: tenantMemberships.status
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(and(eq(tenantMemberships.userId, userId), eq(tenantMemberships.status, "active")))
      .limit(1);

    return membership ?? null;
  }

  public async listForTenant(tenantId: string) {
    return this.db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        isDefaultTenant: tenantMemberships.isDefaultTenant,
        joinedAt: tenantMemberships.createdAt
      })
      .from(tenantMemberships)
      .innerJoin(user, eq(tenantMemberships.userId, user.id))
      .where(eq(tenantMemberships.tenantId, tenantId));
  }

  public async findForTenantByEmail(tenantId: string, email: string) {
    const [membership] = await this.db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        isDefaultTenant: tenantMemberships.isDefaultTenant,
        joinedAt: tenantMemberships.createdAt
      })
      .from(tenantMemberships)
      .innerJoin(user, eq(tenantMemberships.userId, user.id))
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          sql`lower(${user.email}) = lower(${email})`
        )
      )
      .limit(1);

    return membership ?? null;
  }

  public async findAnyActiveMembershipByEmail(email: string) {
    const [membership] = await this.db
      .select({
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        userId: user.id,
        email: user.email,
        name: user.name
      })
      .from(tenantMemberships)
      .innerJoin(user, eq(tenantMemberships.userId, user.id))
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(
        and(
          eq(tenantMemberships.status, "active"),
          sql`lower(${user.email}) = lower(${email})`
        )
      )
      .limit(1);

    return membership ?? null;
  }

  public async upsertMembership(input: {
    tenantId: string;
    userId: string;
    role: "club_owner" | "coach" | "performance_staff" | "analyst";
    invitedByUserId?: string | null;
    isDefaultTenant?: boolean;
  }, executor: DbExecutor = this.db) {
    const [membership] = await executor
      .insert(tenantMemberships)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        role: input.role,
        status: "active",
        invitedByUserId: input.invitedByUserId ?? null,
        isDefaultTenant: input.isDefaultTenant ?? false
      })
      .onConflictDoUpdate({
        target: [tenantMemberships.tenantId, tenantMemberships.userId],
        set: {
          role: input.role,
          status: "active",
          invitedByUserId: input.invitedByUserId ?? null,
          updatedAt: new Date()
        }
      })
      .returning();

    return membership ?? null;
  }
}
