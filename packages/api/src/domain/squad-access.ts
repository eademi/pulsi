import type { TenantAccessScope } from "@pulsi/shared";

export interface SquadVisibilityFilter {
  accessScope?: TenantAccessScope;
  accessibleSquadIds?: string[];
  squadId?: string;
  squadSlug?: string;
}

export const canAccessSquad = (
  filters: SquadVisibilityFilter,
  squad: { id: string | null; slug: string | null }
) => {
  if (filters.squadId && filters.squadId !== squad.id) {
    return false;
  }

  if (filters.squadSlug && filters.squadSlug !== squad.slug) {
    return false;
  }

  if (filters.accessScope !== "assigned_squads") {
    return true;
  }

  if (!squad.id || !filters.accessibleSquadIds) {
    return false;
  }

  return filters.accessibleSquadIds.includes(squad.id);
};
