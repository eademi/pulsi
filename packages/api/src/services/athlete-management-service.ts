import { sql } from "drizzle-orm";

import type { CreateAthleteInput } from "@pulsi/shared";

import type { Database } from "../db/client";
import {
  providerActivitySummaries,
  providerHealthSummaries,
  readinessSnapshots,
  wearableDailyMetrics
} from "../db/schema";
import { AppError } from "../http/errors";
import type { AthleteAccountRepository } from "../repositories/athlete-account-repository";
import type { AthleteClaimRepository } from "../repositories/athlete-claim-repository";
import type { AthleteRepository } from "../repositories/athlete-repository";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { SquadRepository } from "../repositories/squad-repository";

export class AthleteManagementService {
  public constructor(
    private readonly db: Database,
    private readonly athleteRepository: AthleteRepository,
    private readonly squadRepository: SquadRepository,
    private readonly athleteAccountRepository: AthleteAccountRepository,
    private readonly athleteClaimRepository: AthleteClaimRepository,
    private readonly garminRepository: GarminRepository
  ) {}

  public async createAthlete(tenantId: string, input: CreateAthleteInput) {
    const squad = await this.squadRepository.findByIdForTenant(tenantId, input.squadId);

    if (!squad || squad.status !== "active") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Squad not found");
    }

