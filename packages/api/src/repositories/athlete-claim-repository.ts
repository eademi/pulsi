import { and, eq, isNull, lt } from "drizzle-orm";

import type { Database, DbExecutor } from "../db/client";
import { athleteInvites, athletes, squads, tenants } from "../db/schema";
import { AppError } from "../http/errors";
import { athleteSquadAssignments } from "../db/schema";

export class AthleteClaimRepository {
  public constructor(private readonly db: Database) {}

  public async create(
    input: {
      tenantId: string;
      athleteId: string;
      email: string;
      tokenHash: string;
      expiresAt: Date;
      createdByUserId: string;
    },
    executor: DbExecutor = this.db
  ) {
    const [claimLink] = await executor
      .insert(athleteInvites)
      .values({
        tenantId: input.tenantId,
        athleteId: input.athleteId,
        email: input.email,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdByUserId: input.createdByUserId
      })
      .returning();

    if (!claimLink) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create athlete claim link");
    }

    return claimLink;
  }

  public async revokePendingForAthlete(athleteId: string, executor: DbExecutor = this.db) {
    return executor
      .update(athleteInvites)
      .set({
        status: "revoked",
        updatedAt: new Date()
      })
      .where(and(eq(athleteInvites.athleteId, athleteId), eq(athleteInvites.status, "pending")))
      .returning();
  }

  public async markExpiredPendingLinks(now: Date, executor: DbExecutor = this.db) {
    return executor
      .update(athleteInvites)
      .set({
        status: "expired",
        updatedAt: now
      })
      .where(
        and(
          eq(athleteInvites.status, "pending"),
          lt(athleteInvites.expiresAt, now)
        )
      )
      .returning();
  }

  public async findPendingByTokenHash(tokenHash: string) {
    const [claimLink] = await this.db
      .select({
        claimLink: athleteInvites,
        athleteFirstName: athletes.firstName,
        athleteLastName: athletes.lastName,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        currentSquadId: squads.id,
        currentSquadSlug: squads.slug,
        currentSquadName: squads.name
      })
      .from(athleteInvites)
      .innerJoin(athletes, eq(athleteInvites.athleteId, athletes.id))
      .innerJoin(tenants, eq(athleteInvites.tenantId, tenants.id))
      .leftJoin(
        athleteSquadAssignments,
        and(
          eq(athleteSquadAssignments.athleteId, athletes.id),
          isNull(athleteSquadAssignments.endedAt)
        )
      )
      .leftJoin(squads, eq(athleteSquadAssignments.squadId, squads.id))
      .where(and(eq(athleteInvites.tokenHash, tokenHash), eq(athleteInvites.status, "pending")))
      .limit(1);

    return claimLink ?? null;
  }

  public async markClaimed(
    claimLinkId: string,
    claimedByUserId: string,
    claimedAt: Date,
    executor: DbExecutor = this.db
  ) {
    const [claimLink] = await executor
      .update(athleteInvites)
      .set({
        status: "claimed",
        claimedByUserId,
        claimedAt,
        updatedAt: claimedAt
      })
      .where(eq(athleteInvites.id, claimLinkId))
      .returning();

    if (!claimLink) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to mark athlete claim link as claimed");
    }

    return claimLink;
  }
}
