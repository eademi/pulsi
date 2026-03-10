import { Outlet, redirect, useLoaderData } from "react-router";

import { AppShell } from "../components/app-shell";
import { apiClient } from "../lib/api";
import {
  getActiveMemberships,
  getDashboardPath,
  getDefaultAppPath,
  getNoAccessPath
} from "../lib/session";

export const clientLoader = async ({
  params,
  request
}: {
  params: Record<string, string | undefined>;
  request: Request;
}) => {
  const session = await apiClient.getSessionOptional();

  if (!session) {
    const next = new URL(request.url).pathname;
    throw redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }

  const memberships = getActiveMemberships(session);
  const activeMembership = memberships.find((membership) => membership.tenantSlug === params.tenantSlug);

  if (!activeMembership) {
    const fallbackMembership = memberships[0];
    throw redirect(fallbackMembership ? getDashboardPath(fallbackMembership.tenantSlug) : getNoAccessPath());
  }

  return {
    activeMembership,
    session
  };
};

export default function TenantLayoutRoute() {
  const data = useLoaderData<typeof clientLoader>();

  return (
    <AppShell activeMembership={data.activeMembership} session={data.session}>
      <Outlet />
    </AppShell>
  );
}
