import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { tenantMemberships, tenants } from "../db/schema";
import { AppError } from "../http/errors";

export class TenantRepository {
  public constructor(private readonly db: Database) {}

  public async createWithOwner(input: { name: string; slug: string; timezone: string; ownerUserId: string }) {
    return this.db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: input.name,
          slug: input.slug,
          timezone: input.timezone
        })
        .returning();

      if (!tenant) {
        throw new AppError(500, "INTERNAL_ERROR", "Failed to create tenant");
      }

      await tx.insert(tenantMemberships).values({
        tenantId: tenant.id,
        userId: input.ownerUserId,
        role: "club_owner",
        status: "active",
        isDefaultTenant: true
      });

      return tenant;
    });
  }

  public async findBySlug(slug: string) {
    const [tenant] = await this.db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return tenant ?? null;
  }
}
