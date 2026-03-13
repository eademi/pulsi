import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { TenantAccessScope } from "@pulsi/shared";

import type { Database, DbExecutor } from "../db/client";
import { athleteAccounts, athleteInvites, athleteSquadAssignments, athletes, squads, user } from "../db/schema";
import { buildAthleteAccountDetails, deriveAthleteAccountState, type AthleteRosterStateRow } from "../domain/athlete-roster-state";
import { canAccessSquad } from "../domain/squad-access";
import { AppError } from "../http/errors";

export interface AthleteVisibilityFilter {
  accessScope?: TenantAccessScope;
  accessibleSquadIds?: string[];
  status?: "active" | "inactive" | "rehab" | "all";
  squadId?: string;
  squadSlug?: string;
}

export class AthleteRepository {
  public constructor(private readonly db: Database) {}

  public async findByIdForTenant(
    tenantId: string,
    athleteId: string,
    filters: AthleteVisibilityFilter = {},
    executor: DbExecutor = this.db
  ) {
    const [athlete] = await executor
      .select({
        athlete: athletes,
        squadId: squads.id,
        squadSlug: squads.slug,
        squadName: squads.name,
        athleteAccountUserId: athleteAccounts.userId,
        athleteAccountName: user.name,
        athleteAccountEmail: user.email,
        athleteAccountClaimedAt: athleteAccounts.claimedAt,
        pendingClaimLinkId: athleteInvites.id,
        pendingClaimEmail: athleteInvites.email,
        pendingClaimExpiresAt: athleteInvites.expiresAt
      })
      .from(athletes)
      .leftJoin(
        athleteSquadAssignments,
        and(eq(athleteSquadAssignments.athleteId, athletes.id), isNull(athleteSquadAssignments.endedAt))
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .leftJoin(
        athleteAccounts,
        // Roster views should preserve historical athlete-account linkage even
        // after archive revokes login access, so staff can still see that the
        // athlete had already claimed a Pulsi account.
        eq(athleteAccounts.athleteId, athletes.id)
      )
      .leftJoin(user, eq(athleteAccounts.userId, user.id))
      .leftJoin(
        athleteInvites,
        and(eq(athleteInvites.athleteId, athletes.id), eq(athleteInvites.status, "pending"))
      )
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
        squadName: squads.name,
        athleteAccountUserId: athleteAccounts.userId,
        athleteAccountName: user.name,
        athleteAccountEmail: user.email,
        athleteAccountClaimedAt: athleteAccounts.claimedAt,
        pendingClaimLinkId: athleteInvites.id,
        pendingClaimEmail: athleteInvites.email,
        pendingClaimExpiresAt: athleteInvites.expiresAt
      })
      .from(athletes)
      .leftJoin(
        athleteSquadAssignments,
        and(eq(athleteSquadAssignments.athleteId, athletes.id), isNull(athleteSquadAssignments.endedAt))
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .leftJoin(
        athleteAccounts,
        // Roster views should preserve historical athlete-account linkage even
        // after archive revokes login access, so staff can still see that the
        // athlete had already claimed a Pulsi account.
        eq(athleteAccounts.athleteId, athletes.id)
      )
      .leftJoin(user, eq(athleteAccounts.userId, user.id))
      .leftJoin(
        athleteInvites,
        and(eq(athleteInvites.athleteId, athletes.id), eq(athleteInvites.status, "pending"))
      )
      .where(
        and(
          eq(athletes.tenantId, tenantId),
          filters.status && filters.status !== "all" ? eq(athletes.status, filters.status) : undefined,
          !filters.status ? eq(athletes.status, "active") : undefined,
          filters.squadId ? eq(squads.id, filters.squadId) : undefined,
          squadSlug ? eq(squads.slug, squadSlug) : undefined,
          buildVisibilityClause(filters)
        )
      )
      .orderBy(asc(athletes.lastName), asc(athletes.firstName));

    return rows.map(mapAthleteRecord);
  }

