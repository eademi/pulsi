import assert from "node:assert/strict";
import test from "node:test";

import type { ActorSession } from "@pulsi/shared";

import {
  getActiveMemberships,
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

const createSession = (overrides?: Partial<ActorSession>): ActorSession => ({
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
  const session = createSession({
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
  const session = createSession({
    memberships: [
      createMembership()
    ]
  });

  assert.equal(getDefaultAppPath(session), getDashboardPath("example-fc"));
});

test("getDefaultAppPath returns the no-access route when there are no active memberships", () => {
  const session = createSession();

  assert.equal(getDefaultAppPath(session), getNoAccessPath());
});
