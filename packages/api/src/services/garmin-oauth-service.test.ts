import assert from "node:assert/strict";
import test from "node:test";

import { GarminOAuthService } from "./garmin-oauth-service";

const createServiceHarness = () => {
  let athleteAccountByUserId: null | { athleteId: string } = null;

  const athleteRepository = {
    findByIdForTenant: async () => ({
      id: "athlete-1"
    })
  };

  const repository = {
    findOauthSessionByState: async () => ({
      session: {
        id: "oauth-session-1",
        tenantId: "tenant-1",
        athleteId: "athlete-1",
        state: "state-1",
        codeVerifier: "verifier-1",
        redirectUri: "http://localhost:3001/v1/integrations/garmin/callback",
        status: "pending" as const,
        expiresAt: new Date("2026-03-11T10:15:00.000Z"),
        createdByUserId: "user-1"
      },
      tenantSlug: "pulsi-demo-fc"
    }),
    markOauthSessionStatus: async () => null,
    upsertGarminConnection: async () => ({
      id: "connection-1",
      credentialKey: "credential-1"
    })
  };

  const apiClient = {
    createAuthorizationUrl: () => "https://connect.garmin.com/oauth/confirm",
    exchangeAuthorizationCode: async () => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: new Date("2026-03-11T11:00:00.000Z"),
      refreshTokenExpiresAt: new Date("2026-04-11T11:00:00.000Z"),
      tokenType: "Bearer",
      scope: ["dailies"]
    }),
    getPermissions: async () => ["dailies", "sleeps"],
    getUserId: async () => "garmin-user-1"
  };

  const tokenService = {
    storeConnectionTokens: async () => null
  };

  const athleteAccountRepository = {
    findActiveByUserId: async () => athleteAccountByUserId
  };

  return {
    service: new GarminOAuthService(
      athleteRepository as never,
      athleteAccountRepository as never,
      repository as never,
      apiClient as never,
      tokenService as never
    ),
    setAthleteAccountByUserId(value: typeof athleteAccountByUserId) {
      athleteAccountByUserId = value;
    }
  };
};

test("completeAuthorization returns athlete redirect path for athlete-initiated Garmin sessions", async () => {
  const harness = createServiceHarness();
  harness.setAthleteAccountByUserId({
    athleteId: "athlete-1"
  });

  const result = await harness.service.completeAuthorization({
    code: "code-1",
    state: "state-1"
  });

  assert.equal(result.redirectPath, "/athlete");
});

test("completeAuthorization returns tenant dashboard path for staff-initiated Garmin sessions", async () => {
  const harness = createServiceHarness();
  harness.setAthleteAccountByUserId(null);

  const result = await harness.service.completeAuthorization({
    code: "code-1",
    state: "state-1"
  });

  assert.equal(result.redirectPath, "/pulsi-demo-fc/dashboard");
});
