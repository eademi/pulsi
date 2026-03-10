import { AppError } from "../../http/errors";
import { env } from "../../env";
import {
  garminPermissionsResponseSchema,
  garminTokenResponseSchema,
  garminUserIdResponseSchema
} from "./garmin.contracts";
import {
  parseGarminHealthCallbackPayload,
  type GarminNotificationSummaryType
} from "./health-api.contracts";
import type { GarminTokenBundle } from "./garmin.types";

const sleep = async (durationMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export class GarminApiClient {
  public createAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }) {
    const url = new URL("https://connect.garmin.com/oauth2Confirm");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", env.GARMIN_CLIENT_ID);
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("redirect_uri", input.redirectUri);
    url.searchParams.set("state", input.state);
    return url.toString();
  }

  public async exchangeAuthorizationCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GarminTokenBundle> {
    return this.exchangeToken({
      grantType: "authorization_code",
      code: input.code,
      codeVerifier: input.codeVerifier,
      redirectUri: input.redirectUri
    });
  }

  public async refreshAccessToken(refreshToken: string): Promise<GarminTokenBundle> {
    return this.exchangeToken({
      grantType: "refresh_token",
      refreshToken
    });
  }

  public async getUserId(accessToken: string): Promise<string> {
    const payload = await this.authorizedGet("/wellness-api/rest/user/id", accessToken);
    return garminUserIdResponseSchema.parse(payload).userId;
  }

  public async getPermissions(accessToken: string): Promise<string[]> {
    const payload = await this.authorizedGet("/wellness-api/rest/user/permissions", accessToken);
    return garminPermissionsResponseSchema.parse(payload);
  }

  public async deleteUserRegistration(accessToken: string): Promise<void> {
    await this.withRetry(async () => {
      const response = await fetch(this.buildApiUrl("/wellness-api/rest/user/registration"), {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "5");
        throw new GarminRetryableError("Garmin rate limited delete registration", retryAfterSeconds * 1000);
      }

      if (response.status !== 204) {
        const body = await response.text();
        throw new AppError(
          502,
          "EXTERNAL_SERVICE_FAILURE",
          "Garmin delete registration failed",
          { status: response.status, body }
        );
      }
    });
  }

  public async fetchPingCallbackData(
    summaryType: GarminNotificationSummaryType,
    callbackUrl: string
  ) {
    const url = this.validateGarminCallbackUrl(callbackUrl);

    return this.withRetry(async () => {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          accept: "application/json"
        }
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "5");
        throw new GarminRetryableError("Garmin rate limited callback fetch", retryAfterSeconds * 1000);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new AppError(502, "EXTERNAL_SERVICE_FAILURE", "Garmin ping callback failed", {
          summaryType,
          status: response.status,
          body
        });
      }

      return parseGarminHealthCallbackPayload(summaryType, await response.json());
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let delayMs = 500;

    while (attempt < 4) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;

        if (error instanceof GarminRetryableError && attempt < 4) {
          await sleep(Math.max(error.retryAfterMs, delayMs));
          delayMs *= 2;
          continue;
        }

        throw error;
      }
    }

    throw new AppError(502, "EXTERNAL_SERVICE_FAILURE", "Garmin API retry budget exhausted");
  }

  private async exchangeToken(input: {
    grantType: "authorization_code";
    code: string;
    codeVerifier: string;
    redirectUri: string;
  } | {
    grantType: "refresh_token";
    refreshToken: string;
  }): Promise<GarminTokenBundle> {
    const body = new URLSearchParams({
      grant_type: input.grantType,
      client_id: env.GARMIN_CLIENT_ID,
      client_secret: env.GARMIN_CLIENT_SECRET
    });

    if (input.grantType === "authorization_code") {
      body.set("code", input.code);
      body.set("code_verifier", input.codeVerifier);
      body.set("redirect_uri", input.redirectUri);
    } else {
      body.set("refresh_token", input.refreshToken);
    }

    const payload = await this.withRetry(async () => {
      const response = await fetch("https://diauth.garmin.com/di-oauth2-service/oauth/token", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "5");
        throw new GarminRetryableError("Garmin rate limited token exchange", retryAfterSeconds * 1000);
      }

      if (!response.ok) {
        const text = await response.text();
        throw new AppError(
          502,
          "EXTERNAL_SERVICE_FAILURE",
          "Garmin token exchange failed",
          { status: response.status, body: text }
        );
      }

      return garminTokenResponseSchema.parse(await response.json());
    });

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      tokenType: payload.token_type,
      accessTokenExpiresAt: new Date(Date.now() + payload.expires_in * 1000),
      refreshTokenExpiresAt: new Date(Date.now() + payload.refresh_token_expires_in * 1000),
      scope: payload.scope.split(/\s+/).filter(Boolean),
      jti: payload.jti ?? null
    };
  }

  private async authorizedGet(path: string, accessToken: string): Promise<unknown> {
    return this.withRetry(async () => {
      const response = await fetch(this.buildApiUrl(path), {
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json"
        }
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "5");
        throw new GarminRetryableError("Garmin rate limited request", retryAfterSeconds * 1000);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new AppError(502, "EXTERNAL_SERVICE_FAILURE", "Garmin API request failed", {
          status: response.status,
          body
        });
      }

      return response.json();
    });
  }

  private buildApiUrl(path: string): string {
    return new URL(path, env.GARMIN_API_BASE_URL).toString();
  }

  private validateGarminCallbackUrl(callbackUrl: string): URL {
    const url = new URL(callbackUrl);
    const expectedHost = new URL(env.GARMIN_API_BASE_URL).host;

    if (url.protocol !== "https:") {
      throw new AppError(400, "VALIDATION_ERROR", "Garmin callback URL must use HTTPS");
    }

    if (url.host !== expectedHost) {
      throw new AppError(400, "VALIDATION_ERROR", "Garmin callback URL host is invalid", {
        expectedHost,
        actualHost: url.host
      });
    }

    if (!url.pathname.startsWith("/wellness-api/rest/")) {
      throw new AppError(400, "VALIDATION_ERROR", "Garmin callback URL path is invalid", {
        path: url.pathname
      });
    }

    return url;
  }
}

class GarminRetryableError extends Error {
  public constructor(message: string, public readonly retryAfterMs: number) {
    super(message);
    this.name = "GarminRetryableError";
  }
}
