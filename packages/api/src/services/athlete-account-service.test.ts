import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { AthleteAccountService } from "./athlete-account-service";

const createHarness = () => {
  const calls = {
    createAccount: [] as Array<Record<string, unknown>>,
    createClaimLink: [] as Array<Record<string, unknown>>,
    markClaimed: [] as Array<Record<string, unknown>>,
    revokePending: [] as string[]
  };

  let athlete = {
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
    currentSquad: {
      id: "squad-1",
      name: "First Team",
      slug: "first-team"
    },
    externalRef: null,
    firstName: "Alex",
    id: "athlete-1",
    lastName: "Athlete",
    position: "Forward",
    squad: "First Team",
    status: "active" as const,
    tenantId: "tenant-1"
  };

  let activeAthleteAccountByAthleteId: null | { athleteId: string } = null;
  let activeAthleteAccountByUserId: null | { userId: string } = null;
  let claimLookup: null | {
    athleteFirstName: string;
    athleteLastName: string;
    claimLink: {
      athleteId: string;
      email: string;
      expiresAt: Date;
      id: string;
      tenantId: string;
    };
    currentSquadId: string | null;
    currentSquadName: string | null;
    currentSquadSlug: string | null;
    tenantName: string;
    tenantSlug: string;
  } = null;

  const db = {
    transaction: async <T>(callback: (_tx: unknown) => Promise<T>) => callback({})
  };

  const athleteRepository = {
    findByIdForTenant: async () => athlete
  };

  const athleteAccountRepository = {
    create: async (input: Record<string, unknown>) => {
      calls.createAccount.push(input);
      return input;
    },
    findActiveByAthleteId: async () => activeAthleteAccountByAthleteId,
    findActiveByUserId: async () => activeAthleteAccountByUserId
  };

  const athleteClaimRepository = {
    create: async (input: Record<string, unknown>) => {
      calls.createClaimLink.push(input);
      return {
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        expiresAt: input.expiresAt as Date,
        id: "claim-1",
        status: "pending" as const
      };
    },
    findPendingByTokenHash: async () => claimLookup,
    markClaimed: async (claimLinkId: string, claimedByUserId: string, claimedAt: Date) => {
      calls.markClaimed.push({ claimLinkId, claimedAt, claimedByUserId });
      return null;
    },
    markExpiredPendingLinks: async () => [],
    revokePendingForAthlete: async (athleteId: string) => {
      calls.revokePending.push(athleteId);
      return [];
    }
  };

  const readinessRepository = {
    listSnapshotsForAthletes: async () => []
  };

  const garminRepository = {
    findConnectionByAthlete: async () => null
  };

  return {
    calls,
    service: new AthleteAccountService(
      db as never,
      athleteRepository as never,
      athleteAccountRepository as never,
      athleteClaimRepository as never,
      readinessRepository as never,
      garminRepository as never,
      "http://localhost:3000"
    ),
    setActiveAthleteAccountByAthleteId(value: typeof activeAthleteAccountByAthleteId) {
      activeAthleteAccountByAthleteId = value;
    },
    setActiveAthleteAccountByUserId(value: typeof activeAthleteAccountByUserId) {
      activeAthleteAccountByUserId = value;
    },
    setAthlete(value: typeof athlete) {
      athlete = value;
    },
    setClaimLookup(value: typeof claimLookup) {
      claimLookup = value;
    }
  };
};

test("createClaimLink rejects athletes that already have a claimed account", async () => {
  const harness = createHarness();
  harness.setActiveAthleteAccountByAthleteId({
    athleteId: "athlete-1"
  });

  await assert.rejects(
    () =>
      harness.service.createClaimLink({
        tenantId: "tenant-1",
        athleteId: "athlete-1",
        email: "athlete@club.com",
        createdByUserId: "user-1",
        accessScope: "all_squads",
        accessibleSquadIds: []
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});

test("acceptClaim rejects staff accounts", async () => {
  const harness = createHarness();

  await assert.rejects(
    () =>
      harness.service.acceptClaim({
        token: "token-1",
        userId: "user-1",
        userEmail: "athlete@club.com",
        membershipCount: 1,
        actorType: "staff"
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});

test("acceptClaim rejects mismatched email addresses", async () => {
  const harness = createHarness();
  harness.setClaimLookup({
    athleteFirstName: "Alex",
    athleteLastName: "Athlete",
    claimLink: {
      athleteId: "athlete-1",
      email: "athlete@club.com",
      expiresAt: new Date("2026-03-20T08:00:00.000Z"),
      id: "claim-1",
      tenantId: "tenant-1"
    },
    currentSquadId: "squad-1",
    currentSquadName: "First Team",
    currentSquadSlug: "first-team",
    tenantName: "Example FC",
    tenantSlug: "example-fc"
  });

  await assert.rejects(
    () =>
      harness.service.acceptClaim({
        token: "token-1",
        userId: "user-1",
        userEmail: "other@club.com",
        membershipCount: 0,
        actorType: "staff"
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "FORBIDDEN");
      return true;
    }
  );
});

test("acceptClaim creates the athlete account and marks the claim as claimed", async () => {
  const harness = createHarness();
  harness.setClaimLookup({
    athleteFirstName: "Alex",
    athleteLastName: "Athlete",
    claimLink: {
      athleteId: "athlete-1",
      email: "athlete@club.com",
      expiresAt: new Date("2026-03-20T08:00:00.000Z"),
      id: "claim-1",
      tenantId: "tenant-1"
    },
    currentSquadId: "squad-1",
    currentSquadName: "First Team",
    currentSquadSlug: "first-team",
    tenantName: "Example FC",
    tenantSlug: "example-fc"
  });

  const result = await harness.service.acceptClaim({
    token: "token-1",
    userId: "user-1",
    userEmail: "athlete@club.com",
    membershipCount: 0,
    actorType: "staff",
    now: new Date("2026-03-10T09:00:00.000Z")
  });

  assert.deepEqual(result, { accepted: true });
  assert.equal(harness.calls.createAccount.length, 1);
  assert.equal(harness.calls.markClaimed.length, 1);
  assert.equal(harness.calls.markClaimed[0]?.claimLinkId, "claim-1");
});
