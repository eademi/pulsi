import type { CreateTenantInput } from "@pulsi/shared";

import { AppError } from "../http/errors";
import type { MembershipRepository } from "../repositories/membership-repository";
import type { TenantRepository } from "../repositories/tenant-repository";

export class TenantService {
  public constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly membershipRepository: MembershipRepository
  ) {}

  public async listMemberships(userId: string) {
    return this.membershipRepository.listForUser(userId);
  }

  public async createTenant(input: CreateTenantInput, ownerUserId: string) {
    const existing = await this.tenantRepository.findBySlug(input.slug);

    if (existing) {
      throw new AppError(409, "CONFLICT", "Tenant slug already exists");
    }

    return this.tenantRepository.createWithOwner({
      ...input,
      ownerUserId
    });
  }
}
