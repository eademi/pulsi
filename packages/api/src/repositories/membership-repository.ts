import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { Database, DbExecutor } from "../db/client";
import {
  squads,
  tenantMemberships,
  tenants,
  tenantUserSquadAccess,
  user
} from "../db/schema";

export class MembershipRepository {
  public constructor(private readonly db: Database) {}

  public async listForUser(userId: string) {
    const memberships = await this.db
      .select({
        userId: tenantMemberships.userId,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        accessScope: tenantMemberships.accessScope
      })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(eq(tenantMemberships.userId, userId))
      .orderBy(desc(tenantMemberships.isDefaultTenant), tenants.name);

    return this.attachAssignedSquads(memberships);
  }

  public async findActiveMembership(userId: string, tenantSlug: string) {
    const [membership] = await this.db
      .select({
        userId: tenantMemberships.userId,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        accessScope: tenantMemberships.accessScope
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

    if (!membership) {
      return null;
    }

    const [hydrated] = await this.attachAssignedSquads([membership]);

    return hydrated ?? null;
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
    const memberships = await this.db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        accessScope: tenantMemberships.accessScope,
        isDefaultTenant: tenantMemberships.isDefaultTenant,
        joinedAt: tenantMemberships.createdAt
      })
      .from(tenantMemberships)
      .innerJoin(user, eq(tenantMemberships.userId, user.id))
      .where(eq(tenantMemberships.tenantId, tenantId));

    return this.attachAssignedSquads(memberships.map((membership) => ({ ...membership, tenantId })));
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

  public async findForTenantByUserId(tenantId: string, userId: string) {
    const [membership] = await this.db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: tenantMemberships.role,
        status: tenantMemberships.status,
        accessScope: tenantMemberships.accessScope,
        isDefaultTenant: tenantMemberships.isDefaultTenant,
        joinedAt: tenantMemberships.createdAt
      })
      .from(tenantMemberships)
      .innerJoin(user, eq(tenantMemberships.userId, user.id))
      .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.userId, userId)))
      .limit(1);

    if (!membership) {
      return null;
    }

    const [hydrated] = await this.attachAssignedSquads([{ ...membership, tenantId }]);

    return hydrated ?? null;
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
    role: "club_owner" | "org_admin" | "coach" | "performance_staff" | "analyst";
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
        accessScope: "all_squads",
        invitedByUserId: input.invitedByUserId ?? null,
        isDefaultTenant: input.isDefaultTenant ?? false
      })
      .onConflictDoUpdate({
        target: [tenantMemberships.tenantId, tenantMemberships.userId],
        set: {
          role: input.role,
          status: "active",
          accessScope: "all_squads",
          invitedByUserId: input.invitedByUserId ?? null,
          updatedAt: new Date()
        }
      })
      .returning();

    return membership ?? null;
  }

  public async replaceAccessScope(
    input: {
      tenantId: string;
      userId: string;
      accessScope: "all_squads" | "assigned_squads";
      squadIds: string[];
    },
    executor: DbExecutor = this.db
  ) {
    await executor
      .update(tenantMemberships)
      .set({
        accessScope: input.accessScope,
        updatedAt: new Date()
      })
      .where(and(eq(tenantMemberships.tenantId, input.tenantId), eq(tenantMemberships.userId, input.userId)));

    await executor
      .delete(tenantUserSquadAccess)
      .where(
        and(
          eq(tenantUserSquadAccess.tenantId, input.tenantId),
          eq(tenantUserSquadAccess.userId, input.userId)
        )
      );

    if (input.accessScope === "assigned_squads" && input.squadIds.length > 0) {
      // Replace grants atomically so stale squad access cannot survive scope updates.
      await executor.insert(tenantUserSquadAccess).values(
        input.squadIds.map((squadId) => ({
          tenantId: input.tenantId,
          userId: input.userId,
          squadId
        }))
      );
    }
  }

  private async attachAssignedSquads<
    T extends {
      tenantId: string;
      userId?: string;
      accessScope: "all_squads" | "assigned_squads";
    }
  >(memberships: T[]) {
    const scopedMemberships = memberships.filter(
      (membership): membership is T & { userId: string } =>
        membership.accessScope === "assigned_squads" && Boolean(membership.userId)
    );

    if (scopedMemberships.length === 0) {
      return memberships.map((membership) => ({
        ...membership,
        assignedSquads: []
      }));
    }

    const tenantIds = Array.from(new Set(scopedMemberships.map((membership) => membership.tenantId)));
    const userIds = Array.from(new Set(scopedMemberships.map((membership) => membership.userId)));

    const assignedSquads = await this.db
      .select({
        tenantId: tenantUserSquadAccess.tenantId,
        userId: tenantUserSquadAccess.userId,
        squadId: squads.id,
        squadSlug: squads.slug,
        squadName: squads.name
      })
      .from(tenantUserSquadAccess)
      .innerJoin(squads, eq(tenantUserSquadAccess.squadId, squads.id))
      .where(
        and(
          inArray(tenantUserSquadAccess.tenantId, tenantIds),
          inArray(tenantUserSquadAccess.userId, userIds)
        )
      );

    const assignedByMembershipKey = new Map<string, Array<{ id: string; slug: string; name: string }>>();
    for (const squad of assignedSquads) {
      const key = membershipKey(squad.tenantId, squad.userId);
      const current = assignedByMembershipKey.get(key) ?? [];
      current.push({
        id: squad.squadId,
        slug: squad.squadSlug,
        name: squad.squadName
      });
      assignedByMembershipKey.set(key, current);
    }

    return memberships.map((membership) => ({
      ...membership,
      assignedSquads: membership.userId
        ? (assignedByMembershipKey.get(membershipKey(membership.tenantId, membership.userId)) ?? [])
        : []
    }));
  }
}

const membershipKey = (tenantId: string, userId: string) => `${tenantId}:${userId}`;
