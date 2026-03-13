import type { CreateAthleteInput } from "@pulsi/shared";

import { AppError } from "../http/errors";
import type { AthleteAccountService } from "./athlete-account-service";
import type { AthleteManagementService } from "./athlete-management-service";

export class AthleteOnboardingService {
  public constructor(
    private readonly athleteManagementService: AthleteManagementService,
    private readonly athleteAccountService: AthleteAccountService
  ) {}

  public async createAthleteWithInvite(input: {
    tenantId: string;
    athlete: CreateAthleteInput;
    createdByUserId: string;
    accessScope: "all_squads" | "assigned_squads";
    accessibleSquadIds: string[];
  }) {
    const athlete = await this.athleteManagementService.createAthlete(input.tenantId, input.athlete);

    if (!athlete) {
      throw new AppError(500, "INTERNAL_ERROR", "Athlete could not be loaded after creation");
    }

    // Athlete creation and initial account onboarding are one product workflow.
    const invite = await this.athleteAccountService.createInvite({
      tenantId: input.tenantId,
      athleteId: athlete.id,
      email: input.athlete.email,
      createdByUserId: input.createdByUserId,
      accessScope: input.accessScope,
      accessibleSquadIds: input.accessibleSquadIds
    });

    return {
      athlete,
      invite
    };
  }
}
