import type { ListSquadsQuery, TenantAccessScope } from "@pulsi/shared";

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
}
