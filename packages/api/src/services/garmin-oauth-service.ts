import { env } from "../env";
import { AppError } from "../http/errors";
import type { GarminApiClient } from "../integrations/garmin/garmin-client";
import { createPkcePair } from "../integrations/garmin/pkce";
import type { AthleteAccountRepository } from "../repositories/athlete-account-repository";
import type { AthleteRepository } from "../repositories/athlete-repository";
import type { GarminRepository } from "../repositories/garmin-repository";
import type { GarminTokenService } from "./garmin-token-service";

const OAUTH_SESSION_TTL_MS = 15 * 60 * 1000;

export class GarminOAuthService {
  public constructor(
    private readonly athleteRepository: AthleteRepository,
    private readonly athleteAccountRepository: AthleteAccountRepository,
    private readonly repository: GarminRepository,
    private readonly apiClient: GarminApiClient,
    private readonly tokenService: GarminTokenService
  ) {}

  public async createAuthorizationSession(input: {
    tenantId: string;
    athleteId: string;
    actorUserId: string;
    redirectUri: string;
  }) {
    if (!this.isConfigured()) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Garmin integration is not configured on the server"
      );
    }

    const athlete = await this.athleteRepository.findByIdForTenant(input.tenantId, input.athleteId);

    if (!athlete) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Athlete not found in tenant");
    }

    const pkce = createPkcePair();
    const expiresAt = new Date(Date.now() + OAUTH_SESSION_TTL_MS);
    const session = await this.repository.createOauthSession({
      tenantId: input.tenantId,
      athleteId: input.athleteId,
      state: pkce.state,
      codeVerifier: pkce.codeVerifier,
      redirectUri: input.redirectUri,
      expiresAt,
      createdByUserId: input.actorUserId
    });

    return {
      authorizationUrl: this.apiClient.createAuthorizationUrl({
        state: session.state,
        codeChallenge: pkce.codeChallenge,
        redirectUri: session.redirectUri
      }),
      state: session.state,
      expiresAt
    };
  }

  public async completeAuthorization(input: { code: string; state: string }) {
    const sessionRecord = await this.repository.findOauthSessionByState(input.state);

    if (!sessionRecord) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Garmin OAuth session not found");
    }

    const { session, tenantSlug } = sessionRecord;

    if (session.status !== "pending") {
      throw new AppError(409, "CONFLICT", "Garmin OAuth session has already been used");
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await this.repository.markOauthSessionStatus(session.id, "expired");
      throw new AppError(400, "VALIDATION_ERROR", "Garmin OAuth session has expired");
    }

    try {
      const tokenBundle = await this.apiClient.exchangeAuthorizationCode({
        code: input.code,
        codeVerifier: session.codeVerifier,
        redirectUri: session.redirectUri
      });
      const userId = await this.apiClient.getUserId(tokenBundle.accessToken);
      const permissions = await this.apiClient.getPermissions(tokenBundle.accessToken);

      const connection = await this.repository.upsertGarminConnection({
        tenantId: session.tenantId,
        athleteId: session.athleteId,
        providerUserId: userId,
        grantedPermissions: permissions
      });

      await this.tokenService.storeConnectionTokens({
        credentialKey: connection.credentialKey,
        tenantId: session.tenantId,
        connectionId: connection.id,
        bundle: tokenBundle
      });
      await this.repository.markOauthSessionStatus(session.id, "completed");

      return {
        tenantId: session.tenantId,
        tenantSlug,
        athleteId: session.athleteId,
        connectionId: connection.id,
        createdByUserId: session.createdByUserId,
        providerUserId: userId,
        grantedPermissions: permissions,
        redirectPath: await this.resolvePostAuthorizationPath({
          athleteId: session.athleteId,
          createdByUserId: session.createdByUserId,
          tenantSlug
        })
      };
    } catch (error) {
      await this.repository.markOauthSessionStatus(session.id, "failed");
      throw error;
    }
  }

  public getIntegrationStatus() {
    return {
      configured: this.isConfigured(),
      reason: this.isConfigured()
        ? null
        : "Set real GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET values in packages/api/.env.local"
    };
  }

  private isConfigured() {
    return !isPlaceholder(env.GARMIN_CLIENT_ID) && !isPlaceholder(env.GARMIN_CLIENT_SECRET);
  }

  private async resolvePostAuthorizationPath(input: {
    athleteId: string;
    createdByUserId: string;
    tenantSlug: string;
  }) {
    // Redirect based on the actor that initiated OAuth. Athlete accounts should
    // land back on the athlete surface, while staff accounts return to the
    // organization dashboard they were working from.
    const athleteAccount = await this.athleteAccountRepository.findActiveByUserId(input.createdByUserId);

    if (athleteAccount?.athleteId === input.athleteId) {
      return "/athlete";
    }

    return `/${input.tenantSlug}/dashboard`;
  }
}

const isPlaceholder = (value: string) => value.startsWith("replace-with-");
