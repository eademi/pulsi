import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { AthleteManagementService } from "./athlete-management-service";

const createHarness = () => {
  const calls = {
    assignments: [] as Array<Record<string, unknown>>,
    athletes: [] as Array<Record<string, unknown>>
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
    squad: string | null;
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
    squad: "Seniors",
    status: "active",
    tenantId: "tenant-1",
    updatedAt: new Date("2026-03-10T08:00:00.000Z")
  };

  const db = {
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
    findByIdForTenant: async () => athlete,
    replaceActiveSquadAssignment: async (input: Record<string, unknown>) => {
      calls.assignments.push(input);
      return input;
    }
  };

  const squadRepository = {
    findByIdForTenant: async () => squad
  };

  return {
    calls,
    service: new AthleteManagementService(
      db as never,
      athleteRepository as never,
      squadRepository as never
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
    firstName: " Egzon ",
    lastName: " Ademi ",
    position: " Winger ",
    squadId: "squad-1",
    status: "active"
  });

  assert.equal(athlete?.firstName, "Egon");
  assert.equal(harness.calls.athletes[0]?.firstName, "Egzon");
  assert.equal(harness.calls.athletes[0]?.lastName, "Ademi");
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
