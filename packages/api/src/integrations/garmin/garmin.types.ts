export interface GarminTokenBundle {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  scope: string[];
  jti?: string | null;
}
