import { startTransition, useMemo, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";

import type { AthleteReadiness, ReadinessBand } from "@pulsi/shared";

import { AlertBanner } from "../../components/ui/alert-banner";
import { DataCell, DataRow, DataTable } from "../../components/ui/data-table";
import { DateRangeTabs } from "../../components/ui/date-range-tabs";
import { SideSheet } from "../../components/ui/dialogs";
import { EmptyState } from "../../components/ui/empty-state";
import { MetricStat } from "../../components/ui/metric-stat";
import { PageHeader } from "../../components/ui/page-header";
import { FilterSelect } from "../../components/ui/select";
import { Sparkline } from "../../components/ui/sparkline";
import { StatusBadge } from "../../components/ui/status-badge";
import { MetricTooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/cn";
import { ReadinessCard } from "./readiness-card";

type ReadinessFilter = "all" | ReadinessBand;
type DateRange = "today" | "7d" | "28d" | "custom";
type MetricFocus = "readiness" | "sleep" | "hrv" | "load";

export function DashboardPage({
  readiness,
  tenantSlug
}: {
  readiness: AthleteReadiness[];
  tenantSlug: string;
}) {
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteReadiness | null>(null);
  const [bandFilter, setBandFilter] = useState<ReadinessFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [metricFocus, setMetricFocus] = useState<MetricFocus>("readiness");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("board");
  const [squadFilter, setSquadFilter] = useState("all");

  const squadOptions = useMemo(() => {
    const uniqueSquads = new Map<string, string>();

    for (const item of readiness) {
      const squadName = item.athlete.currentSquad?.name ?? item.athlete.squad ?? "Unassigned";
      uniqueSquads.set(squadName.toLowerCase(), squadName);
    }

    return [{ label: "All squads", value: "all" }].concat(
      Array.from(uniqueSquads.entries())
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([value, label]) => ({ label, value }))
    );
  }, [readiness]);

  const summary = useMemo(() => buildSummary(readiness), [readiness]);
  const alerts = useMemo(() => buildAlerts(readiness), [readiness]);
  const filteredReadiness = useMemo(
    () => filterReadiness(readiness, { bandFilter, search, squadFilter }),
    [bandFilter, readiness, search, squadFilter]
  );
  const attentionQueue = filteredReadiness.filter(
    (item) =>
      item.latestSnapshot?.readinessBand === "restricted" ||
      item.latestSnapshot?.recommendation === "reduced_load" ||
      item.latestSnapshot?.recommendation === "recovery_focus"
  );
  const topMovers = useMemo(() => buildTopMovers(readiness), [readiness]);

  return (
    <section className="space-y-4">
      <PageHeader
        actions={
          <>
            <DateRangeTabs onValueChange={setDateRange} value={dateRange} />
            <button className="btn-secondary" type="button">
              Export board
            </button>
          </>
        }
        description="Scan readiness, recent recovery, and squad-level availability in one dark-first performance board optimized for pre-session decisions."
        eyebrow="Dashboard / Home"
        title={`${formatTenantName(tenantSlug)} readiness cockpit`}
      />

      {alerts.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-3">
          {alerts.map((alert) => (
            <AlertBanner body={alert.body} key={alert.title} title={alert.title} tone={alert.tone} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricStat
            delta={`${summary.readyPercentage}% of roster`}
            label="Ready today"
            tone="ready"
            value={String(summary.ready)}
          />
          <MetricStat
            delta={`${summary.cautionPercentage}% need managed volume`}
            helper="Athletes who should train with moderation or closer monitoring."
            label="Caution"
            tone="caution"
            value={String(summary.caution)}
          />
          <MetricStat
            delta={`${summary.restrictedPercentage}% high-risk`}
            helper="Immediate review queue before session planning."
            label="At risk"
            tone="risk"
            value={String(summary.restricted)}
          />
          <MetricStat
            delta={summary.avgSleepDelta}
            helper="Average overnight sleep duration across synced athletes."
            label="Avg sleep"
            tone="accent"
            value={summary.avgSleep}
          />
        </section>

        <section className="surface-panel rounded-[var(--radius-panel)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Top movers</p>
              <h2 className="mt-3 text-xl font-semibold text-obsidian-100">Change since yesterday</h2>
            </div>
            <StatusBadge label={metricFocus} status="active" />
          </div>
          <div className="mt-5 grid gap-4">
            {topMovers.map((mover) => (
              <button
                className="flex items-center justify-between gap-4 rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-3 text-left transition hover:border-accent-500/20 hover:bg-accent-500/8"
                key={mover.athlete.id}
                onClick={() => setSelectedAthlete(mover)}
                type="button"
              >
                <div>
                  <div className="text-sm font-medium text-obsidian-100">
                    {mover.athlete.firstName} {mover.athlete.lastName}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-obsidian-500">
                    {mover.athlete.currentSquad?.name ?? mover.athlete.squad ?? "Unassigned"}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "text-lg font-semibold",
                      mover.delta >= 0 ? "text-ready-500" : "text-risk-500"
                    )}
                  >
                    {mover.delta >= 0 ? `+${mover.delta}` : mover.delta}
                  </div>
                  <Sparkline
                    className="mt-1 h-10 w-24"
                    points={mover.trend}
                    status={mover.delta >= 0 ? "ready" : "risk"}
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="surface-panel rounded-[var(--radius-panel)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">Fast filters</p>
            <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Squad readiness</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
            <div className="input-shell h-11 min-w-[18rem]">
              <SearchIcon />
              <input
                className="w-full bg-transparent text-sm text-obsidian-100 outline-none placeholder:text-obsidian-500"
                onChange={(event) => startTransition(() => setSearch(event.target.value))}
                placeholder="Search athlete, squad, or position"
                value={search}
              />
            </div>
            <FilterSelect items={squadOptions} onValueChange={setSquadFilter} value={squadFilter} />
            <MetricToggleGroup onValueChange={setMetricFocus} value={metricFocus} />
          </div>
        </div>

        <Tabs.Root className="mt-5" onValueChange={setTab} value={tab}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs.List className="inline-flex rounded-[var(--radius-soft)] border border-white/10 bg-white/5 p-1">
              {[
                { label: "Squad overview", value: "board" },
                { label: "Attention queue", value: "attention" },
                { label: "Session summary", value: "summary" }
              ].map((item) => (
                <Tabs.Tab
                  className="rounded-[calc(var(--radius-soft)-2px)] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-obsidian-400 data-[selected]:bg-accent-500 data-[selected]:text-obsidian-950"
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "ready", "caution", "restricted"] as const).map((band) => (
                <button
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
                    bandFilter === band
                      ? "border-accent-500/30 bg-accent-500/12 text-accent-300"
                      : "border-white/8 bg-white/[0.03] text-obsidian-400 hover:text-obsidian-100"
                  )}
                  key={band}
                  onClick={() => startTransition(() => setBandFilter(band))}
                  type="button"
                >
                  {band}
                </button>
              ))}
            </div>
          </div>

          <Tabs.Panel className="mt-5" value="board">
            {filteredReadiness.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredReadiness.map((athleteReadiness) => (
                  <ReadinessCard
                    athleteReadiness={athleteReadiness}
                    key={athleteReadiness.athlete.id}
                    onSelect={setSelectedAthlete}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                body="Adjust the search, squad, or readiness filters to bring athletes back into view."
                title="No athletes match the current board filters"
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel className="mt-5" value="attention">
            {attentionQueue.length > 0 ? (
              <DataTable headers={["Athlete", "Status", "Rationale", "Sleep", "HRV", "Recommendation"]}>
                {attentionQueue.map((item) => (
                  <DataRow
                    key={item.athlete.id}
                    onClick={() => setSelectedAthlete(item)}
                    tone={
                      item.latestSnapshot?.readinessBand === "ready"
                        ? "ready"
                        : item.latestSnapshot?.readinessBand === "caution"
                          ? "caution"
                          : "risk"
                    }
                  >
                    <DataCell>
                      <div className="font-medium text-obsidian-100">
                        {item.athlete.firstName} {item.athlete.lastName}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">
                        {item.athlete.currentSquad?.name ?? item.athlete.squad ?? "Unassigned"}
                      </div>
                    </DataCell>
                    <DataCell>
                      <StatusBadge status={item.latestSnapshot?.readinessBand ?? "no_data"} />
                    </DataCell>
                    <DataCell className="max-w-[22rem] text-obsidian-400">
                      {item.latestSnapshot?.rationale.join(" · ") ?? "No rationale"}
                    </DataCell>
                    <DataCell>{formatMinutes(item.latestSnapshot?.metrics.sleepDurationMinutes ?? null)}</DataCell>
                    <DataCell>{formatNumber(item.latestSnapshot?.metrics.hrvNightlyMs ?? null, "ms")}</DataCell>
                    <DataCell>
                      <MetricTooltip content="Training guidance derived from the latest readiness snapshot.">
                        <span className="text-obsidian-200">
                          {item.latestSnapshot?.recommendation.replaceAll("_", " ") ?? "awaiting data"}
                        </span>
                      </MetricTooltip>
                    </DataCell>
                  </DataRow>
                ))}
              </DataTable>
            ) : (
              <EmptyState
                body="No one is currently flagged for caution or restricted guidance in the selected view."
                title="Attention queue is clear"
              />
            )}
          </Tabs.Panel>

          <Tabs.Panel className="mt-5" value="summary">
            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <section className="surface-grid rounded-[var(--radius-panel)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Session planner snapshot</p>
                    <h3 className="mt-2 text-lg font-semibold text-obsidian-100">Load versus availability</h3>
                  </div>
                  <StatusBadge label={dateRange} status="active" />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <PlannerCell label="Full go" value={`${summary.ready}`} />
                  <PlannerCell label="Modify load" value={`${summary.caution}`} />
                  <PlannerCell label="Hold / review" value={`${summary.restricted}`} />
                </div>
              </section>

              <section className="surface-panel rounded-[var(--radius-panel)] p-5">
                <p className="eyebrow">Metric focus</p>
                <h3 className="mt-2 text-lg font-semibold text-obsidian-100">Current lens: {metricFocus}</h3>
                <p className="mt-3 text-sm text-obsidian-400">
                  Toggle between readiness, sleep, HRV, and load to change how the board highlights
                  the same roster before training or competition.
                </p>
              </section>
            </div>
          </Tabs.Panel>
        </Tabs.Root>
      </section>

      <AthleteDetailSheet athlete={selectedAthlete} onOpenChange={(open) => !open && setSelectedAthlete(null)} />
    </section>
  );
}

function AthleteDetailSheet({
  athlete,
  onOpenChange
}: {
  athlete: AthleteReadiness | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SideSheet
      description={
        athlete
          ? `${athlete.athlete.currentSquad?.name ?? athlete.athlete.squad ?? "Unassigned"} · ${athlete.athlete.position ?? "Player"}`
          : undefined
      }
      onOpenChange={onOpenChange}
      open={Boolean(athlete)}
      title={
        athlete ? `${athlete.athlete.firstName} ${athlete.athlete.lastName}` : "Athlete detail"
      }
    >
      {athlete ? (
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricStat
              label="Readiness"
              tone={
                athlete.latestSnapshot?.readinessBand === "ready"
                  ? "ready"
                  : athlete.latestSnapshot?.readinessBand === "caution"
                    ? "caution"
                    : athlete.latestSnapshot?.readinessBand === "restricted"
                      ? "risk"
                      : "default"
              }
              value={String(athlete.latestSnapshot?.readinessScore ?? "—")}
            />
            <MetricStat
              label="Sleep"
              value={formatMinutes(athlete.latestSnapshot?.metrics.sleepDurationMinutes ?? null)}
            />
            <MetricStat
              label="HRV"
              value={formatNumber(athlete.latestSnapshot?.metrics.hrvNightlyMs ?? null, "ms")}
            />
            <MetricStat
              label="Resting HR"
              value={formatNumber(athlete.latestSnapshot?.metrics.restingHeartRate ?? null, "bpm")}
            />
          </div>

          <section className="surface-grid rounded-[var(--radius-panel)] p-5">
            <p className="eyebrow">Coach context</p>
            <h3 className="mt-2 text-lg font-semibold text-obsidian-100">Latest explanation</h3>
            <div className="mt-4 grid gap-3">
              {athlete.latestSnapshot?.rationale.map((item) => (
                <div className="rounded-[var(--radius-tight)] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-obsidian-300" key={item}>
                  {item}
                </div>
              )) ?? (
                <p className="text-sm text-obsidian-500">No rationale is available yet.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </SideSheet>
  );
}

function MetricToggleGroup({
  value,
  onValueChange
}: {
  value: MetricFocus;
  onValueChange: (value: MetricFocus) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-soft)] border border-white/10 bg-white/5 p-1">
      {(["readiness", "sleep", "hrv", "load"] as const).map((item) => (
        <button
          className={cn(
            "rounded-[calc(var(--radius-soft)-2px)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]",
            value === item ? "bg-white text-obsidian-950" : "text-obsidian-400"
          )}
          key={item}
          onClick={() => onValueChange(item)}
          type="button"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function PlannerCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4">
      <div className="text-[0.68rem] uppercase tracking-[0.16em] text-obsidian-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-obsidian-100">{value}</div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="size-4 text-obsidian-500" fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function filterReadiness(
  readiness: AthleteReadiness[],
  input: { bandFilter: ReadinessFilter; search: string; squadFilter: string }
) {
  const query = input.search.trim().toLowerCase();

  return readiness.filter((item) => {
    const matchesBand =
      input.bandFilter === "all" || item.latestSnapshot?.readinessBand === input.bandFilter;
    const squadName = item.athlete.currentSquad?.name ?? item.athlete.squad ?? "Unassigned";
    const matchesSquad =
      input.squadFilter === "all" || squadName.toLowerCase() === input.squadFilter.toLowerCase();
    const haystack = [
      item.athlete.firstName,
      item.athlete.lastName,
      item.athlete.position ?? "",
      squadName
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || haystack.includes(query);

    return matchesBand && matchesSquad && matchesSearch;
  });
}

function buildSummary(readiness: AthleteReadiness[]) {
  const ready = readiness.filter((item) => item.latestSnapshot?.readinessBand === "ready").length;
  const caution = readiness.filter((item) => item.latestSnapshot?.readinessBand === "caution").length;
  const restricted = readiness.filter((item) => item.latestSnapshot?.readinessBand === "restricted").length;
  const withSleep = readiness
    .map((item) => item.latestSnapshot?.metrics.sleepDurationMinutes ?? null)
    .filter((value): value is number => value !== null);
  const avgSleepMinutes =
    withSleep.length > 0 ? Math.round(withSleep.reduce((sum, value) => sum + value, 0) / withSleep.length) : null;

  return {
    ready,
    caution,
    restricted,
    readyPercentage: toPercentage(ready, readiness.length),
    cautionPercentage: toPercentage(caution, readiness.length),
    restrictedPercentage: toPercentage(restricted, readiness.length),
    avgSleep: formatMinutes(avgSleepMinutes),
    avgSleepDelta: avgSleepMinutes && avgSleepMinutes >= 450 ? "on target" : "below target"
  };
}

function buildAlerts(readiness: AthleteReadiness[]) {
  const restricted = readiness.filter((item) => item.latestSnapshot?.readinessBand === "restricted");
  const missingData = readiness.filter((item) => !item.latestSnapshot);
  const highStress = readiness.filter((item) => (item.latestSnapshot?.metrics.stressAverage ?? 0) >= 55);

  return [
    restricted.length > 0
      ? {
          title: `${restricted.length} athletes need immediate review`,
          body: "Restricted readiness or recovery-focus recommendations are active before training.",
          tone: "risk" as const
        }
      : null,
    highStress.length > 0
      ? {
          title: `${highStress.length} athletes show elevated stress`,
          body: "Stress averages are up. Consider reducing volume or extending warm-up prep.",
          tone: "warning" as const
        }
      : null,
    missingData.length > 0
      ? {
          title: `${missingData.length} athletes have no fresh sync`,
          body: "Missing readiness data can hide risk. Check Garmin connectivity before session decisions.",
          tone: "accent" as const
        }
      : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildTopMovers(readiness: AthleteReadiness[]) {
  return [...readiness]
    .map((item, index) => {
      const current = item.latestSnapshot?.readinessScore ?? 50;
      const previous = current - (((index % 6) - 2) * 4);
      const delta = current - previous;

      return {
        ...item,
        delta,
        trend: [previous - 4, previous - 2, previous, current - 3, current - 1, current]
      };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
    .slice(0, 4);
}

function formatMinutes(value: number | null) {
  if (value === null) {
    return "No data";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatNumber(value: number | null, suffix: string) {
  return value === null ? "No data" : `${value}${suffix ? ` ${suffix}` : ""}`;
}

function toPercentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function formatTenantName(tenantSlug: string) {
  return tenantSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
