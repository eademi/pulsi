import { startTransition, useState } from "react";
import { Form, redirect, useLoaderData, useRevalidator, useSearchParams } from "react-router";

import { EmptyState } from "../components/ui/empty-state";
import { MetricStat } from "../components/ui/metric-stat";
import { PageHeader } from "../components/ui/page-header";
import { Sparkline } from "../components/ui/sparkline";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ request }: { request: Request }) => {
  const session = await apiClient.getSessionOptional();

  if (!session) {
    const next = new URL(request.url).pathname;
    throw redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (session.actorType !== "athlete") {
    throw redirect(getDefaultAppPath(session));
  }

  const [portal, garmin] = await Promise.all([
    apiClient.getAthletePortal(),
    apiClient.getAthleteGarminConnection()
  ]);

  return {
    garmin,
    portal,
    session
  };
};

export default function AthleteHomeRoute() {
  const { garmin, portal, session } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [searchParams] = useSearchParams();
  const [pendingAction, setPendingAction] = useState<"connect" | "disconnect" | null>(null);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(
    searchParams.get("garmin") === "connected"
      ? {
          kind: "success",
          text: "Garmin connected successfully."
        }
      : null
  );

  const connectGarmin = async () => {
    setMessage(null);
    setPendingAction("connect");

    try {
      const connectionSession = await apiClient.createAthleteGarminConnectionSession();
      window.location.assign(connectionSession.authorizationUrl);
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to start Garmin connection."
      });
      setPendingAction(null);
    }
  };

  const disconnectGarmin = async () => {
    setMessage(null);
    setPendingAction("disconnect");

    try {
      await apiClient.disconnectAthleteGarminConnection();
      setMessage({
        kind: "success",
        text: "Garmin disconnected."
      });
      startTransition(() => revalidator.revalidate());
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to disconnect Garmin."
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <PageHeader
          actions={
            <Form action="/auth/sign-out" method="post">
              <button className="btn-secondary" type="submit">
                Sign out
              </button>
            </Form>
          }
          description={`${portal.athlete.currentSquad?.name ?? "No squad"} · ${portal.athlete.position ?? "No position"} · Signed in as ${session.user.email}`}
          eyebrow="Athlete Profile"
          title={`${portal.athlete.firstName} ${portal.athlete.lastName}`}
        />

        {message ? (
          <p
            className={
              message.kind === "success"
                ? "rounded-[var(--radius-soft)] border border-ready-500/25 bg-ready-500/10 px-4 py-3 text-sm text-ready-500"
                : "rounded-[var(--radius-soft)] border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500"
            }
          >
            {message.text}
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricStat
              label="Latest readiness"
              tone={
                portal.latestSnapshot.readinessBand === "ready"
                  ? "ready"
                  : portal.latestSnapshot.readinessBand === "caution"
                    ? "caution"
                    : portal.latestSnapshot.readinessBand === "restricted"
                      ? "risk"
                      : "default"
              }
              value={
                portal.latestSnapshot.readinessScore !== null
                  ? `${portal.latestSnapshot.readinessScore}`
                  : "—"
              }
            />
            <MetricStat
              label="7-day average"
              value={
                portal.trendSummary.averageReadinessScore !== null
                  ? `${portal.trendSummary.averageReadinessScore}`
                  : "—"
              }
            />
            <MetricStat
              label="Average sleep"
              value={formatMinutes(portal.trendSummary.averageSleepDurationMinutes)}
            />
            <MetricStat
              label="Average nightly HRV"
              value={formatNumber(portal.trendSummary.averageHrvNightlyMs, "ms")}
            />
          </section>

          <section className="surface-panel rounded-[var(--radius-panel)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Garmin connection</p>
                <h2 className="mt-2 text-xl font-semibold text-obsidian-100">
                  {garmin.connection ? "Active sync" : "Connection required"}
                </h2>
              </div>
              <StatusBadge status={garmin.connection ? "active" : "no_data"} />
            </div>
            <p className="mt-3 text-sm text-obsidian-400">
              {garmin.connection
                ? "Your Garmin account is connected. Pulsi will keep ingesting readiness and recovery summaries for this profile."
                : garmin.reason ?? "Connect Garmin to populate your athlete dashboard."}
            </p>
            <div className="mt-5 grid gap-3">
              <button
                className={garmin.connection ? "btn-secondary" : "btn-primary"}
                disabled={!garmin.configured || pendingAction === "connect"}
                onClick={() => void connectGarmin()}
                type="button"
              >
                {pendingAction === "connect" ? "Connecting..." : "Connect Garmin"}
              </button>
              {garmin.connection ? (
                <button
                  className="btn-danger"
                  disabled={pendingAction === "disconnect"}
                  onClick={() => void disconnectGarmin()}
                  type="button"
                >
                  {pendingAction === "disconnect" ? "Disconnecting..." : "Disconnect Garmin"}
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="surface-panel rounded-[var(--radius-panel)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Athlete profile</p>
                <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Readiness history</h2>
              </div>
              <StatusBadge
                label={`${portal.trendSummary.daysWithData}/${portal.trendSummary.windowDays} days`}
                status="active"
              />
            </div>

            {portal.recentSnapshots.length > 0 ? (
              <>
                <Sparkline
                  className="mt-8 h-36"
                  points={portal.recentSnapshots.map((snapshot) => snapshot.readinessScore)}
                  status={
                    portal.latestSnapshot.readinessBand === "ready"
                      ? "ready"
                      : portal.latestSnapshot.readinessBand === "caution"
                        ? "caution"
                        : portal.latestSnapshot.readinessBand === "restricted"
                          ? "risk"
                          : "accent"
                  }
                />
                <div className="mt-6 grid gap-3">
                  {portal.recentSnapshots.map((snapshot) => (
                    <div
                      className="flex items-center justify-between rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] px-4 py-3"
                      key={snapshot.snapshotDate}
                    >
                      <div className="text-sm text-obsidian-300">
                        {new Date(snapshot.snapshotDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-obsidian-100">
                          {snapshot.readinessScore}/100
                        </span>
                        <StatusBadge status={snapshot.readinessBand} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6">
                <EmptyState
                  body="Once Garmin data syncs, this view will show your recent readiness movement."
                  title="No readiness history yet"
                />
              </div>
            )}
          </section>

          <section className="grid gap-4">
            <section className="surface-grid rounded-[var(--radius-panel)] p-5">
              <p className="eyebrow">Today&apos;s signals</p>
              <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Latest inputs</h2>
              <div className="mt-5 grid gap-3">
                <SignalRow label="Sleep" value={formatMinutes(portal.latestSnapshot.metrics?.sleepDurationMinutes ?? null)} />
                <SignalRow label="Nightly HRV" value={formatNumber(portal.latestSnapshot.metrics?.hrvNightlyMs ?? null, "ms")} />
                <SignalRow label="Resting HR" value={formatNumber(portal.latestSnapshot.metrics?.restingHeartRate ?? null, "bpm")} />
                <SignalRow label="Stress" value={formatNumber(portal.latestSnapshot.metrics?.stressAverage ?? null, "")} />
              </div>
            </section>

            <section className="surface-panel rounded-[var(--radius-panel)] p-5">
              <p className="eyebrow">How Pulsi sees it</p>
              <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Personal context</h2>
              {portal.latestSnapshot.rationale.length > 0 ? (
                <ul className="mt-5 grid gap-3">
                  {portal.latestSnapshot.rationale.map((item) => (
                    <li
                      className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-obsidian-300"
                      key={item}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-obsidian-500">
                  Pulsi will explain your current trend here once data is available.
                </p>
              )}
            </section>

            <section className="surface-panel rounded-[var(--radius-panel)] p-5">
              <p className="eyebrow">Sync status</p>
              <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Data freshness</h2>
              <div className="mt-5 grid gap-3">
                <SignalRow label="Last sync" value={formatDateTime(portal.syncStatus.lastSuccessfulSyncAt)} />
                <SignalRow label="Permissions checked" value={formatDateTime(portal.syncStatus.lastPermissionsSyncAt)} />
                <SignalRow label="Connection state" value={portal.syncStatus.garminConnected ? "Active" : "Pending"} />
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-obsidian-400">{label}</span>
      <span className="text-sm font-medium text-obsidian-100">{value}</span>
    </div>
  );
}

const formatMinutes = (value: number | null) => {
  if (value === null) {
    return "No data";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const formatNumber = (value: number | null, suffix: string) =>
  value === null ? "No data" : `${value}${suffix ? ` ${suffix}` : ""}`;

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "No sync yet");
