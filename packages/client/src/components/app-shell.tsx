import type { PropsWithChildren } from "react";
import { Form, NavLink } from "react-router";
import type { ActorSession, TenantMembership } from "@pulsi/shared";

import {
  getDashboardPath,
  getGarminIntegrationPath,
  getOrganizationSettingsPath
} from "../lib/session";

export const AppShell = ({
  session,
  activeMembership,
  children
}: PropsWithChildren<{
  session: ActorSession;
  activeMembership: TenantMembership;
}>) => (
  <div className="app-shell-frame">
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-scroll">
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
              <span className="eyebrow">Organization</span>
              <span className="pill pill-subtle">{activeMembership.role.replaceAll("_", " ")}</span>
            </div>

            <article className="tenant-link is-active">
              <span className="tenant-link-name">{activeMembership.tenantName}</span>
              <span className="tenant-link-meta">
                Single-organization access for this account
              </span>
            </article>
          </section>

          <nav className="surface section-nav" aria-label="Organization navigation">
            <NavLink
              className={({ isActive }) => `section-link${isActive ? " is-active" : ""}`}
              to={getDashboardPath(activeMembership.tenantSlug)}
            >
              <span className="section-link-title">Dashboard</span>
              <span className="section-link-copy">Readiness board and athlete attention queue.</span>
            </NavLink>

            <NavLink
              className={({ isActive }) => `section-link${isActive ? " is-active" : ""}`}
              to={getGarminIntegrationPath(activeMembership.tenantSlug)}
            >
              <span className="section-link-title">Garmin integration</span>
              <span className="section-link-copy">Connect athletes and review Garmin sync state.</span>
            </NavLink>

            {activeMembership.role === "club_owner" ? (
              <NavLink
                className={({ isActive }) => `section-link${isActive ? " is-active" : ""}`}
                to={getOrganizationSettingsPath(activeMembership.tenantSlug)}
              >
                <span className="section-link-title">Organization settings</span>
                <span className="section-link-copy">Manage staff access and future club configuration.</span>
              </NavLink>
            ) : null}
          </nav>
        </div>

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
  </div>
);
