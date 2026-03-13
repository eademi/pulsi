import { and, eq, gt } from "drizzle-orm";

import type { Database, DbExecutor } from "../db/client";
import { staffInvitations, tenants } from "../db/schema";

export class InvitationRepository {
  public constructor(private readonly db: Database) {}

  public async listPendingForEmail(email: string, now: Date) {
    return this.db
      .select({
        id: staffInvitations.id,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        email: staffInvitations.email,
        role: staffInvitations.role,
        status: staffInvitations.status,
        expiresAt: staffInvitations.expiresAt,
        createdAt: staffInvitations.createdAt,
        acceptedAt: staffInvitations.acceptedAt
      })
      .from(staffInvitations)
      .innerJoin(tenants, eq(staffInvitations.tenantId, tenants.id))
      .where(
        and(
          eq(staffInvitations.email, email),
          eq(staffInvitations.status, "pending"),
          gt(staffInvitations.expiresAt, now)
        )
      );
  }

  public async listForTenant(tenantId: string) {
    return this.db
      .select({
        id: staffInvitations.id,
        tenantId: staffInvitations.tenantId,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        email: staffInvitations.email,
        role: staffInvitations.role,
        status: staffInvitations.status,
        expiresAt: staffInvitations.expiresAt,
        createdAt: staffInvitations.createdAt,
        acceptedAt: staffInvitations.acceptedAt
      })
      .from(staffInvitations)
      .innerJoin(tenants, eq(staffInvitations.tenantId, tenants.id))
      .where(eq(staffInvitations.tenantId, tenantId));
  }

  public async findPendingByTenantAndEmail(tenantId: string, email: string) {
    const [invitation] = await this.db
      .select()
      .from(staffInvitations)
      .where(
        and(
          eq(staffInvitations.tenantId, tenantId),
          eq(staffInvitations.email, email),
          eq(staffInvitations.status, "pending")
        )
      )
      .limit(1);

    return invitation ?? null;
  }

  public async findById(invitationId: string) {
    const [invitation] = await this.db
      .select({
        id: staffInvitations.id,
        tenantId: staffInvitations.tenantId,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        email: staffInvitations.email,
        role: staffInvitations.role,
        status: staffInvitations.status,
        invitedByUserId: staffInvitations.invitedByUserId,
        acceptedByUserId: staffInvitations.acceptedByUserId,
        expiresAt: staffInvitations.expiresAt,
        createdAt: staffInvitations.createdAt,
        acceptedAt: staffInvitations.acceptedAt
      })
      .from(staffInvitations)
      .innerJoin(tenants, eq(staffInvitations.tenantId, tenants.id))
      .where(eq(staffInvitations.id, invitationId))
      .limit(1);

    return invitation ?? null;
  }

  public async create(input: {
    tenantId: string;
    email: string;
    role: "club_owner" | "org_admin" | "coach" | "performance_staff" | "analyst";
    invitedByUserId: string;
    expiresAt: Date;
  }, executor: DbExecutor = this.db) {
    const [invitation] = await executor
      .insert(staffInvitations)
      .values({
        tenantId: input.tenantId,
        email: input.email,
        role: input.role,
        invitedByUserId: input.invitedByUserId,
        expiresAt: input.expiresAt
      })
      .returning();

    return invitation ?? null;
  }

  public async markAccepted(
    invitationId: string,
    acceptedByUserId: string,
    executor: DbExecutor = this.db
  ) {
    const [invitation] = await executor
      .update(staffInvitations)
      .set({
        status: "accepted",
        acceptedByUserId,
        acceptedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(staffInvitations.id, invitationId))
      .returning();

    return invitation ?? null;
  }

  public async markExpired(invitationId: string, executor: DbExecutor = this.db) {
    const [invitation] = await executor
      .update(staffInvitations)
      .set({
        status: "expired",
        updatedAt: new Date()
      })
      .where(eq(staffInvitations.id, invitationId))
      .returning();

    return invitation ?? null;
  }
}
