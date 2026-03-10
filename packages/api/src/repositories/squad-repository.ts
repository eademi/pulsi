import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import type { TenantAccessScope } from "@pulsi/shared";

import type { Database, DbExecutor } from "../db/client";
import { athleteSquadAssignments, squads } from "../db/schema";
import { AppError } from "../http/errors";

export class SquadRepository {
  public constructor(private readonly db: Database) {}

  public async listForTenant(input: {
    tenantId: string;
    accessScope: TenantAccessScope;
    accessibleSquadIds: string[];
    status?: "active" | "inactive" | "all";
  }) {
    const rows = await this.db
      .select({
        id: squads.id,
        tenantId: squads.tenantId,
        slug: squads.slug,
        name: squads.name,
        category: squads.category,
        status: squads.status,
        athleteCount: count(athleteSquadAssignments.id),
        createdAt: squads.createdAt
      })
      .from(squads)
      .leftJoin(
        athleteSquadAssignments,
        and(eq(athleteSquadAssignments.squadId, squads.id), isNull(athleteSquadAssignments.endedAt))
      )
      .where(
        and(
          eq(squads.tenantId, input.tenantId),
          input.status && input.status !== "all" ? eq(squads.status, input.status) : undefined,
          input.accessScope === "assigned_squads"
            ? input.accessibleSquadIds.length > 0
              ? inArray(squads.id, input.accessibleSquadIds)
              : sql`false`
            : undefined
        )
      )
      .groupBy(squads.id)
      .orderBy(asc(squads.name));

    return rows;
  }

  public async findByIdForTenant(tenantId: string, squadId: string) {
    const [squad] = await this.db
      .select()
      .from(squads)
      .where(and(eq(squads.tenantId, tenantId), eq(squads.id, squadId)))
      .limit(1);

    return squad ?? null;
  }

  public async findBySlugForTenant(tenantId: string, slug: string) {
    const [squad] = await this.db
      .select()
      .from(squads)
      .where(and(eq(squads.tenantId, tenantId), eq(squads.slug, slug)))
      .limit(1);

    return squad ?? null;
  }

  public async listByIdsForTenant(tenantId: string, squadIds: string[]) {
    if (squadIds.length === 0) {
      return [];
    }

    return this.db
      .select()
      .from(squads)
      .where(and(eq(squads.tenantId, tenantId), inArray(squads.id, squadIds)));
  }

  public async create(
    input: {
      tenantId: string;
      slug: string;
      name: string;
      category?: string | null;
    },
    executor: DbExecutor = this.db
  ) {
    const [squad] = await executor
      .insert(squads)
      .values({
        tenantId: input.tenantId,
        slug: input.slug,
        name: input.name,
        category: input.category ?? null
      })
      .returning();

    if (!squad) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create squad");
    }

    return squad;
  }
}
