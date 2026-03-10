import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { requireMinimumRole } from "./authorization";

test("requireMinimumRole allows equal role access", () => {
  assert.doesNotThrow(() => requireMinimumRole("coach", "coach"));
});

test("requireMinimumRole allows higher role access", () => {
  assert.doesNotThrow(() => requireMinimumRole("club_owner", "coach"));
});

test("requireMinimumRole rejects lower role access", () => {
  assert.throws(() => requireMinimumRole("analyst", "coach"), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
});
