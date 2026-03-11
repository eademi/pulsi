import assert from "node:assert/strict";
import test from "node:test";

import { buildAthleteAccountDetails, deriveAthleteAccountState } from "./athlete-roster-state";

test("deriveAthleteAccountState keeps claimed state for archived or revoked athlete accounts", () => {
  const state = deriveAthleteAccountState({
    athleteAccountClaimedAt: new Date("2026-03-10T08:00:00.000Z"),
    athleteAccountEmail: "athlete@pulsi.com",
    athleteAccountName: "Alex Athlete",
    athleteAccountUserId: "user-1",
    pendingClaimEmail: null,
    pendingClaimExpiresAt: null,
    pendingClaimLinkId: null
  });

  assert.equal(state, "claimed");
});

test("deriveAthleteAccountState prefers claimed over pending invite when both are present", () => {
  const state = deriveAthleteAccountState({
    athleteAccountClaimedAt: new Date("2026-03-10T08:00:00.000Z"),
    athleteAccountEmail: "athlete@pulsi.com",
    athleteAccountName: "Alex Athlete",
    athleteAccountUserId: "user-1",
    pendingClaimEmail: "athlete@pulsi.com",
    pendingClaimExpiresAt: new Date("2026-03-17T08:00:00.000Z"),
    pendingClaimLinkId: "claim-1"
  });

  assert.equal(state, "claimed");
});

test("deriveAthleteAccountState returns invited when only a pending claim link exists", () => {
  const state = deriveAthleteAccountState({
    athleteAccountClaimedAt: null,
    athleteAccountEmail: null,
    athleteAccountName: null,
    athleteAccountUserId: null,
    pendingClaimEmail: "athlete@pulsi.com",
    pendingClaimExpiresAt: new Date("2026-03-17T08:00:00.000Z"),
    pendingClaimLinkId: "claim-1"
  });

  assert.equal(state, "invited");
});

test("buildAthleteAccountDetails preserves historical claimed details after archive", () => {
  const details = buildAthleteAccountDetails({
    athleteAccountClaimedAt: new Date("2026-03-10T08:00:00.000Z"),
    athleteAccountEmail: "athlete@pulsi.com",
    athleteAccountName: "Alex Athlete",
    athleteAccountUserId: "user-1",
    pendingClaimEmail: null,
    pendingClaimExpiresAt: null,
    pendingClaimLinkId: null
  });

  assert.deepEqual(details, {
    userId: "user-1",
    name: "Alex Athlete",
    email: "athlete@pulsi.com",
    claimedAt: "2026-03-10T08:00:00.000Z",
    pendingEmail: null,
    pendingExpiresAt: null
  });
});