    return this.db.transaction(async (tx) => {
      const athlete = await this.athleteRepository.create(
        {
          tenantId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          externalRef: normalizeNullableText(input.externalRef),
          position: normalizeNullableText(input.position),
          status: input.status
        },
        tx
      );

      await this.athleteRepository.replaceActiveSquadAssignment(
        {
          tenantId,
          athleteId: athlete.id,
          squadId: squad.id,
          startedAt: new Date()
        },
        tx
      );

      // Read the athlete back through the same transaction so the confirmation
      // query can see the newly inserted row and active squad assignment.
      return this.athleteRepository.findByIdForTenant(tenantId, athlete.id, {}, tx);
    });
  }

  public async assignAthleteToSquad(input: {
    tenantId: string;
    athleteId: string;
    squadId: string;
    accessScope: "all_squads" | "assigned_squads";
    accessibleSquadIds: string[];
  }) {
    const athlete = await this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId, {
      accessScope: input.accessScope,
      accessibleSquadIds: input.accessibleSquadIds
    });

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found in accessible squads");
    }

    const targetSquad = await this.squadRepository.findByIdForTenant(input.tenantId, input.squadId);

    if (!targetSquad || targetSquad.status !== "active") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Target squad not found");
    }

    await this.db.transaction(async (tx) => {
      await this.athleteRepository.replaceActiveSquadAssignment(
        {
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          squadId: input.squadId,
          startedAt: new Date()
        },
        tx
      );
    });

    const updatedAthlete = await this.athleteRepository.findByIdForTenant(
      input.tenantId,
      input.athleteId,
      {
        accessScope: input.accessScope,
        accessibleSquadIds: input.accessibleSquadIds
      }
    );

    if (!updatedAthlete) {
      throw new AppError(403, "FORBIDDEN", "Athlete moved outside your accessible squads");
    }

    return updatedAthlete;
  }

  public async archiveAthlete(input: {
    tenantId: string;
    athleteId: string;
    accessScope: "all_squads" | "assigned_squads";
    accessibleSquadIds: string[];
  }) {
    const athlete = await this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId, {
      accessScope: input.accessScope,
      accessibleSquadIds: input.accessibleSquadIds
    });

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found in accessible squads");
    }

    if (athlete.status === "inactive") {
      throw new AppError(409, "CONFLICT", "This athlete is already archived");
    }

    const archivedAthlete = await this.db.transaction(async (tx) => {
      const now = new Date();

      await this.athleteRepository.updateStatus(input.tenantId, input.athleteId, "inactive", tx);
      await this.athleteRepository.endActiveSquadAssignment(
        {
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          endedAt: now
        },
        tx
      );

      await this.athleteClaimRepository.revokePendingForAthlete(input.athleteId, tx);
      await this.athleteAccountRepository.updateStatusByAthleteId(input.athleteId, "revoked", tx);

      const garminConnections = await this.garminRepository.listConnectionsByAthlete(input.tenantId, input.athleteId);
      await this.garminRepository.deactivateConnectionsByIds(garminConnections.map((connection) => connection.id));

      return this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId, {}, tx);
    });

    if (!archivedAthlete) {
      throw new AppError(500, "INTERNAL_ERROR", "Athlete could not be loaded after archiving");
    }

    return archivedAthlete;
  }

  public async restoreAthlete(input: {
    tenantId: string;
    athleteId: string;
    squadId: string;
    accessScope: "all_squads" | "assigned_squads";
    accessibleSquadIds: string[];
  }) {
    const athlete = await this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId);

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found");
    }

    if (input.accessScope === "assigned_squads" && !input.accessibleSquadIds.includes(input.squadId)) {
      throw new AppError(403, "FORBIDDEN", "You cannot restore an athlete into an inaccessible squad");
    }

    if (athlete.status !== "inactive") {
      throw new AppError(409, "CONFLICT", "Only archived athletes can be restored");
    }

    const squad = await this.squadRepository.findByIdForTenant(input.tenantId, input.squadId);

    if (!squad || squad.status !== "active") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Target squad not found");
    }

    const restoredAthlete = await this.db.transaction(async (tx) => {
      await this.athleteRepository.updateStatus(input.tenantId, input.athleteId, "active", tx);
      await this.athleteRepository.replaceActiveSquadAssignment(
        {
          tenantId: input.tenantId,
          athleteId: input.athleteId,
          squadId: input.squadId,
          startedAt: new Date()
        },
        tx
      );

      await this.athleteAccountRepository.updateStatusByAthleteId(input.athleteId, "active", tx);

      return this.athleteRepository.findByIdForTenant(
        input.tenantId,
        input.athleteId,
        {
          accessScope: input.accessScope,
          accessibleSquadIds: input.accessibleSquadIds
        },
        tx
      );
    });

    if (!restoredAthlete) {
      throw new AppError(500, "INTERNAL_ERROR", "Athlete could not be loaded after restoration");
    }

    return restoredAthlete;
  }

  public async deleteAthlete(input: {
    tenantId: string;
    athleteId: string;
    accessScope: "all_squads" | "assigned_squads";
  }) {
    if (input.accessScope !== "all_squads") {
      throw new AppError(403, "FORBIDDEN", "Only full-organization staff can permanently delete athletes");
    }

    const athlete = await this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId);

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found");
    }

    if (athlete.status !== "inactive") {
      throw new AppError(409, "CONFLICT", "Archive the athlete before permanent deletion");
    }

    const account = await this.athleteAccountRepository.findAnyByAthleteId(input.athleteId);
    if (account) {
      throw new AppError(409, "CONFLICT", "This athlete has or had a Pulsi account and cannot be permanently deleted");
    }

    const connections = await this.garminRepository.listConnectionsByAthlete(input.tenantId, input.athleteId);
    if (connections.length > 0) {
      throw new AppError(409, "CONFLICT", "Disconnect Garmin history before deleting this athlete permanently");
    }

    const historyCounts = await this.db.execute(sql`
      select
        (select count(*) from ${wearableDailyMetrics} where ${wearableDailyMetrics.athleteId} = ${input.athleteId})::int as metrics_count,
        (select count(*) from ${providerHealthSummaries} where ${providerHealthSummaries.athleteId} = ${input.athleteId})::int as health_count,
        (select count(*) from ${providerActivitySummaries} where ${providerActivitySummaries.athleteId} = ${input.athleteId})::int as activity_count,
        (select count(*) from ${readinessSnapshots} where ${readinessSnapshots.athleteId} = ${input.athleteId})::int as snapshot_count
    `);

    const history = historyCounts[0] as
      | {
          activity_count: number;
          health_count: number;
          metrics_count: number;
          snapshot_count: number;
        }
      | undefined;

    const totalHistory =
      (history?.metrics_count ?? 0) +
      (history?.health_count ?? 0) +
      (history?.activity_count ?? 0) +
      (history?.snapshot_count ?? 0);

    // Permanent deletion is reserved for mistaken, clean records only.
    if (totalHistory > 0) {
      throw new AppError(409, "CONFLICT", "This athlete has historical data and should be archived instead of deleted");
    }

    await this.db.transaction(async (tx) => {
      await this.athleteClaimRepository.revokePendingForAthlete(input.athleteId, tx);
      await this.athleteRepository.deleteById(input.tenantId, input.athleteId, tx);
    });

    return {
      athleteId: input.athleteId,
      deleted: true
    };
  }
}

const normalizeNullableText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
