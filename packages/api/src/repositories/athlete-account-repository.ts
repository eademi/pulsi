import { and, eq, isNull } from "drizzle-orm";

import type { AthleteActorProfile } from "@pulsi/shared";

import type { Database, DbExecutor } from "../db/client";
import {
  athleteSquadAssignments,
  athleteAccounts,
  athletes,
  squads,
  tenants
} from "../db/schema";
import { AppError } from "../http/errors";

export class AthleteAccountRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: {
      athleteId: string;
      userId: string;
      linkedAt: Date;
    },
    executor: DbExecutor = this.db
  ) {
    const [account] = await executor
      .insert(athleteAccounts)
      .values({
        athleteId: input.athleteId,
        userId: input.userId,
        linkedAt: input.linkedAt
      })
      .returning();

    if (!account) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create athlete account");
    }

    return account;
  }

  public async findActiveByAthleteId(athleteId: string) {
    const [account] = await this.db
      .select()
      .from(athleteAccounts)
      .where(and(eq(athleteAccounts.athleteId, athleteId), eq(athleteAccounts.status, "active")))
      .limit(1);

    return account ?? null;
  }

  public async findAnyByAthleteId(athleteId: string) {
    const [account] = await this.db
      .select()
      .from(athleteAccounts)
      .where(eq(athleteAccounts.athleteId, athleteId))
      .limit(1);

    return account ?? null;
  }

  public async findActiveByUserId(userId: string) {
    const [account] = await this.db
      .select()
      .from(athleteAccounts)
      .where(and(eq(athleteAccounts.userId, userId), eq(athleteAccounts.status, "active")))
      .limit(1);

    return account ?? null;
  }

  public async updateStatusByAthleteId(
    athleteId: string,
    status: "active" | "revoked",
    executor: DbExecutor = this.db
  ) {
    return executor
      .update(athleteAccounts)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(athleteAccounts.athleteId, athleteId))
      .returning();
  }

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
      .from(athleteAccounts)
      .innerJoin(athletes, eq(athleteAccounts.athleteId, athletes.id))
      .innerJoin(tenants, eq(athletes.tenantId, tenants.id))
      .leftJoin(
        athleteSquadAssignments,
        and(
          eq(athleteSquadAssignments.athleteId, athletes.id),
          isNull(athleteSquadAssignments.endedAt)
        )
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .where(and(eq(athleteAccounts.userId, userId), eq(athleteAccounts.status, "active")))
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
