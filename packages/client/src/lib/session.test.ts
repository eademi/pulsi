import assert from "node:assert/strict";
import test from "node:test";

import type { ActorSession } from "@pulsi/shared";

import {
  getActiveMemberships,
  getAthleteHomePath,
  getDashboardPath,
  getDefaultAppPath,
  getNoAccessPath
} from "./session";

const createMembership = (
  overrides: Partial<ActorSession["memberships"][number]> = {}
): ActorSession["memberships"][number] => ({
  accessScope: "all_squads",
  assignedSquads: [],
  role: "coach",
  status: "active",
  tenantId: "tenant-1",
  tenantName: "Example FC",
  tenantSlug: "example-fc",
  ...overrides
});

const createStaffSession = (
  overrides?: Partial<Extract<ActorSession, { actorType: "staff" }>>
): Extract<ActorSession, { actorType: "staff" }> => ({
  actorType: "staff",
  athleteProfile: null,
  memberships: [],
  session: {
    expiresAt: "2026-03-11T08:00:00.000Z",
    id: "session-1"
  },
  user: {
    email: "coach@club.com",
    id: "user-1",
    name: "Coach User"
  },
  ...overrides
});

test("getActiveMemberships returns only active memberships", () => {
  const session = createStaffSession({
    memberships: [
      createMembership(),
      createMembership({
        role: "analyst",
        status: "disabled",
        tenantId: "tenant-2",
        tenantName: "Reserve FC",
        tenantSlug: "reserve-fc"
      })
    ]
  });

  assert.deepEqual(getActiveMemberships(session).map((membership) => membership.tenantSlug), [
    "example-fc"
  ]);
});

test("getDefaultAppPath returns the first active tenant dashboard when memberships exist", () => {
  const session = createStaffSession({
    memberships: [
      createMembership()
    ]
  });

  assert.equal(getDefaultAppPath(session), getDashboardPath("example-fc"));
});

test("getDefaultAppPath returns the no-access route when there are no active memberships", () => {
  const session = createStaffSession();

  assert.equal(getDefaultAppPath(session), getNoAccessPath());
});

test("getDefaultAppPath returns the athlete home route for athlete actors", () => {
  const session: Extract<ActorSession, { actorType: "athlete" }> = {
    actorType: "athlete",
    athleteProfile: {
      athleteId: "8e7998d0-5eea-4c7d-b148-0da8cdb4c09c",
      athleteName: "Alex Athlete",
      tenantId: "531a6325-3a8f-4218-bde6-d18c93a883fd",
      tenantName: "Example FC",
      tenantSlug: "example-fc",
      timezone: "Europe/Berlin",
      status: "active",
      currentSquad: null
    },
    memberships: [],
    session: {
      expiresAt: "2026-03-11T08:00:00.000Z",
      id: "session-1"
    },
    user: {
      email: "athlete@club.com",
      id: "user-2",
      name: "Alex Athlete"
    }
  };

  assert.equal(getDefaultAppPath(session), getAthleteHomePath());
});
