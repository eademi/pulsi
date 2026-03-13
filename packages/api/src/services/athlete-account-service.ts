import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne, or, sql } from "drizzle-orm";

import type { AthletePortal } from "@pulsi/shared";

import type { Database } from "../db/client";
import { athleteAccounts, athleteInvites, athletes, user } from "../db/schema";
import { AppError } from "../http/errors";
import type { AthleteAccountRepository } from "../repositories/athlete-account-repository";
import type { AthleteClaimRepository } from "../repositories/athlete-claim-repository";
import type { AthleteRepository } from "../repositories/athlete-repository";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { ReadinessRepository } from "../repositories/readiness-repository";

const CLAIM_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ATHLETE_TREND_WINDOW_DAYS = 7;

export class AthleteAccountService {
  public constructor(
    private readonly db: Database,
    private readonly athleteRepository: AthleteRepository,
    private readonly athleteAccountRepository: AthleteAccountRepository,
    private readonly athleteClaimRepository: AthleteClaimRepository,
    private readonly readinessRepository: ReadinessRepository,
    private readonly garminRepository: GarminRepository,
    private readonly clientUrl: string
  ) {}

  public async createClaimLink(input: {
    tenantId: string;
    athleteId: string;
    email: string;
    createdByUserId: string;
    accessScope: "all_squads" | "assigned_squads";
    accessibleSquadIds: string[];
    now?: Date;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const athlete = await this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId, {
      accessScope: input.accessScope,
      accessibleSquadIds: input.accessibleSquadIds
    });

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found in accessible squads");
    }

    const existingAccount = await this.athleteAccountRepository.findActiveByAthleteId(input.athleteId);
    if (existingAccount) {
      throw new AppError(409, "CONFLICT", "This athlete already has a claimed Pulsi account");
    }

    // Claim-link email is the durable identity checkpoint for athletes. Guard it
    // across tenant athlete identities so archived profiles are restored instead
    // of silently duplicating the same person under a new athlete record.
    const emailConflict = await this.findEmailConflict(input.tenantId, input.athleteId, normalizedEmail);
    if (emailConflict) {
      if (emailConflict.status === "inactive") {
        throw new AppError(
          409,
          "CONFLICT",
          "This email is already linked to an archived athlete profile. Restore that athlete instead of creating a new identity."
        );
      }

      throw new AppError(409, "CONFLICT", "This email is already linked to another athlete profile");
    }

    const now = input.now ?? new Date();
    const expiresAt = new Date(now.getTime() + CLAIM_LINK_TTL_MS);
    const rawToken = randomBytes(24).toString("hex");
    const tokenHash = hashClaimToken(rawToken);

    const claimLink = await this.db.transaction(async (tx) => {
      await this.athleteClaimRepository.markExpiredPendingLinks(now, tx);
      await this.athleteClaimRepository.revokePendingForAthlete(input.athleteId, tx);
      return this.athleteClaimRepository.create(
        {
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          email: normalizedEmail,
          tokenHash,
          expiresAt,
          createdByUserId: input.createdByUserId
        },
        tx
      );
    });

