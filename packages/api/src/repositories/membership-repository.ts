import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { Database, DbExecutor } from "../db/client";
import {
  squads,
  staffMemberships,
  tenants,
  tenantUserSquadAccess,
  user
} from "../db/schema";

export class MembershipRepository {
  public constructor(private readonly db: Database) {}

  public async listForUser(userId: string) {
    const memberships = await this.db
      .select({
        userId: staffMemberships.userId,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: staffMemberships.role,
        status: staffMemberships.status,
        accessScope: staffMemberships.accessScope
      })
      .from(staffMemberships)
      .innerJoin(tenants, eq(staffMemberships.tenantId, tenants.id))
      .where(eq(staffMemberships.userId, userId))
      .orderBy(desc(staffMemberships.isDefaultTenant), tenants.name);

    return this.attachAssignedSquads(memberships);
  }

  public async findActiveMembership(userId: string, tenantSlug: string) {
    const [membership] = await this.db
      .select({
        userId: staffMemberships.userId,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        createdAt: tenants.createdAt,
        role: staffMemberships.role,
        status: staffMemberships.status,
        accessScope: staffMemberships.accessScope
      })
      .from(staffMemberships)
      .innerJoin(tenants, eq(staffMemberships.tenantId, tenants.id))
      .where(
        and(
          eq(staffMemberships.userId, userId),
          eq(staffMemberships.status, "active"),
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
        role: staffMemberships.role,
        status: staffMemberships.status
      })
      .from(staffMemberships)
      .innerJoin(tenants, eq(staffMemberships.tenantId, tenants.id))
      .where(and(eq(staffMemberships.userId, userId), eq(staffMemberships.status, "active")))
      .limit(1);

    return membership ?? null;
  }

  public async listForTenant(tenantId: string) {
    const memberships = await this.db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: staffMemberships.role,
        status: staffMemberships.status,
        accessScope: staffMemberships.accessScope,
        isDefaultTenant: staffMemberships.isDefaultTenant,
        joinedAt: staffMemberships.createdAt
      })
      .from(staffMemberships)
      .innerJoin(user, eq(staffMemberships.userId, user.id))
      .where(eq(staffMemberships.tenantId, tenantId));

    return this.attachAssignedSquads(memberships.map((membership) => ({ ...membership, tenantId })));
  }

  public async findForTenantByEmail(tenantId: string, email: string) {
    const [membership] = await this.db
      .select({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: staffMemberships.role,
        status: staffMemberships.status,
        isDefaultTenant: staffMemberships.isDefaultTenant,
        joinedAt: staffMemberships.createdAt
      })
      .from(staffMemberships)
      .innerJoin(user, eq(staffMemberships.userId, user.id))
      .where(
        and(
          eq(staffMemberships.tenantId, tenantId),
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
        role: staffMemberships.role,
        status: staffMemberships.status,
        accessScope: staffMemberships.accessScope,
        isDefaultTenant: staffMemberships.isDefaultTenant,
        joinedAt: staffMemberships.createdAt
      })
      .from(staffMemberships)
      .innerJoin(user, eq(staffMemberships.userId, user.id))
      .where(and(eq(staffMemberships.tenantId, tenantId), eq(staffMemberships.userId, userId)))
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
        role: staffMemberships.role,
        status: staffMemberships.status,
        userId: user.id,
        email: user.email,
        name: user.name
      })
      .from(staffMemberships)
      .innerJoin(user, eq(staffMemberships.userId, user.id))
      .innerJoin(tenants, eq(staffMemberships.tenantId, tenants.id))
      .where(
        and(
          eq(staffMemberships.status, "active"),
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
      .insert(staffMemberships)
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
        target: [staffMemberships.tenantId, staffMemberships.userId],
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
      .update(staffMemberships)
      .set({
        accessScope: input.accessScope,
        updatedAt: new Date()
      })
      .where(and(eq(staffMemberships.tenantId, input.tenantId), eq(staffMemberships.userId, input.userId)));

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
