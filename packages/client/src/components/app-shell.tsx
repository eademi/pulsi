import { Outlet, useParams } from "react-router-dom";

import { useSessionQuery } from "../features/auth/use-session";
import { useTenantMembership } from "../features/tenants/use-tenant-membership";

export const AppShell = () => {
  const { tenantSlug = "" } = useParams();
  const sessionQuery = useSessionQuery();
  const membership = useTenantMembership(sessionQuery.data?.memberships ?? [], tenantSlug);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>Pulsi</h1>
          <p>Coach-facing readiness decisions for training staff.</p>
        </div>

        {sessionQuery.data ? (
          <>
            <div className="surface metric-card">
              <div className="muted">Signed in</div>
              <h3>{sessionQuery.data.user.name}</h3>
              <div className="muted">{sessionQuery.data.user.email}</div>
            </div>

            <div className="surface metric-card" style={{ marginTop: 16 }}>
              <div className="muted">Active tenant</div>
              <h3>{membership?.tenantName ?? tenantSlug}</h3>
              <div className="pill">{membership?.role ?? "unknown role"}</div>
            </div>
          </>
        ) : (
          <div className="surface empty-state">
            Session unavailable. Connect the client to the API and Better Auth session endpoint.
          </div>
        )}
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};
