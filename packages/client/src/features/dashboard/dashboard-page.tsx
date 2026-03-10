import { startTransition, useDeferredValue, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";

import type { AthleteReadiness } from "@pulsi/shared";

import { ReadinessCard } from "./readiness-card";

export const DashboardPage = ({
  readiness,
  tenantSlug
}: {
  readiness: AthleteReadiness[];
  tenantSlug: string;
}) => {
  const [bandFilter, setBandFilter] = useState<ReadinessFilter>("all");
  const deferredBandFilter = useDeferredValue(bandFilter);

  const summary = {
    ready: readiness.filter((item) => item.latestSnapshot?.readinessBand === "ready").length,
    caution: readiness.filter((item) => item.latestSnapshot?.readinessBand === "caution").length,
    restricted: readiness.filter((item) => item.latestSnapshot?.readinessBand === "restricted").length
  };

  const filteredReadiness =
    deferredBandFilter === "all"
      ? readiness
      : readiness.filter((item) => item.latestSnapshot?.readinessBand === deferredBandFilter);

  const attentionQueue = readiness.filter(
    (item) =>
      item.latestSnapshot?.readinessBand === "restricted" ||
      item.latestSnapshot?.recommendation === "recovery_focus"
  );

  return (
    <section className="dashboard-stack">
      <header className="hero surface">
        <div className="hero-copy">
          <p className="eyebrow">Daily overview</p>
          <h1>{tenantSlug.replaceAll("-", " ")} training board</h1>
          <p className="muted hero-body">
            Pulsi turns overnight wearable signals into a board that staff can act on before
            training starts.
          </p>
        </div>

        <div className="hero-metrics">
          <article className="hero-metric-card">
            <span>Ready</span>
            <strong className="band-ready">{summary.ready}</strong>
          </article>
          <article className="hero-metric-card">
            <span>Caution</span>
            <strong className="band-caution">{summary.caution}</strong>
          </article>
          <article className="hero-metric-card">
            <span>Restricted</span>
            <strong className="band-restricted">{summary.restricted}</strong>
          </article>
        </div>
      </header>

      <Tabs.Root className="tabs-root" defaultValue="board">
        <div className="dashboard-toolbar">
          <Tabs.List aria-label="Dashboard views" className="tabs-list">
            <Tabs.Tab className="tabs-tab" value="board">
              Readiness board
            </Tabs.Tab>
            <Tabs.Tab className="tabs-tab" value="attention">
              Attention queue
            </Tabs.Tab>
            <Tabs.Indicator className="tabs-indicator" />
          </Tabs.List>

          <div className="filter-cluster" role="tablist" aria-label="Readiness filter">
            {READINESS_FILTERS.map((filter) => {
              const active = bandFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  className={`filter-chip${active ? " is-active" : ""}`}
                  onClick={() => {
                    startTransition(() => setBandFilter(filter.value));
                  }}
                  type="button"
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        <Tabs.Panel className="tabs-panel" value="board">
          {filteredReadiness.length > 0 ? (
            <div className="athlete-list">
              {filteredReadiness.map((athleteReadiness) => (
                <ReadinessCard
                  athleteReadiness={athleteReadiness}
                  key={athleteReadiness.athlete.id}
                />
              ))}
            </div>
          ) : (
            <div className="surface empty-state">
              No athletes match the selected readiness band.
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel className="tabs-panel" value="attention">
          {attentionQueue.length > 0 ? (
            <div className="attention-grid">
              {attentionQueue.map((athleteReadiness) => (
                <article
                  className="surface attention-card"
                  key={athleteReadiness.athlete.id}
                >
                  <div className="attention-card-topline">
                    <span className="eyebrow">Priority review</span>
                    <span className="pill">
                      {athleteReadiness.latestSnapshot?.recommendation.replaceAll("_", " ") ??
                        "monitor"}
                    </span>
                  </div>
                  <h3>
                    {athleteReadiness.athlete.firstName} {athleteReadiness.athlete.lastName}
                  </h3>
                  <p className="muted">
                    {athleteReadiness.athlete.squad ?? "First Team"} ·{" "}
                    {athleteReadiness.athlete.position ?? "Player"}
                  </p>
                  <p className="attention-copy">
                    {athleteReadiness.latestSnapshot?.rationale.join(" · ") ??
                      "No synced rationale is available yet for this athlete."}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="surface empty-state">
              No athletes are currently flagged for priority review.
            </div>
          )}
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  );
};

type ReadinessFilter = "all" | "ready" | "caution" | "restricted";

const READINESS_FILTERS: Array<{ value: ReadinessFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "caution", label: "Caution" },
  { value: "restricted", label: "Restricted" }
];
