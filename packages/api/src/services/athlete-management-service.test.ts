import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { AthleteManagementService } from "./athlete-management-service";

const createHarness = () => {
  const calls = {
    assignments: [] as Array<Record<string, unknown>>,
    archived: [] as Array<Record<string, unknown>>,
    athletes: [] as Array<Record<string, unknown>>,
    deleted: [] as Array<Record<string, unknown>>,
    endedAssignments: [] as Array<Record<string, unknown>>,
    restoredAccounts: [] as Array<Record<string, unknown>>,
    revokedAccounts: [] as Array<Record<string, unknown>>,
    revokedInvites: [] as string[],
    revokedConnections: [] as string[][]
  };

  let squad: null | { id: string; status: "active" | "inactive" } = {
    id: "squad-1",
    status: "active"
  };
  let athlete: null | {
    id: string;
    createdAt: Date;
    currentSquad: { id: string; name: string; slug: string } | null;
    externalRef: string | null;
    firstName: string;
    lastName: string;
    position: string | null;
    status: "active" | "inactive" | "rehab";
    tenantId: string;
    updatedAt: Date;
  } = {
    id: "athlete-1",
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
    currentSquad: { id: "squad-1", name: "Seniors", slug: "seniors" },
    externalRef: null,
    firstName: "Egon",
    lastName: "Ademi",
    position: "Midfielder",
    status: "active",
    tenantId: "tenant-1",
    updatedAt: new Date("2026-03-10T08:00:00.000Z")
  };

  const db = {
    execute: async () => [{ activity_count: 0, health_count: 0, metrics_count: 0, snapshot_count: 0 }],
    transaction: async <T>(callback: (_tx: unknown) => Promise<T>) => callback({})
  };

  const athleteRepository = {
    create: async (input: Record<string, unknown>) => {
      calls.athletes.push(input);
      return {
        id: "athlete-1",
        tenantId: "tenant-1",
        firstName: input.firstName as string,
        lastName: input.lastName as string,
        externalRef: (input.externalRef as string | null | undefined) ?? null,
        position: (input.position as string | null | undefined) ?? null,
        status: input.status as "active" | "inactive" | "rehab",
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-10T08:00:00.000Z")
      };
    },
    deleteById: async (_tenantId: string, athleteId: string) => {
      calls.deleted.push({ athleteId });
      return { id: athleteId };
    },
    endActiveSquadAssignment: async (input: Record<string, unknown>) => {
      calls.endedAssignments.push(input);
      return input;
    },
    findByIdForTenant: async () => athlete,
    replaceActiveSquadAssignment: async (input: Record<string, unknown>) => {
      calls.assignments.push(input);
      return input;
    },
    updateStatus: async (_tenantId: string, athleteId: string, status: "active" | "inactive" | "rehab") => {
      calls.archived.push({ athleteId, status });
      athlete = athlete
        ? {
          ...athlete,
          status,
          currentSquad: status === "inactive" ? null : athlete.currentSquad
        }
        : athlete;
      return athlete;
    }
  };

  const athleteAccountRepository = {
    findAnyByAthleteId: async () => null,
    updateStatusByAthleteId: async (_athleteId: string, status: "active" | "revoked") => {
      if (status === "active") {
        calls.restoredAccounts.push({ status });
      } else {
        calls.revokedAccounts.push({ status });
      }
      return [];
    }
  };

  const athleteInviteRepository = {
    revokePendingForAthlete: async (athleteId: string) => {
      calls.revokedInvites.push(athleteId);
      return [];
    }
  };

  const garminRepository = {
    deactivateConnectionsByIds: async (connectionIds: string[]) => {
      calls.revokedConnections.push(connectionIds);
      return [];
    },
    listConnectionsByAthlete: async () => []
  };

  const squadRepository = {
    findByIdForTenant: async () => squad
  };

  return {
    calls,
    service: new AthleteManagementService(
      db as never,
      athleteRepository as never,
      squadRepository as never,
      athleteAccountRepository as never,
      athleteInviteRepository as never,
      garminRepository as never
    ),
    setAthlete(value: typeof athlete) {
      athlete = value;
    },
    setSquad(value: typeof squad) {
      squad = value;
    }
  };
};

test("createAthlete trims input and assigns the athlete to the selected squad", async () => {
  const harness = createHarness();

  const athlete = await harness.service.createAthlete("tenant-1", {
    externalRef: "  ext-10  ",
    firstName: " Lionel",
    lastName: " Messi ",
    email: "lionel@pulsi.com",
    position: " Winger ",
    squadId: "squad-1",
    status: "active"
  });

  assert.equal(athlete?.firstName, "Lionel");
  assert.equal(harness.calls.athletes[0]?.firstName, "Lionel");
  assert.equal(harness.calls.athletes[0]?.lastName, "Messi");
  assert.equal(harness.calls.athletes[0]?.position, "Winger");
  assert.equal(harness.calls.athletes[0]?.externalRef, "ext-10");
  assert.equal(harness.calls.assignments.length, 1);
});

test("assignAthleteToSquad rejects inaccessible athletes", async () => {
  const harness = createHarness();
  harness.setAthlete(null);

  await assert.rejects(
    () =>
      harness.service.assignAthleteToSquad({
        accessScope: "assigned_squads",
        accessibleSquadIds: ["squad-1"],
        athleteId: "athlete-1",
        squadId: "squad-2",
        tenantId: "tenant-1"
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "RESOURCE_NOT_FOUND");
      return true;
    }
  );
});

test("archiveAthlete marks the athlete inactive and revokes lifecycle state", async () => {
  const harness = createHarness();

  const athlete = await harness.service.archiveAthlete({
    accessScope: "all_squads",
    accessibleSquadIds: [],
    athleteId: "athlete-1",
    tenantId: "tenant-1"
  });

  assert.equal(athlete.status, "inactive");
  assert.equal(harness.calls.revokedInvites[0], "athlete-1");
  assert.equal(harness.calls.revokedAccounts.length, 1);
  assert.equal(harness.calls.endedAssignments.length, 1);
});

test("restoreAthlete reactivates the athlete, squad assignment, and athlete account access", async () => {
  const harness = createHarness();
  harness.setAthlete({
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
    currentSquad: null,
    externalRef: null,
    firstName: "Egon",
    id: "athlete-1",
    lastName: "Ademi",
    position: "Midfielder",
    status: "inactive",
    tenantId: "tenant-1",
    updatedAt: new Date("2026-03-10T08:00:00.000Z")
  });

  const athlete = await harness.service.restoreAthlete({
    accessScope: "all_squads",
    accessibleSquadIds: [],
    athleteId: "athlete-1",
    squadId: "squad-1",
    tenantId: "tenant-1"
  });

  assert.equal(athlete.status, "active");
  assert.equal(harness.calls.restoredAccounts.length, 1);
  assert.equal(harness.calls.assignments.length, 1);
});

test("deleteAthlete rejects active athletes before permanent deletion", async () => {
  const harness = createHarness();

  await assert.rejects(
    () =>
      harness.service.deleteAthlete({
        accessScope: "all_squads",
        athleteId: "athlete-1",
        tenantId: "tenant-1"
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});
