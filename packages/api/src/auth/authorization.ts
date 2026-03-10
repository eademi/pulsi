import type { TenantCapability, TenantRole } from "@pulsi/shared";
import { hasTenantCapability } from "@pulsi/shared";

import { AppError } from "../http/errors";

export const requireCapability = (role: TenantRole, capability: TenantCapability): void => {
  if (!hasTenantCapability(role, capability)) {
    throw new AppError(403, "FORBIDDEN", "Insufficient tenant permissions");
  }
};
