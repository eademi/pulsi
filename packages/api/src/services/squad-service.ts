import type { CreateSquadInput, ListSquadsQuery, TenantAccessScope } from "@pulsi/shared";

import { AppError } from "../http/errors";
import type { SquadRepository } from "../repositories/squad-repository";

export class SquadService {
  public constructor(private readonly squadRepository: SquadRepository) {}

  public async listTenantSquads(
    tenant: {
      id: string;
      accessScope: TenantAccessScope;
      accessibleSquadIds: string[];
    },
    query: ListSquadsQuery
  ) {
    return this.squadRepository.listForTenant({
      tenantId: tenant.id,
      accessScope: tenant.accessScope,
      accessibleSquadIds: tenant.accessibleSquadIds,
      status: query.status
    });
  }

  public async createTenantSquad(tenantId: string, input: CreateSquadInput) {
    const slug = normalizeSquadSlug(input.slug ?? input.name);
    const existing = await this.squadRepository.findBySlugForTenant(tenantId, slug);

    if (existing) {
      throw new AppError(409, "CONFLICT", "A squad with that slug already exists");
    }

    return this.squadRepository.create({
      tenantId,
      slug,
      name: input.name.trim(),
      category: normalizeNullableText(input.category)
    });
  }
}

const normalizeNullableText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const normalizeSquadSlug = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!slug) {
    throw new AppError(400, "VALIDATION_ERROR", "Squad slug cannot be empty");
  }

  return slug;
};
