import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { TenantAccessScope } from "@pulsi/shared";

import type { Database } from "../db/client";
import { athleteSquadAssignments, athletes, squads } from "../db/schema";
import { canAccessSquad } from "../domain/squad-access";

export interface AthleteVisibilityFilter {
  accessScope?: TenantAccessScope;
  accessibleSquadIds?: string[];
  squadId?: string;
  squadSlug?: string;
}

export class AthleteRepository {
  public constructor(private readonly db: Database) {}

  public async findByIdForTenant(tenantId: string, athleteId: string, filters: AthleteVisibilityFilter = {}) {
    const [athlete] = await this.db
      .select({
        athlete: athletes,
        squadId: squads.id,
        squadSlug: squads.slug,
        squadName: squads.name
      })
      .from(athletes)
      .leftJoin(
        athleteSquadAssignments,
        and(eq(athleteSquadAssignments.athleteId, athletes.id), isNull(athleteSquadAssignments.endedAt))
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .where(and(eq(athletes.tenantId, tenantId), eq(athletes.id, athleteId)))
      .limit(1);

    if (!athlete) {
      return null;
    }

    if (!canAccessSquad(filters, { id: athlete.squadId, slug: athlete.squadSlug })) {
      return null;
    }

    return mapAthleteRecord(athlete);
  }

  public async listByTenant(tenantId: string, filters: AthleteVisibilityFilter = {}) {
    const squadSlug = filters.squadSlug;

    const rows = await this.db
      .select({
        athlete: athletes,
        squadId: squads.id,
        squadSlug: squads.slug,
        squadName: squads.name
      })
      .from(athletes)
      .leftJoin(
        athleteSquadAssignments,
        and(eq(athleteSquadAssignments.athleteId, athletes.id), isNull(athleteSquadAssignments.endedAt))
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .where(
        and(
          eq(athletes.tenantId, tenantId),
          eq(athletes.status, "active"),
          filters.squadId ? eq(squads.id, filters.squadId) : undefined,
          squadSlug ? eq(squads.slug, squadSlug) : undefined,
          buildVisibilityClause(filters)
        )
      )
      .orderBy(asc(athletes.lastName), asc(athletes.firstName));

    return rows.map(mapAthleteRecord);
  }
}

const buildVisibilityClause = (filters: AthleteVisibilityFilter) => {
  if (filters.accessScope !== "assigned_squads") {
    return undefined;
  }

  if (!filters.accessibleSquadIds || filters.accessibleSquadIds.length === 0) {
    return sql`false`;
  }

  return inArray(squads.id, filters.accessibleSquadIds);
};

const mapAthleteRecord = (row: {
  athlete: typeof athletes.$inferSelect;
  squadId: string | null;
  squadSlug: string | null;
  squadName: string | null;
}) => ({
  ...row.athlete,
  squad: row.squadName,
  currentSquad:
    row.squadId && row.squadSlug && row.squadName
      ? {
          id: row.squadId,
          slug: row.squadSlug,
          name: row.squadName
        }
      : null
});
