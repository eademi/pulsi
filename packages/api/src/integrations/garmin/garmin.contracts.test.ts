import assert from "node:assert/strict";
import test from "node:test";

import {
  garminPermissionsResponseSchema,
  garminTokenResponseSchema,
  garminUserIdResponseSchema
} from "./garmin.contracts";

test("garmin permissions schema accepts raw array payloads", () => {
  const result = garminPermissionsResponseSchema.parse(["dailies", "sleeps"]);
  assert.deepEqual(result, ["dailies", "sleeps"]);
});

test("garmin permissions schema accepts wrapped permissions payloads", () => {
  const result = garminPermissionsResponseSchema.parse({
    permissions: ["dailies", "sleeps"]
  });
  assert.deepEqual(result, ["dailies", "sleeps"]);
});

test("garmin user id schema normalizes numeric ids to strings", () => {
  const result = garminUserIdResponseSchema.parse({
    userId: 12345
  });
  assert.equal(result.userId, "12345");
});

test("garmin token schema coerces expiry numbers from string values", () => {
  const result = garminTokenResponseSchema.parse({
    access_token: "access-token",
    expires_in: "3600",
    token_type: "Bearer",
    refresh_token: "refresh-token",
    scope: "dailies sleeps",
    refresh_token_expires_in: "7200"
  });

  assert.equal(result.expires_in, 3600);
  assert.equal(result.refresh_token_expires_in, 7200);
});
