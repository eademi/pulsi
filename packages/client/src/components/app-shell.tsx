import type { PropsWithChildren } from "react";
import { Form, NavLink } from "react-router";
import type { ActorSession, TenantMembership } from "@pulsi/shared";

import { getDashboardPath } from "../lib/session";

export const AppShell = ({
  session,
  memberships,
  activeMembership,
  children
}: PropsWithChildren<{
  session: ActorSession;
  memberships: TenantMembership[];
  activeMembership: TenantMembership;
}>) => (
  <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">P</div>
        <div>
          <h1>Pulsi</h1>
          <p>Readiness decisions for coaching staff.</p>
        </div>
      </div>

      <section className="surface profile-panel">
        <div className="eyebrow">Signed in</div>
        <h2>{session.user.name}</h2>
        <p className="muted">{session.user.email}</p>
      </section>

      <section className="rail-section">
        <div className="rail-header">
          <span className="eyebrow">Clubs</span>
          <span className="pill pill-subtle">{activeMembership.role.replaceAll("_", " ")}</span>
        </div>

        <nav className="tenant-nav" aria-label="Tenant navigation">
          {memberships.map((membership) => (
            <NavLink
              key={membership.tenantId}
              className={({ isActive }) => `tenant-link${isActive ? " is-active" : ""}`}
              to={getDashboardPath(membership.tenantSlug)}
            >
              <span className="tenant-link-name">{membership.tenantName}</span>
              <span className="tenant-link-meta">{membership.role.replaceAll("_", " ")}</span>
            </NavLink>
          ))}
        </nav>
      </section>

      <Form action="/auth/sign-out" className="session-actions" method="post">
        <button className="ghost-button" type="submit">
          Sign out
        </button>
      </Form>
    </aside>

    <main className="content">
      <header className="topbar">
        <div>
          <p className="eyebrow">Active tenant</p>
          <h2>{activeMembership.tenantName}</h2>
        </div>
        <div className="topbar-badge">{activeMembership.role.replaceAll("_", " ")}</div>
      </header>

      {children}
    </main>
  </div>
);
