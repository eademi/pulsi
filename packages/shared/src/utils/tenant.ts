export const tenantCacheKey = (tenantId: string, ...parts: string[]): string =>
  ["tenant", tenantId, ...parts].join(":");
