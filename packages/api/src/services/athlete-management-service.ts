import type { CreateAthleteInput } from "@pulsi/shared";

import type { Database } from "../db/client";
import { AppError } from "../http/errors";
import type { AthleteRepository } from "../repositories/athlete-repository";
import type { SquadRepository } from "../repositories/squad-repository";

export class AthleteManagementService {
  public constructor(
    private readonly db: Database,
    private readonly athleteRepository: AthleteRepository,
    private readonly squadRepository: SquadRepository
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
}

const normalizeNullableText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
