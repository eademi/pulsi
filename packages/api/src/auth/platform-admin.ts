import type { Context, Next } from "hono";

import type { AppBindings, AuthenticatedIdentity } from "../context/app-context";
import { AppError } from "../http/errors";
import type { PlatformAdminRepository } from "../repositories/platform-admin-repository";

export const assertPlatformAdmin = async (
  identity: AuthenticatedIdentity,
  platformAdminRepository: PlatformAdminRepository
) => {
  const allowed = await platformAdminRepository.isPlatformAdmin(identity.userId);

  if (!allowed) {
    throw new AppError(403, "FORBIDDEN", "Pulsi administrator access is required");
  }
};

export const requirePlatformAdminAccess =
  (platformAdminRepository: PlatformAdminRepository) =>
  async (c: Context<AppBindings>, next: Next) => {
    const identity = c.get("requestContext").identity;

    if (!identity) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    await assertPlatformAdmin(identity, platformAdminRepository);
    await next();
  };
