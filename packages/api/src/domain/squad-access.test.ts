import assert from "node:assert/strict";
import test from "node:test";

import { canAccessSquad } from "./squad-access";

test("canAccessSquad allows all-squad memberships to view unassigned athletes", () => {
  assert.equal(
    canAccessSquad(
      {
        accessScope: "all_squads",
        accessibleSquadIds: []
      },
      {
        id: null,
        slug: null
      }
    ),
    true
  );
});

test("canAccessSquad blocks assigned-squad memberships from viewing unassigned athletes", () => {
  assert.equal(
    canAccessSquad(
      {
        accessScope: "assigned_squads",
        accessibleSquadIds: ["squad-1"]
      },
      {
        id: null,
        slug: null
      }
    ),
    false
  );
});

test("canAccessSquad enforces explicit squad filters before scope checks", () => {
  assert.equal(
    canAccessSquad(
      {
        accessScope: "all_squads",
        accessibleSquadIds: [],
        squadSlug: "u18"
      },
      {
        id: "squad-1",
        slug: "seniors"
      }
    ),
    false
  );
});

test("canAccessSquad allows assigned-squad memberships only for granted squads", () => {
  assert.equal(
    canAccessSquad(
      {
        accessScope: "assigned_squads",
        accessibleSquadIds: ["squad-1", "squad-2"]
      },
      {
        id: "squad-2",
        slug: "u18"
      }
    ),
    true
  );

  assert.equal(
    canAccessSquad(
      {
        accessScope: "assigned_squads",
        accessibleSquadIds: ["squad-1"]
      },
      {
        id: "squad-2",
        slug: "u18"
      }
    ),
    false
  );
});
