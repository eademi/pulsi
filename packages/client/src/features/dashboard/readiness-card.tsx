import type { AthleteReadiness } from "@pulsi/shared";

import { LoadBar } from "../../components/ui/load-bar";
import { Sparkline } from "../../components/ui/sparkline";
import { StatusBadge } from "../../components/ui/status-badge";
import { cn } from "../../lib/cn";

export function ReadinessCard({ athleteReadiness, onSelect }: { athleteReadiness: AthleteReadiness; onSelect: (athlete: AthleteReadiness) => void }) {
  const snapshot = athleteReadiness.latestSnapshot;
  const readinessBand = snapshot?.readinessBand ?? "no_data";

  return (
    <button
      className={cn(
        "surface-panel group flex w-full flex-col gap-4 rounded-[var(--radius-soft)] p-4 text-left transition hover:-translate-y-0.5 hover:border-accent-500/25",
        snapshot?.readinessBand === "ready" && "bg-ready-500/[0.04]",
        snapshot?.readinessBand === "caution" && "bg-caution-500/[0.05]",
        snapshot?.readinessBand === "restricted" && "bg-risk-500/[0.06]",
      )}
      onClick={() => onSelect(athleteReadiness)}
      type="button"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{athleteReadiness.athlete.currentSquad?.name ?? athleteReadiness.athlete.squad ?? "Unassigned squad"}</p>
          <h3 className="mt-2 truncate text-lg font-semibold text-obsidian-100">
            {athleteReadiness.athlete.firstName} {athleteReadiness.athlete.lastName}
          </h3>
          <p className="mt-1 text-sm text-obsidian-500">{athleteReadiness.athlete.position ?? "Player"}</p>
        </div>
        <StatusBadge status={readinessBand} />
      </div>

      {snapshot ? (
        <>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
            <div>
              <div className="text-[2.7rem] font-semibold leading-none tracking-tight text-obsidian-100">{snapshot.readinessScore}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">Readiness</div>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <MetricMini label="Sleep" value={formatMinutes(snapshot.metrics.sleepDurationMinutes)} />
                <MetricMini label="HRV" value={formatNumber(snapshot.metrics.hrvNightlyMs, "ms")} />
                <MetricMini label="RHR" value={formatNumber(snapshot.metrics.restingHeartRate, "bpm")} />
              </div>
              <Sparkline
                points={buildTrendPoints(snapshot.readinessScore)}
                status={snapshot.readinessBand === "ready" ? "ready" : snapshot.readinessBand === "caution" ? "caution" : "risk"}
              />
            </div>
          </div>

          <LoadBar label={snapshot.recommendation.replaceAll("_", " ")} value={snapshot.readinessScore} />

          <p className="line-clamp-2 text-sm text-obsidian-400">{snapshot.rationale.join(" · ")}</p>
        </>
      ) : (
        <div className="rounded-[var(--radius-tight)] border border-dashed border-white/10 px-4 py-6 text-sm text-obsidian-500">
          No synced readiness snapshot is available for this athlete yet.
        </div>
      )}
    </button>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-tight)] border border-white/8 bg-white/[0.03] p-2">
      <div className="text-[0.68rem] uppercase tracking-[0.16em] text-obsidian-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-obsidian-100">{value}</div>
    </div>
  );
}

function buildTrendPoints(base: number) {
  return [base - 10, base - 6, base - 4, base - 3, base, Math.max(base - 2, 0), base + 2];
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
