import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";

import type { TenantAccessScope } from "@pulsi/shared";

import type { Database } from "../db/client";
import { athleteSquadAssignments, squads } from "../db/schema";

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
}
