import type { GarminApiClient } from "../integrations/garmin/garmin-client";
import { TokenCipher } from "../integrations/garmin/token-cipher";
import type { GarminRepository } from "../repositories/garmin-repository";
import { AppError } from "../http/errors";

const REFRESH_BUFFER_MS = 600_000;

export class GarminTokenService {
  public constructor(
    private readonly repository: GarminRepository,
    private readonly apiClient: GarminApiClient,
    private readonly tokenCipher: TokenCipher
  ) {}

  public async storeConnectionTokens(input: {
    credentialKey: string;
    tenantId: string;
    connectionId: string;
    bundle: {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      accessTokenExpiresAt: Date;
      refreshTokenExpiresAt: Date;
      scope: string[];
      jti?: string | null;
    };
  }) {
    return this.repository.upsertProviderCredentials({
      credentialKey: input.credentialKey,
      tenantId: input.tenantId,
      connectionId: input.connectionId,
      encryptedAccessToken: this.tokenCipher.encrypt(input.bundle.accessToken),
      encryptedRefreshToken: this.tokenCipher.encrypt(input.bundle.refreshToken),
      accessTokenExpiresAt: input.bundle.accessTokenExpiresAt,
      refreshTokenExpiresAt: input.bundle.refreshTokenExpiresAt,
      tokenType: input.bundle.tokenType,
      scope: input.bundle.scope,
      jti: input.bundle.jti
    });
  }

  public async getValidAccessToken(connectionId: string) {
    const credential = await this.repository.findCredentialsByConnection(connectionId);

    if (!credential) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Garmin credentials not found for connection");
    }

    const now = Date.now();
    if (new Date(credential.accessTokenExpiresAt).getTime() - REFRESH_BUFFER_MS > now) {
      return this.tokenCipher.decrypt(credential.encryptedAccessToken);
    }

    if (new Date(credential.refreshTokenExpiresAt).getTime() <= now) {
      throw new AppError(401, "EXTERNAL_SERVICE_FAILURE", "Garmin refresh token has expired");
    }

    const refreshToken = this.tokenCipher.decrypt(credential.encryptedRefreshToken);
    const refreshed = await this.apiClient.refreshAccessToken(refreshToken);

    await this.storeConnectionTokens({
      credentialKey: credential.id,
      tenantId: credential.tenantId,
      connectionId,
      bundle: refreshed
    });

    return refreshed.accessToken;
  }
}
