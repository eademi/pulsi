import assert from "node:assert/strict";
import test from "node:test";

import { AthleteOnboardingService } from "./athlete-onboarding-service";

test("createAthleteWithInvite creates the athlete and immediately issues the first invite", async () => {
  const calls: Array<Record<string, unknown>> = [];

  const athleteManagementService = {
    createAthlete: async (tenantId: string, athlete: Record<string, unknown>) => {
      calls.push({ step: "createAthlete", tenantId, athlete });
      return {
        id: "athlete-1",
        tenantId,
        firstName: "Egzon",
        lastName: "Ademi",
        status: "active",
        position: null,
        externalRef: null,
        currentSquad: {
          id: "squad-1",
          name: "Senior",
          slug: "senior"
        },
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-10T08:00:00.000Z")
      };
    }
  };

  const athleteAccountService = {
    createInvite: async (input: Record<string, unknown>) => {
      calls.push({ step: "createInvite", ...input });
      return {
        id: "invite-1",
        athleteId: "athlete-1",
        athleteName: "Egzon Ademi",
        email: "egzon@pulsi.com",
        status: "pending",
        inviteUrl: "http://localhost:3000/athlete/setup/token-1",
        expiresAt: "2026-03-17T08:00:00.000Z",
        createdAt: "2026-03-10T08:00:00.000Z"
      };
    }
  };

  const service = new AthleteOnboardingService(
    athleteManagementService as never,
    athleteAccountService as never
  );

  const result = await service.createAthleteWithInvite({
    tenantId: "tenant-1",
    athlete: {
      firstName: "Egzon",
      lastName: "Ademi",
      email: "egzon@pulsi.com",
      squadId: "squad-1",
      status: "active"
    },
    createdByUserId: "user-1",
    accessScope: "all_squads",
    accessibleSquadIds: []
  });

  assert.equal(result.athlete.id, "athlete-1");
  assert.equal(result.invite.id, "invite-1");
  assert.equal(calls[0]?.step, "createAthlete");
  assert.equal(calls[1]?.step, "createInvite");
  assert.equal(calls[1]?.athleteId, "athlete-1");
});
