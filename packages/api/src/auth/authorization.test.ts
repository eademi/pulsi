import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { requireCapability } from "./authorization";

test("requireCapability allows org admins to manage staff access", () => {
  assert.doesNotThrow(() => requireCapability("org_admin", "staff:manage"));
});

test("requireCapability allows performance staff to manage Garmin", () => {
  assert.doesNotThrow(() => requireCapability("performance_staff", "garmin:manage"));
});

test("requireCapability rejects coaches from managing staff access", () => {
  assert.throws(() => requireCapability("coach", "staff:manage"), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
});
