import { useEffect, useMemo, useState, type ComponentType, type PropsWithChildren } from "react";
import { Form, NavLink, useLocation } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";
import type { ActorSession, TenantMembership } from "@pulsi/shared";

import { CommandPalette } from "./ui/command-palette";
import {
  getDashboardPath,
  getGarminIntegrationPath,
  getOrganizationSettingsPath,
  getPlayersPath,
  getReportsPath,
  getSessionPlannerPath,
  getSquadsPath
} from "../lib/session";
import { cn } from "../lib/cn";

interface NavigationItem {
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

export function AppShell({
  session,
  activeMembership,
  children
}: PropsWithChildren<{
  session: ActorSession;
  activeMembership: TenantMembership;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();

  const navigationItems = useMemo(() => {
    const items: NavigationItem[] = [
      {
        href: getDashboardPath(activeMembership.tenantSlug),
        label: "Dashboard",
        description: "Live readiness overview and alerts",
        icon: ActivityIcon
      },
      {
        href: getSquadsPath(activeMembership.tenantSlug),
        label: "Squad Readiness",
        description: "Pre-session go/no-go board",
        icon: GridIcon
      },
      {
        href: getPlayersPath(activeMembership.tenantSlug),
        label: "Players",
        description: "Roster, claim links, and athlete ownership",
        icon: UsersIcon
      },
      {
        href: getSessionPlannerPath(activeMembership.tenantSlug),
        label: "Session Planner",
        description: "Availability flags versus target load",
        icon: CalendarIcon
      },
      {
        href: getReportsPath(activeMembership.tenantSlug),
        label: "Reports",
        description: "Trend analysis and export-oriented views",
        icon: ReportIcon
      },
      {
        href: getGarminIntegrationPath(activeMembership.tenantSlug),
        label: "Garmin",
        description: "Connection state and consent workflows",
        icon: LinkIcon
      }
    ];

    if (hasTenantCapability(activeMembership.role, "staff:manage")) {
      items.push({
        href: getOrganizationSettingsPath(activeMembership.tenantSlug),
        label: "Settings",
        description: "Staff access and organization controls",
        icon: CogIcon
      });
    }

    return items;
  }, [activeMembership.role, activeMembership.tenantSlug]);

  const activeRoute = navigationItems.find((item) => location.pathname.startsWith(item.href));
  const breadcrumbs = buildBreadcrumbs(activeMembership.tenantName, activeRoute?.label ?? "Workspace");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-transparent px-4 py-4 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1800px] grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <aside
          className={cn(
            "surface-panel hidden rounded-[var(--radius-panel)] lg:flex lg:flex-col",
            collapsed ? "w-[92px]" : "w-[320px]"
          )}
        >
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex size-11 items-center justify-center rounded-[var(--radius-soft)] bg-accent-500/15 text-sm font-semibold text-accent-400 shadow-[var(--shadow-glow)]">
                P
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <div className="text-base font-semibold text-obsidian-100">Pulsi</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-obsidian-500">
                    Performance OS
                  </div>
                </div>
              ) : null}
            </div>
            <button
              className="btn-secondary hidden size-10 rounded-full p-0 lg:inline-flex"
              onClick={() => setCollapsed((current) => !current)}
              type="button"
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {!collapsed ? (
              <div className="surface-grid rounded-[var(--radius-soft)] p-4">
                <p className="eyebrow">Active organization</p>
                <h2 className="mt-3 text-xl font-semibold text-obsidian-100">
                  {activeMembership.tenantName}
                </h2>
                <p className="mt-2 text-sm text-obsidian-400">
                  {session.user.name} · {activeMembership.role.replaceAll("_", " ")}
                </p>
              </div>
            ) : null}

            <nav className="mt-4 grid gap-2" aria-label="Primary navigation">
              {navigationItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-[var(--radius-soft)] border px-3 py-3 transition",
                      isActive
                        ? "border-accent-500/35 bg-accent-500/12 text-obsidian-100"
                        : "border-transparent text-obsidian-400 hover:border-white/8 hover:bg-white/4 hover:text-obsidian-100"
                    )
                  }
                  key={item.href}
                  to={item.href}
                >
                  <item.icon className="size-5 shrink-0" />
                  {!collapsed ? (
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="truncate text-xs text-obsidian-500">{item.description}</div>
                    </div>
                  ) : null}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-white/8 p-3">
            {!collapsed ? (
              <div className="mb-3 rounded-[var(--radius-soft)] border border-white/8 bg-white/4 p-3">
                <p className="text-sm font-medium text-obsidian-100">{session.user.name}</p>
                <p className="mt-1 text-sm text-obsidian-500">{session.user.email}</p>
              </div>
            ) : null}

            <Form action="/auth/sign-out" method="post">
              <button className="btn-secondary w-full justify-center" type="submit">
                <LogoutIcon className="size-4" />
                {!collapsed ? "Sign out" : null}
              </button>
            </Form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="surface-panel rounded-[var(--radius-panel)] p-4 lg:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-obsidian-500">
                  {breadcrumbs.map((crumb, index) => (
                    <div className="flex items-center gap-2" key={crumb}>
                      <span>{crumb}</span>
                      {index < breadcrumbs.length - 1 ? <span>•</span> : null}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-obsidian-100 lg:text-3xl">
                    {activeRoute?.label ?? "Workspace"}
                  </h1>
                  <span className="pill pill-muted">{activeMembership.role.replaceAll("_", " ")}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button className="btn-secondary" onClick={() => setCommandOpen(true)} type="button">
                  ⌘K Quick search
                </button>
                <button className="btn-secondary" type="button">
                  <BellIcon className="size-4" />
                  Alerts
                </button>
                <button className="btn-primary" type="button">
                  <BoltIcon className="size-4" />
                  Live board
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <CommandPalette items={navigationItems} onOpenChange={setCommandOpen} open={commandOpen} />
    </div>
  );
}

function buildBreadcrumbs(tenantName: string, label: string) {
  return ["Organization", tenantName, label];
}

function iconPath(className: string | undefined, path: string) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <path d={path} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return iconPath(className, "M4 14h4l2-7 4 13 2-6h4");
}
function GridIcon({ className }: { className?: string }) {
  return iconPath(className, "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z");
}
function UsersIcon({ className }: { className?: string }) {
  return iconPath(className, "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 14v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75");
}
function CalendarIcon({ className }: { className?: string }) {
  return iconPath(className, "M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2z");
}
function ReportIcon({ className }: { className?: string }) {
  return iconPath(className, "M6 20h12M9 16V8M15 16V4");
}
function LinkIcon({ className }: { className?: string }) {
  return iconPath(className, "M10 13a5 5 0 0 1 0-7l1-1a5 5 0 1 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1");
}
function CogIcon({ className }: { className?: string }) {
  return iconPath(className, "M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0-5 1.2 2.47 2.73.4-.97 2.57 1.8 2.08-2.4 1.34.27 2.75L12 14.95l-2.63 1.66.27-2.75-2.4-1.34 1.8-2.08-.97-2.57 2.73-.4L12 3z");
}
function BellIcon({ className }: { className?: string }) {
  return iconPath(className, "M15 17H5l1.4-1.4A2 2 0 0 0 7 14.2V10a5 5 0 0 1 10 0v4.2a2 2 0 0 0 .6 1.4L19 17h-4m0 0a3 3 0 1 1-6 0");
}
function BoltIcon({ className }: { className?: string }) {
  return iconPath(className, "M13 2 4 14h6l-1 8 9-12h-6l1-8z");
}
function LogoutIcon({ className }: { className?: string }) {
  return iconPath(className, "M15 3h4v18h-4M10 7l-5 5 5 5M5 12h10");
}
