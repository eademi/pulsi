import { redirect, useLoaderData } from "react-router";

import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load session planner.");
  }

  const session = await apiClient.getSession();
  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }

  const activeMembership = session.memberships.find((membership) => membership.status === "active" && membership.tenantSlug === tenantSlug);

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const readiness = await apiClient.getTenantReadiness(tenantSlug);

  return { readiness, tenantSlug };
};

export default function SessionPlannerRoute() {
  const { readiness } = useLoaderData<typeof clientLoader>();

  return (
    <section className="space-y-4">
      <PageHeader
        description="Balance target session intensity against athlete availability flags before training starts."
        eyebrow="Session Planner"
        title="Availability versus planned load"
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="surface-panel rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Recommended split</p>
          <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Today&apos;s roster allocation</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <PlannerCard count={readiness.filter((item) => item.latestSnapshot?.readinessBand === "ready").length} label="Full go" tone="ready" />
            <PlannerCard
              count={readiness.filter((item) => item.latestSnapshot?.readinessBand === "caution").length}
              label="Managed volume"
              tone="caution"
            />
            <PlannerCard
              count={readiness.filter((item) => item.latestSnapshot?.readinessBand === "restricted").length}
              label="Review first"
              tone="restricted"
            />
          </div>
        </section>

        <section className="surface-grid rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Session notes</p>
          <ul className="mt-4 grid gap-3 text-sm text-obsidian-300">
            <li className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4">
              High-risk athletes should be reviewed before exposure to maximal accelerations.
            </li>
            <li className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4">
              Caution athletes fit best into reduced volume blocks and individualized warm-up control.
            </li>
            <li className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4">
              Exportable planning hooks can later be tied to session targets and GPS actuals.
            </li>
          </ul>
        </section>
      </div>

      <DataTable headers={["Athlete", "Squad", "Readiness", "Recommendation", "Sleep", "HRV"]}>
        {readiness.map((item) => (
          <DataRow
            key={item.athlete.id}
            tone={
              item.latestSnapshot?.readinessBand === "ready"
                ? "ready"
                : item.latestSnapshot?.readinessBand === "caution"
                  ? "caution"
                  : item.latestSnapshot?.readinessBand === "restricted"
                    ? "risk"
                    : "default"
            }
          >
            <DataCell>
              <div className="font-medium text-obsidian-100">
                {item.athlete.firstName} {item.athlete.lastName}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">{item.athlete.position ?? "Player"}</div>
            </DataCell>
            <DataCell>{item.athlete.currentSquad?.name ?? item.athlete.squad ?? "Unassigned"}</DataCell>
            <DataCell>
              <StatusBadge status={item.latestSnapshot?.readinessBand ?? "no_data"} />
            </DataCell>
            <DataCell>{item.latestSnapshot?.recommendation.replaceAll("_", " ") ?? "awaiting data"}</DataCell>
            <DataCell>{formatMinutes(item.latestSnapshot?.metrics.sleepDurationMinutes ?? null)}</DataCell>
            <DataCell>{formatNumber(item.latestSnapshot?.metrics.hrvNightlyMs ?? null, "ms")}</DataCell>
          </DataRow>
        ))}
      </DataTable>
    </section>
  );
}

function PlannerCard({ count, label, tone }: { count: number; label: string; tone: "ready" | "caution" | "restricted" }) {
  return (
    <div className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4">
      <div className="eyebrow">{label}</div>
      <div
        className={`mt-3 text-4xl font-semibold ${tone === "ready" ? "text-ready-500" : tone === "caution" ? "text-caution-500" : "text-risk-500"}`}
      >
        {count}
      </div>
    </div>
  );
}

function formatMinutes(value: number | null) {
  if (value === null) return "No data";
  const hours = Math.floor(value / 60);
  return `${hours}h ${String(value % 60).padStart(2, "0")}m`;
}

function formatNumber(value: number | null, suffix: string) {
  return value === null ? "No data" : `${value} ${suffix}`;
}
