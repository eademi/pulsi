import { and, eq, gt } from "drizzle-orm";

import type { Database, DbExecutor } from "../db/client";
import { tenantInvitations, tenants } from "../db/schema";

export class InvitationRepository {
  public constructor(private readonly db: Database) {}

  public async listPendingForEmail(email: string, now: Date) {
    return this.db
      .select({
        id: tenantInvitations.id,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        email: tenantInvitations.email,
        role: tenantInvitations.role,
        status: tenantInvitations.status,
        expiresAt: tenantInvitations.expiresAt,
        createdAt: tenantInvitations.createdAt,
        acceptedAt: tenantInvitations.acceptedAt
      })
      .from(tenantInvitations)
      .innerJoin(tenants, eq(tenantInvitations.tenantId, tenants.id))
      .where(
        and(
          eq(tenantInvitations.email, email),
          eq(tenantInvitations.status, "pending"),
          gt(tenantInvitations.expiresAt, now)
        )
      );
  }

  public async listForTenant(tenantId: string) {
    return this.db
      .select({
        id: tenantInvitations.id,
        tenantId: tenantInvitations.tenantId,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        email: tenantInvitations.email,
        role: tenantInvitations.role,
        status: tenantInvitations.status,
        expiresAt: tenantInvitations.expiresAt,
        createdAt: tenantInvitations.createdAt,
        acceptedAt: tenantInvitations.acceptedAt
      })
      .from(tenantInvitations)
      .innerJoin(tenants, eq(tenantInvitations.tenantId, tenants.id))
      .where(eq(tenantInvitations.tenantId, tenantId));
  }

  public async findPendingByTenantAndEmail(tenantId: string, email: string) {
    const [invitation] = await this.db
      .select()
      .from(tenantInvitations)
      .where(
        and(
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.email, email),
          eq(tenantInvitations.status, "pending")
        )
      )
      .limit(1);

    return invitation ?? null;
  }

  public async findById(invitationId: string) {
    const [invitation] = await this.db
      .select({
        id: tenantInvitations.id,
        tenantId: tenantInvitations.tenantId,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        email: tenantInvitations.email,
        role: tenantInvitations.role,
        status: tenantInvitations.status,
        invitedByUserId: tenantInvitations.invitedByUserId,
        acceptedByUserId: tenantInvitations.acceptedByUserId,
        expiresAt: tenantInvitations.expiresAt,
        createdAt: tenantInvitations.createdAt,
        acceptedAt: tenantInvitations.acceptedAt
      })
      .from(tenantInvitations)
      .innerJoin(tenants, eq(tenantInvitations.tenantId, tenants.id))
      .where(eq(tenantInvitations.id, invitationId))
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
      .insert(tenantInvitations)
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
      .update(tenantInvitations)
      .set({
        status: "accepted",
        acceptedByUserId,
        acceptedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tenantInvitations.id, invitationId))
      .returning();

    return invitation ?? null;
  }

  public async markExpired(invitationId: string, executor: DbExecutor = this.db) {
    const [invitation] = await executor
      .update(tenantInvitations)
      .set({
        status: "expired",
        updatedAt: new Date()
      })
      .where(eq(tenantInvitations.id, invitationId))
      .returning();

    return invitation ?? null;
  }
}
