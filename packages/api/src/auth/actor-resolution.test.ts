import assert from "node:assert/strict";
import test from "node:test";

import type { AthleteActorProfile } from "@pulsi/shared";

import type { TenantMembershipRecord } from "../context/app-context";
import { AppError } from "../http/errors";
import { resolveAuthenticatedActor } from "./actor-resolution";

const session = {
  user: {
    id: "user-1",
    email: "person@pulsi.test",
    name: "Pulsi Person",
    image: null
  },
  session: {
    id: "session-1",
    expiresAt: "2026-03-11T08:00:00.000Z"
  }
};

const membership: TenantMembershipRecord = {
  tenantId: "531a6325-3a8f-4218-bde6-d18c93a883fd",
  tenantSlug: "example-fc",
  tenantName: "Example FC",
  role: "coach",
  status: "active",
  accessScope: "all_squads",
  assignedSquads: []
};

const athleteProfile: AthleteActorProfile = {
  athleteId: "8e7998d0-5eea-4c7d-b148-0da8cdb4c09c",
  athleteName: "Alex Athlete",
  tenantId: "531a6325-3a8f-4218-bde6-d18c93a883fd",
  tenantSlug: "example-fc",
  tenantName: "Example FC",
  timezone: "Europe/Berlin",
  status: "active",
  currentSquad: null
};

test("resolveAuthenticatedActor returns a staff actor when no athlete profile is linked", () => {
  const actor = resolveAuthenticatedActor({
    session,
    memberships: [membership],
    athleteProfile: null
  });

  assert.equal(actor.actorType, "staff");
  assert.equal(actor.memberships.length, 1);
  assert.equal(actor.athleteProfile, null);
});

test("resolveAuthenticatedActor returns an athlete actor when the user only has an athlete account", () => {
  const actor = resolveAuthenticatedActor({
    session,
    memberships: [],
    athleteProfile
  });

  assert.equal(actor.actorType, "athlete");
  assert.deepEqual(actor.memberships, []);
  assert.deepEqual(actor.athleteProfile, athleteProfile);
});

test("resolveAuthenticatedActor rejects accounts linked as both staff and athlete", () => {
  assert.throws(
    () =>
      resolveAuthenticatedActor({
        session,
        memberships: [membership],
        athleteProfile
      }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});
