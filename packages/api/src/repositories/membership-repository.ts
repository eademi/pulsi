import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { tenantMemberships, tenants } from "../db/schema";

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
      .where(eq(tenantMemberships.userId, userId));
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
}
