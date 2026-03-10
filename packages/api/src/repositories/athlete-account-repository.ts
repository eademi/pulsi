import { and, eq, isNull } from "drizzle-orm";

import type { AthleteActorProfile } from "@pulsi/shared";

import type { Database } from "../db/client";
import {
  athleteSquadAssignments,
  athleteUserAccounts,
  athletes,
  squads,
  tenants
} from "../db/schema";

export class AthleteAccountRepository {
  public constructor(private readonly db: Database) {}

  public async findActiveProfileByUserId(userId: string): Promise<AthleteActorProfile | null> {
    const [record] = await this.db
      .select({
        athleteId: athletes.id,
        athleteFirstName: athletes.firstName,
        athleteLastName: athletes.lastName,
        athleteStatus: athletes.status,
        tenantId: tenants.id,
        tenantSlug: tenants.slug,
        tenantName: tenants.name,
        timezone: tenants.timezone,
        squadId: squads.id,
        squadSlug: squads.slug,
        squadName: squads.name
      })
      .from(athleteUserAccounts)
      .innerJoin(athletes, eq(athleteUserAccounts.athleteId, athletes.id))
      .innerJoin(tenants, eq(athletes.tenantId, tenants.id))
      .leftJoin(
        athleteSquadAssignments,
        and(
          eq(athleteSquadAssignments.athleteId, athletes.id),
          isNull(athleteSquadAssignments.endedAt)
        )
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .where(and(eq(athleteUserAccounts.userId, userId), eq(athleteUserAccounts.status, "active")))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      athleteId: record.athleteId,
      athleteName: `${record.athleteFirstName} ${record.athleteLastName}`,
      tenantId: record.tenantId,
      tenantSlug: record.tenantSlug,
      tenantName: record.tenantName,
      timezone: record.timezone,
      status: record.athleteStatus,
      currentSquad:
        record.squadId && record.squadSlug && record.squadName
          ? {
              id: record.squadId,
              slug: record.squadSlug,
              name: record.squadName
            }
          : null
    };
  }
}
