import { useLoaderData } from "react-router";

import { DashboardPage } from "../features/dashboard/dashboard-page";
import { apiClient } from "../lib/api";

export const clientLoader = async ({
  params
}: {
  params: Record<string, string | undefined>;
}) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load the dashboard.");
  }

  const readiness = await apiClient.getTenantReadiness(tenantSlug);

  return {
    readiness,
    tenantSlug
  };
};

export default function DashboardRoute() {
  const data = useLoaderData<typeof clientLoader>();

  return <DashboardPage readiness={data.readiness} tenantSlug={data.tenantSlug} />;
}
