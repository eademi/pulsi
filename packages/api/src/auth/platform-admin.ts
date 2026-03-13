import type { Context, Next } from "hono";

import type { AppBindings, AuthenticatedAdminIdentity } from "../context/app-context";
import { AppError } from "../http/errors";

export const assertPlatformAdmin = async (
  identity: AuthenticatedAdminIdentity
) => {
  if (identity.role !== "platform_admin" || identity.status !== "active") {
    throw new AppError(403, "FORBIDDEN", "Pulsi administrator access is required");
  }
};

export const requirePlatformAdminAccess = async (c: Context<AppBindings>, next: Next) => {
  const identity = c.get("adminContext")?.identity;

  if (!identity) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }

  await assertPlatformAdmin(identity);
  await next();
};