    return {
      id: claimLink.id,
      athleteId: athlete.id,
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      email: normalizedEmail,
      status: claimLink.status,
      claimUrl: buildClaimUrl(this.clientUrl, rawToken),
      expiresAt: claimLink.expiresAt.toISOString(),
      createdAt: claimLink.createdAt.toISOString()
    };
  }

  public async getClaimDetails(token: string, now = new Date()) {
    const claimLink = await this.athleteClaimRepository.findPendingByTokenHash(hashClaimToken(token));

    if (!claimLink) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete claim link not found");
    }

    if (claimLink.claimLink.expiresAt < now) {
      await this.athleteClaimRepository.markExpiredPendingLinks(now);
      throw new AppError(409, "CONFLICT", "Athlete claim link has expired");
    }

    return {
      token,
      athleteId: claimLink.claimLink.athleteId,
      athleteName: `${claimLink.athleteFirstName} ${claimLink.athleteLastName}`,
      email: claimLink.claimLink.email,
      tenantId: claimLink.claimLink.tenantId,
      tenantName: claimLink.tenantName,
      tenantSlug: claimLink.tenantSlug,
      currentSquad:
        claimLink.currentSquadId && claimLink.currentSquadSlug && claimLink.currentSquadName
          ? {
              id: claimLink.currentSquadId,
              slug: claimLink.currentSquadSlug,
              name: claimLink.currentSquadName
            }
          : null,
      expiresAt: claimLink.claimLink.expiresAt.toISOString()
    };
  }

  public async acceptClaim(input: {
    token: string;
    userId: string;
    userEmail: string;
    membershipCount: number;
    actorType: "staff" | "athlete";
    now?: Date;
  }) {
    if (input.actorType === "athlete") {
      throw new AppError(409, "CONFLICT", "This account is already linked to an athlete profile");
    }

    if (input.membershipCount > 0) {
      throw new AppError(409, "CONFLICT", "Staff accounts cannot claim athlete profiles");
    }

    const existingAthleteAccount = await this.athleteAccountRepository.findActiveByUserId(input.userId);
    if (existingAthleteAccount) {
      throw new AppError(409, "CONFLICT", "This account is already linked to an athlete profile");
    }

    const claimLink = await this.athleteClaimRepository.findPendingByTokenHash(hashClaimToken(input.token));

    if (!claimLink) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete claim link not found");
    }

    const now = input.now ?? new Date();
    if (claimLink.claimLink.expiresAt < now) {
      await this.athleteClaimRepository.markExpiredPendingLinks(now);
      throw new AppError(409, "CONFLICT", "Athlete claim link has expired");
    }

    if (claimLink.claimLink.email.toLowerCase() !== input.userEmail.trim().toLowerCase()) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "This athlete claim link was issued for a different email address"
      );
    }

    const existingLinkedAthlete = await this.athleteAccountRepository.findActiveByAthleteId(
      claimLink.claimLink.athleteId
    );
    if (existingLinkedAthlete) {
      throw new AppError(409, "CONFLICT", "This athlete profile has already been claimed");
    }

    await this.db.transaction(async (tx) => {
      await this.athleteAccountRepository.create(
        {
          athleteId: claimLink.claimLink.athleteId,
          userId: input.userId,
          claimedAt: now
        },
        tx
      );

      await this.athleteClaimRepository.markClaimed(
        claimLink.claimLink.id,
        input.userId,
        now,
        tx
      );
    });

    return {
      accepted: true
    };
  }

  public async getAthletePortal(athleteProfile: {
    athleteId: string;
    tenantId: string;
  }): Promise<AthletePortal> {
    const athlete = await this.athleteRepository.findByIdForTenant(
      athleteProfile.tenantId,
      athleteProfile.athleteId
    );

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete profile not found");
    }

    const snapshotRecords = await this.readinessRepository.listSnapshotsForAthletes({
      tenantId: athleteProfile.tenantId,
      athleteIds: [athleteProfile.athleteId]
    });
    const [snapshotRecord] = snapshotRecords;
    const garminConnection = await this.garminRepository.findConnectionByAthlete(
      athleteProfile.tenantId,
      athleteProfile.athleteId
    );
    const recentSnapshotRecords = snapshotRecords.slice(0, ATHLETE_TREND_WINDOW_DAYS);
    const trendSummary = buildTrendSummary(recentSnapshotRecords);

    return {
      athlete: {
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      },
      latestSnapshot: snapshotRecord
        ? {
            readinessBand: snapshotRecord.snapshot.readinessBand,
            readinessScore: snapshotRecord.snapshot.readinessScore,
            recommendation: snapshotRecord.snapshot.recommendation,
            recoveryTrend: snapshotRecord.snapshot.recoveryTrend,
            snapshotDate: snapshotRecord.snapshot.snapshotDate,
            rationale: snapshotRecord.snapshot.rationale,
            metrics: snapshotRecord.metric
              ? {
                  metricDate: snapshotRecord.metric.metricDate,
                  restingHeartRate: snapshotRecord.metric.restingHeartRate,
                  hrvNightlyMs: snapshotRecord.metric.hrvNightlyMs,
                  sleepDurationMinutes: snapshotRecord.metric.sleepDurationMinutes,
                  sleepScore: snapshotRecord.metric.sleepScore,
                  bodyBatteryHigh: snapshotRecord.metric.bodyBatteryHigh,
                  bodyBatteryLow: snapshotRecord.metric.bodyBatteryLow,
                  stressAverage: snapshotRecord.metric.stressAverage,
                  trainingReadiness: snapshotRecord.metric.trainingReadiness
                }
              : null
          }
        : {
            readinessBand: null,
            readinessScore: null,
            recommendation: null,
            recoveryTrend: null,
            snapshotDate: null,
            rationale: [],
            metrics: null
          },
      trendSummary,
      recentSnapshots: recentSnapshotRecords.map((record) => ({
        snapshotDate: record.snapshot.snapshotDate,
        readinessScore: record.snapshot.readinessScore,
        readinessBand: record.snapshot.readinessBand
      })),
      syncStatus: {
        garminConnected: Boolean(garminConnection),
        lastSuccessfulSyncAt: garminConnection?.lastSuccessfulSyncAt?.toISOString() ?? null,
        lastPermissionsSyncAt: garminConnection?.lastPermissionsSyncAt?.toISOString() ?? null
      },
      garminConnected: Boolean(garminConnection)
    };
  }

  private async findEmailConflict(tenantId: string, athleteId: string, email: string) {
    const [accountConflict] = await this.db
      .select({
        athleteId: athletes.id,
        status: athletes.status
      })
      .from(athleteAccounts)
      .innerJoin(athletes, eq(athleteAccounts.athleteId, athletes.id))
      .innerJoin(user, eq(athleteAccounts.userId, user.id))
      .where(
        and(
          eq(athletes.tenantId, tenantId),
          ne(athletes.id, athleteId),
          sql`lower(${user.email}) = ${email}`
        )
      )
      .limit(1);

    if (accountConflict) {
      return accountConflict;
    }

    const [claimConflict] = await this.db
      .select({
        athleteId: athletes.id,
        status: athletes.status
      })
      .from(athleteInvites)
      .innerJoin(athletes, eq(athleteInvites.athleteId, athletes.id))
      .where(
        and(
          eq(athleteInvites.tenantId, tenantId),
          ne(athleteInvites.athleteId, athleteId),
          eq(athleteInvites.email, email),
          or(eq(athleteInvites.status, "pending"), eq(athleteInvites.status, "claimed"))
        )
      )
      .limit(1);

    return claimConflict ?? null;
  }
}