  public async create(
    input: {
      tenantId: string;
      firstName: string;
      lastName: string;
      externalRef?: string | null;
      position?: string | null;
      status: "active" | "inactive" | "rehab";
    },
    executor: DbExecutor = this.db
  ) {
    const [athlete] = await executor
      .insert(athletes)
      .values({
        tenantId: input.tenantId,
        firstName: input.firstName,
        lastName: input.lastName,
        externalRef: input.externalRef ?? null,
        position: input.position ?? null,
        status: input.status
      })
      .returning();

    if (!athlete) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create athlete");
    }

    return athlete;
  }

  public async replaceActiveSquadAssignment(
    input: {
      tenantId: string;
      athleteId: string;
      squadId: string;
      startedAt: Date;
    },
    executor: DbExecutor = this.db
  ) {
    // End any existing active assignment before creating the next one so
    // athletes cannot end up active in two squads at the same time.
    await executor
      .update(athleteSquadAssignments)
      .set({
        endedAt: input.startedAt,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(athleteSquadAssignments.tenantId, input.tenantId),
          eq(athleteSquadAssignments.athleteId, input.athleteId),
          isNull(athleteSquadAssignments.endedAt)
        )
      );

    const [assignment] = await executor
      .insert(athleteSquadAssignments)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        squadId: input.squadId,
        startedAt: input.startedAt
      })
      .returning();

    if (!assignment) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to assign athlete to squad");
    }

    return assignment;
  }

  public async endActiveSquadAssignment(
    input: {
      tenantId: string;
      athleteId: string;
      endedAt: Date;
    },
    executor: DbExecutor = this.db
  ) {
    return executor
      .update(athleteSquadAssignments)
      .set({
        endedAt: input.endedAt,
        updatedAt: input.endedAt
      })
      .where(
        and(
          eq(athleteSquadAssignments.tenantId, input.tenantId),
          eq(athleteSquadAssignments.athleteId, input.athleteId),
          isNull(athleteSquadAssignments.endedAt)
        )
      )
      .returning();
  }

  public async updateStatus(
    tenantId: string,
    athleteId: string,
    status: "active" | "inactive" | "rehab",
    executor: DbExecutor = this.db
  ) {
    const [athlete] = await executor
      .update(athletes)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(and(eq(athletes.tenantId, tenantId), eq(athletes.id, athleteId)))
      .returning();

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found");
    }

    return athlete;
  }

  public async deleteById(tenantId: string, athleteId: string, executor: DbExecutor = this.db) {
    const [athlete] = await executor
      .delete(athletes)
      .where(and(eq(athletes.tenantId, tenantId), eq(athletes.id, athleteId)))
      .returning();

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found");
    }

    return athlete;
  }

  public async findMostRecentSquadAssignment(tenantId: string, athleteId: string) {
    const [assignment] = await this.db
      .select({
        squadId: squads.id,
        squadName: squads.name,
        squadSlug: squads.slug
      })
      .from(athleteSquadAssignments)
      .innerJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .where(
        and(
          eq(athleteSquadAssignments.tenantId, tenantId),
          eq(athleteSquadAssignments.athleteId, athleteId)
        )
      )
      .orderBy(desc(athleteSquadAssignments.startedAt))
      .limit(1);

    return assignment ?? null;
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
  athleteAccountUserId: string | null;
  athleteAccountName: string | null;
  athleteAccountEmail: string | null;
  athleteAccountClaimedAt: Date | null;
  pendingClaimLinkId: string | null;
  pendingClaimEmail: string | null;
  pendingClaimExpiresAt: Date | null;
}) => ({
  ...row.athlete,
  accountState: deriveAthleteAccountState(row satisfies AthleteRosterStateRow),
  accountDetails: buildAthleteAccountDetails(row satisfies AthleteRosterStateRow),
  currentSquad:
    row.squadId && row.squadSlug && row.squadName
      ? {
          id: row.squadId,
          slug: row.squadSlug,
          name: row.squadName
        }
      : null
});
