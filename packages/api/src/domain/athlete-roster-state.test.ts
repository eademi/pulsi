import assert from "node:assert/strict";
import test from "node:test";

import { buildAthleteAccountDetails, deriveAthleteAccountState } from "./athlete-roster-state";

test("deriveAthleteAccountState keeps linked state for archived or revoked athlete accounts", () => {
  const state = deriveAthleteAccountState({
    athleteAccountLinkedAt: new Date("2026-03-10T08:00:00.000Z"),
    athleteAccountEmail: "athlete@pulsi.com",
    athleteAccountName: "Alex Athlete",
    athleteAccountUserId: "user-1",
    pendingInviteEmail: null,
    pendingInviteExpiresAt: null,
    pendingInviteId: null
  });

  assert.equal(state, "linked");
});

test("deriveAthleteAccountState prefers linked over pending invite when both are present", () => {
  const state = deriveAthleteAccountState({
    athleteAccountLinkedAt: new Date("2026-03-10T08:00:00.000Z"),
    athleteAccountEmail: "athlete@pulsi.com",
    athleteAccountName: "Alex Athlete",
    athleteAccountUserId: "user-1",
    pendingInviteEmail: "athlete@pulsi.com",
    pendingInviteExpiresAt: new Date("2026-03-17T08:00:00.000Z"),
    pendingInviteId: "invite-1"
  });

  assert.equal(state, "linked");
});

test("deriveAthleteAccountState returns invited when only a pending invite exists", () => {
  const state = deriveAthleteAccountState({
    athleteAccountLinkedAt: null,
    athleteAccountEmail: null,
    athleteAccountName: null,
    athleteAccountUserId: null,
    pendingInviteEmail: "athlete@pulsi.com",
    pendingInviteExpiresAt: new Date("2026-03-17T08:00:00.000Z"),
    pendingInviteId: "invite-1"
  });

  assert.equal(state, "invited");
});

test("buildAthleteAccountDetails preserves historical linked details after archive", () => {
  const details = buildAthleteAccountDetails({
    athleteAccountLinkedAt: new Date("2026-03-10T08:00:00.000Z"),
    athleteAccountEmail: "athlete@pulsi.com",
    athleteAccountName: "Alex Athlete",
    athleteAccountUserId: "user-1",
    pendingInviteEmail: null,
    pendingInviteExpiresAt: null,
    pendingInviteId: null
  });

  assert.deepEqual(details, {
    userId: "user-1",
    name: "Alex Athlete",
    email: "athlete@pulsi.com",
    linkedAt: "2026-03-10T08:00:00.000Z",
    pendingEmail: null,
    pendingExpiresAt: null
  });
});