const hashClaimToken = (token: string) => createHash("sha256").update(token).digest("hex");

const buildClaimUrl = (clientUrl: string, token: string) =>
  new URL(`/athlete/claim/${token}`, clientUrl).toString();

const buildTrendSummary = (
  records: Awaited<ReturnType<ReadinessRepository["listSnapshotsForAthletes"]>>
) => {
  const readinessScores = records.map((record) => record.snapshot.readinessScore);
  const sleepDurations = records
    .map((record) => record.metric?.sleepDurationMinutes ?? null)
    .filter((value): value is number => value !== null);
  const hrvValues = records
    .map((record) => record.metric?.hrvNightlyMs ?? null)
    .filter((value): value is number => value !== null);

  const latestScore = readinessScores[0] ?? null;
  const previousScore = readinessScores[1] ?? null;
  const bandCounts = {
    ready: 0,
    caution: 0,
    restricted: 0
  };

  // Count readiness bands over the recent window so the athlete UI can show
  // trend balance without exposing other squad members or staff-only framing.
  for (const record of records) {
    bandCounts[record.snapshot.readinessBand] += 1;
  }

  return {
    windowDays: ATHLETE_TREND_WINDOW_DAYS,
    daysWithData: records.length,
    averageReadinessScore: average(readinessScores),
    readinessDelta:
      latestScore !== null && previousScore !== null ? latestScore - previousScore : null,
    averageSleepDurationMinutes: average(sleepDurations),
    averageHrvNightlyMs: average(hrvValues),
    bandCounts
  };
};

const average = (values: number[]) => {
  if (values.length === 0) {
    return null;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
};
