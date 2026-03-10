import { createHash, randomBytes } from "node:crypto";

import type { AthletePortal } from "@pulsi/shared";

import type { Database } from "../db/client";
import { AppError } from "../http/errors";
import type { AthleteAccountRepository } from "../repositories/athlete-account-repository";
import type { AthleteClaimRepository } from "../repositories/athlete-claim-repository";
import type { AthleteRepository } from "../repositories/athlete-repository";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { ReadinessRepository } from "../repositories/readiness-repository";

const CLAIM_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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
          email: input.email.trim().toLowerCase(),
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
      email: input.email.trim().toLowerCase(),
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

    const [snapshotRecord] = await this.readinessRepository.listSnapshotsForAthletes({
      tenantId: athleteProfile.tenantId,
      athleteIds: [athleteProfile.athleteId]
    });
    const garminConnection = await this.garminRepository.findConnectionByAthlete(
      athleteProfile.tenantId,
      athleteProfile.athleteId
    );

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
            snapshotDate: snapshotRecord.snapshot.snapshotDate,
            rationale: snapshotRecord.snapshot.rationale
          }
        : {
            readinessBand: null,
            readinessScore: null,
            recommendation: null,
            snapshotDate: null,
            rationale: []
          },
      garminConnected: Boolean(garminConnection)
    };
  }
}

const hashClaimToken = (token: string) => createHash("sha256").update(token).digest("hex");

const buildClaimUrl = (clientUrl: string, token: string) =>
  new URL(`/athlete/claim/${token}`, clientUrl).toString();
