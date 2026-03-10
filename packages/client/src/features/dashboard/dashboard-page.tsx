import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Field } from "@base-ui/react/field";
import { Select } from "@base-ui/react/select";
import { Tabs } from "@base-ui/react/tabs";

import type { AthleteReadiness } from "@pulsi/shared";

import { apiClient } from "../../lib/api";
import { ReadinessCard } from "./readiness-card";

export const DashboardPage = () => {
  const { tenantSlug = "" } = useParams();
  const [bandFilter, setBandFilter] = useState<ReadinessFilter>("all");
  const readinessQuery = useQuery({
    queryKey: ["readiness", tenantSlug],
    queryFn: () => apiClient.getTenantReadiness(tenantSlug),
    enabled: Boolean(tenantSlug)
  });

  const data: AthleteReadiness[] = readinessQuery.data ?? [];
  const summary = {
    ready: data.filter((item) => item.latestSnapshot?.readinessBand === "ready").length,
    caution: data.filter((item) => item.latestSnapshot?.readinessBand === "caution").length,
    restricted: data.filter((item) => item.latestSnapshot?.readinessBand === "restricted").length
  };
  const filteredData =
    bandFilter === "all"
      ? data
      : data.filter((item) => item.latestSnapshot?.readinessBand === bandFilter);
  const attentionQueue = data.filter(
    (item) =>
      item.latestSnapshot?.readinessBand === "restricted" ||
      item.latestSnapshot?.recommendation === "recovery_focus"
  );

  return (
    <section>
      <Tabs.Root defaultValue="board" className="tabs-root">
        <div className="toolbar">
          <div>
            <div className="muted">Training readiness</div>
            <h2 style={{ margin: "8px 0 0" }}>Daily squad view</h2>
          </div>

          <div className="toolbar-controls">
            <Field.Root className="field">
              <Field.Label className="field-label" nativeLabel={false}>
                Readiness band
              </Field.Label>
              <Select.Root value={bandFilter} onValueChange={(value) => setBandFilter(value as ReadinessFilter)}>
                <Select.Trigger className="select-trigger" aria-label="Readiness band filter">
                  <Select.Value />
                  <Select.Icon aria-hidden="true">▾</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner sideOffset={8}>
                    <Select.Popup className="select-popup">
                      <Select.Arrow className="select-arrow" />
                      <Select.List className="select-list">
                        {READINESS_FILTERS.map((item) => (
                          <Select.Item key={item.value} value={item.value} className="select-item">
                            <Select.ItemText>{item.label}</Select.ItemText>
                            <Select.ItemIndicator>•</Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </Field.Root>

            <div className="pill">{tenantSlug}</div>
          </div>
        </div>

        <Tabs.List className="tabs-list" aria-label="Dashboard views">
          <Tabs.Tab className="tabs-tab" value="board">
            Readiness board
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="attention">
            Attention queue
          </Tabs.Tab>
          <Tabs.Indicator className="tabs-indicator" />
        </Tabs.List>

        <Tabs.Panel value="board" className="tabs-panel">
          <div className="dashboard-grid">
            <div className="surface metric-card">
              <div className="muted">Ready for full load</div>
              <div className="metric-value band-ready">{summary.ready}</div>
            </div>
            <div className="surface metric-card">
              <div className="muted">Needs caution</div>
              <div className="metric-value band-caution">{summary.caution}</div>
            </div>
            <div className="surface metric-card">
              <div className="muted">Recovery focus</div>
              <div className="metric-value band-restricted">{summary.restricted}</div>
            </div>
          </div>

          {readinessQuery.isLoading ? (
            <div className="surface empty-state">
              Loading readiness view...
            </div>
          ) : readinessQuery.isError ? (
            <div className="surface empty-state">
              {(readinessQuery.error as Error).message}
            </div>
          ) : (
            <div className="athlete-list">
              {filteredData.map((athleteReadiness) => (
                <ReadinessCard
                  key={athleteReadiness.athlete.id}
                  athleteReadiness={athleteReadiness}
                />
              ))}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="attention" className="tabs-panel">
          <div className="attention-grid">
            {attentionQueue.length > 0 ? (
              attentionQueue.map((athleteReadiness) => (
                <article
                  key={athleteReadiness.athlete.id}
                  className="surface attention-card"
                >
                  <div className="muted">Priority review</div>
                  <h3 style={{ margin: "8px 0" }}>
                    {athleteReadiness.athlete.firstName} {athleteReadiness.athlete.lastName}
                  </h3>
                  <div className="pill">
                    {athleteReadiness.latestSnapshot?.recommendation.replaceAll("_", " ") ?? "monitor"}
                  </div>
                  <p style={{ marginBottom: 0 }}>
                    {athleteReadiness.latestSnapshot?.rationale.join(" · ") ??
                      "No synced readiness rationale is available yet."}
                  </p>
                </article>
              ))
            ) : (
              <div className="surface empty-state">
                No athletes are currently flagged for priority review.
              </div>
            )}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </section>
  );
};

type ReadinessFilter = "all" | "ready" | "caution" | "restricted";

const READINESS_FILTERS: Array<{ value: ReadinessFilter; label: string }> = [
  { value: "all", label: "All athletes" },
  { value: "ready", label: "Ready" },
  { value: "caution", label: "Caution" },
  { value: "restricted", label: "Restricted" }
];
