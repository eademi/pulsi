import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { AthleteAccountService } from "./athlete-account-service";

const createHarness = () => {
  const calls = {
    createAccount: [] as Array<Record<string, unknown>>,
    createInvite: [] as Array<Record<string, unknown>>,
    markAccepted: [] as Array<Record<string, unknown>>,
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
    status: "active" as const,
    tenantId: "tenant-1"
  };

  let activeAthleteAccountByAthleteId: null | { athleteId: string } = null;
  let activeAthleteAccountByUserId: null | { userId: string } = null;
  let inviteLookup: null | {
    athleteFirstName: string;
    athleteLastName: string;
    invite: {
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
  let snapshotRecords: Array<{
    metric: {
      bodyBatteryHigh: number | null;
      bodyBatteryLow: number | null;
      hrvNightlyMs: number | null;
      metricDate: string;
      restingHeartRate: number | null;
      sleepDurationMinutes: number | null;
      sleepScore: number | null;
      stressAverage: number | null;
      trainingReadiness: number | null;
    } | null;
    snapshot: {
      createdAt: Date;
      readinessBand: "ready" | "caution" | "restricted";
      readinessScore: number;
      recommendation: "full_load" | "reduced_load" | "monitor" | "recovery_focus";
      recoveryTrend: "stable" | "improving" | "declining";
      rationale: string[];
      snapshotDate: string;
    };
  }> = [];
  let garminConnection: null | {
    lastPermissionsSyncAt: Date | null;
    lastSuccessfulSyncAt: Date | null;
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

  const athleteInviteRepository = {
    create: async (input: Record<string, unknown>) => {
      calls.createInvite.push(input);
      return {
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        expiresAt: input.expiresAt as Date,
        id: "invite-1",
        status: "pending" as const
      };
    },
    findPendingByTokenHash: async () => inviteLookup,
    markAccepted: async (inviteId: string, acceptedByUserId: string, acceptedAt: Date) => {
      calls.markAccepted.push({ inviteId, acceptedAt, acceptedByUserId });
      return null;
    },
    markExpiredPendingInvites: async () => [],
    revokePendingForAthlete: async (athleteId: string) => {
      calls.revokePending.push(athleteId);
      return [];
    }
  };

  const readinessRepository = {
    listSnapshotsForAthletes: async () => snapshotRecords
  };

  const garminRepository = {
    findConnectionByAthlete: async () => garminConnection
  };

  return {
    calls,
    service: new AthleteAccountService(
      db as never,
      athleteRepository as never,
      athleteAccountRepository as never,
      athleteInviteRepository as never,
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
    setInviteLookup(value: typeof inviteLookup) {
      inviteLookup = value;
    },
    setGarminConnection(value: typeof garminConnection) {
      garminConnection = value;
    },
    setSnapshotRecords(value: typeof snapshotRecords) {
      snapshotRecords = value;
    }
  };
};

test("createInvite rejects athletes that already have a linked account", async () => {
  const harness = createHarness();
  harness.setActiveAthleteAccountByAthleteId({
    athleteId: "athlete-1"
  });

  await assert.rejects(
    () =>
      harness.service.createInvite({
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

test("acceptInvite rejects staff accounts", async () => {
  const harness = createHarness();

  await assert.rejects(
    () =>
      harness.service.acceptInvite({
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

test("acceptInvite rejects mismatched email addresses", async () => {
  const harness = createHarness();
  harness.setInviteLookup({
    athleteFirstName: "Alex",
    athleteLastName: "Athlete",
    invite: {
      athleteId: "athlete-1",
      email: "athlete@club.com",
      expiresAt: new Date("2026-03-20T08:00:00.000Z"),
      id: "invite-1",
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
      harness.service.acceptInvite({
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

test("acceptInvite creates the athlete account and marks the invite as accepted", async () => {
  const harness = createHarness();
  harness.setInviteLookup({
    athleteFirstName: "Alex",
    athleteLastName: "Athlete",
    invite: {
      athleteId: "athlete-1",
      email: "athlete@club.com",
      expiresAt: new Date("2026-03-20T08:00:00.000Z"),
      id: "invite-1",
      tenantId: "tenant-1"
    },
    currentSquadId: "squad-1",
    currentSquadName: "First Team",
    currentSquadSlug: "first-team",
    tenantName: "Example FC",
    tenantSlug: "example-fc"
  });

  const result = await harness.service.acceptInvite({
    token: "token-1",
    userId: "user-1",
    userEmail: "athlete@club.com",
    membershipCount: 0,
    actorType: "staff",
    now: new Date("2026-03-10T09:00:00.000Z")
  });

  assert.deepEqual(result, { accepted: true });
  assert.equal(harness.calls.createAccount.length, 1);
  assert.equal(harness.calls.markAccepted.length, 1);
  assert.equal(harness.calls.markAccepted[0]?.inviteId, "invite-1");
});

test("getAthletePortal returns trend and sync details for the athlete dashboard", async () => {
  const harness = createHarness();
  harness.setSnapshotRecords([
    {
      snapshot: {
        createdAt: new Date("2026-03-11T08:00:00.000Z"),
        readinessBand: "ready",
        readinessScore: 84,
        recommendation: "full_load",
        recoveryTrend: "improving",
        rationale: ["Sleep and HRV are above baseline"],
        snapshotDate: "2026-03-11"
      },
      metric: {
        bodyBatteryHigh: 91,
        bodyBatteryLow: 24,
        hrvNightlyMs: 72,
        metricDate: "2026-03-11",
        restingHeartRate: 51,
        sleepDurationMinutes: 470,
        sleepScore: 88,
        stressAverage: 23,
        trainingReadiness: 86
      }
    },
    {
      snapshot: {
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        readinessBand: "caution",
        readinessScore: 68,
        recommendation: "monitor",
        recoveryTrend: "stable",
        rationale: ["Recovery signals are slightly below baseline"],
        snapshotDate: "2026-03-10"
      },
      metric: {
        bodyBatteryHigh: 79,
        bodyBatteryLow: 29,
        hrvNightlyMs: 63,
        metricDate: "2026-03-10",
        restingHeartRate: 54,
        sleepDurationMinutes: 430,
        sleepScore: 79,
        stressAverage: 34,
        trainingReadiness: 70
      }
    }
  ]);
  harness.setGarminConnection({
    lastSuccessfulSyncAt: new Date("2026-03-11T06:30:00.000Z"),
    lastPermissionsSyncAt: new Date("2026-03-10T06:30:00.000Z")
  });

  const portal = await harness.service.getAthletePortal({
    athleteId: "athlete-1",
    tenantId: "tenant-1"
  });

  assert.equal(portal.latestSnapshot.readinessScore, 84);
  assert.equal(portal.latestSnapshot.recoveryTrend, "improving");
  assert.equal(portal.latestSnapshot.metrics?.sleepDurationMinutes, 470);
  assert.equal(portal.trendSummary.averageReadinessScore, 76);
  assert.equal(portal.trendSummary.readinessDelta, 16);
  assert.equal(portal.trendSummary.averageSleepDurationMinutes, 450);
  assert.equal(portal.trendSummary.averageHrvNightlyMs, 67.5);
  assert.equal(portal.trendSummary.bandCounts.ready, 1);
  assert.equal(portal.trendSummary.bandCounts.caution, 1);
  assert.equal(portal.recentSnapshots.length, 2);
  assert.equal(portal.syncStatus.garminConnected, true);
  assert.equal(portal.syncStatus.lastSuccessfulSyncAt, "2026-03-11T06:30:00.000Z");
});
