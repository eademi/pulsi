import { AppError } from "../http/errors";
import type { MembershipRepository } from "../repositories/membership-repository";

export class TenantAccessService {
  public constructor(private readonly membershipRepository: MembershipRepository) {}

  public async resolveMembership(userId: string, tenantSlug: string) {
    const membership = await this.membershipRepository.findActiveMembership(userId, tenantSlug);

    if (!membership) {
      throw new AppError(404, "TENANT_NOT_FOUND", "Tenant not found or inaccessible");
    }

    return membership;
  }
}
