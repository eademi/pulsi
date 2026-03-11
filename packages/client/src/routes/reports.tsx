import { redirect, useLoaderData } from "react-router";

import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { MetricStat } from "../components/ui/metric-stat";
import { PageHeader } from "../components/ui/page-header";
import { Sparkline } from "../components/ui/sparkline";
import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load reports.");
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

  return { readiness };
};

export default function ReportsRoute() {
  const { readiness } = useLoaderData<typeof clientLoader>();
  const averageScore = average(readiness.map((item) => item.latestSnapshot?.readinessScore ?? null));
  const averageSleep = average(readiness.map((item) => item.latestSnapshot?.metrics.sleepDurationMinutes ?? null));
  const averageHrv = average(readiness.map((item) => item.latestSnapshot?.metrics.hrvNightlyMs ?? null));

  return (
    <section className="space-y-4">
      <PageHeader
        actions={<button className="btn-secondary">Export CSV</button>}
        description="Review trend-oriented analytics with an export-friendly, staff-facing layout."
        eyebrow="Reports / Analytics"
        title="Performance analytics"
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricStat label="Average readiness" tone="accent" value={averageScore ? `${averageScore}` : "—"} />
        <MetricStat label="Average sleep" value={averageSleep ? `${Math.round(averageSleep)} min` : "—"} />
        <MetricStat label="Average HRV" value={averageHrv ? `${averageHrv} ms` : "—"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="surface-panel rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Trend line</p>
          <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Aggregate readiness movement</h2>
          <Sparkline className="mt-8 h-36" points={buildAggregateTrend(readiness)} status="accent" />
        </section>

        <section className="surface-grid rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Export notes</p>
          <div className="mt-4 space-y-3 text-sm text-obsidian-300">
            <p>Use this surface for date-ranged report exports and objective coaching review.</p>
            <p>The next layer should add PDF/CSV exports and compare windows like last 7 vs last 28 days.</p>
          </div>
        </section>
      </div>

      <DataTable headers={["Athlete", "Readiness", "Sleep", "HRV", "Stress", "Trend"]}>
        {readiness.map((item, index) => (
          <DataRow key={item.athlete.id}>
            <DataCell>
              <div className="font-medium text-obsidian-100">
                {item.athlete.firstName} {item.athlete.lastName}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">
                {item.athlete.currentSquad?.name ?? item.athlete.squad ?? "Unassigned"}
              </div>
            </DataCell>
            <DataCell>{item.latestSnapshot?.readinessScore ?? "—"}</DataCell>
            <DataCell>{item.latestSnapshot?.metrics.sleepDurationMinutes ?? "—"}</DataCell>
            <DataCell>{item.latestSnapshot?.metrics.hrvNightlyMs ?? "—"}</DataCell>
            <DataCell>{item.latestSnapshot?.metrics.stressAverage ?? "—"}</DataCell>
            <DataCell>
              <Sparkline className="h-10 w-24" points={[45 + index, 48 + index, 46 + index, 52 + index, 49 + index, 54 + index]} status="accent" />
            </DataCell>
          </DataRow>
        ))}
      </DataTable>
    </section>
  );
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => value !== null);
  if (filtered.length === 0) return null;
  return Math.round((filtered.reduce((sum, value) => sum + value, 0) / filtered.length) * 10) / 10;
}

function buildAggregateTrend(readiness: Awaited<ReturnType<typeof apiClient.getTenantReadiness>>) {
  if (readiness.length === 0) {
    return [0];
  }

  return readiness.slice(0, 7).map((item, index) => (item.latestSnapshot?.readinessScore ?? 52) - index);
}
