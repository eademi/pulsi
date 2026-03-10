import type { TenantRole } from "@pulsi/shared";

import { AppError } from "../http/errors";

const roleRank: Record<TenantRole, number> = {
  club_owner: 4,
  coach: 3,
  performance_staff: 2,
  analyst: 1
};

export const requireMinimumRole = (actual: TenantRole, minimum: TenantRole): void => {
  if (roleRank[actual] < roleRank[minimum]) {
    throw new AppError(403, "FORBIDDEN", "Insufficient tenant permissions");
  }
};
