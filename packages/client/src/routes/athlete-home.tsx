import { startTransition, useState } from "react";
import { Form, redirect, useLoaderData, useRevalidator, useSearchParams } from "react-router";

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
    <main className="athlete-shell">
      <section className="athlete-panel surface">
        <div className="athlete-panel-header">
          <div>
            <p className="eyebrow">Athlete view</p>
            <h1>{portal.athlete.firstName}</h1>
            <p className="muted">
              {portal.athlete.currentSquad?.name ?? "No squad"} · {portal.athlete.position ?? "No position"}
            </p>
          </div>

          <Form action="/auth/sign-out" method="post">
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </Form>
        </div>

        {message ? (
          <p className={message.kind === "success" ? "form-success" : "form-error"}>{message.text}</p>
        ) : null}

        <div className="athlete-summary-grid">
          <article className="settings-card">
            <div className="settings-card-copy">
              <strong>Latest readiness</strong>
              <p className="muted">
                {portal.latestSnapshot.readinessScore !== null
                  ? `${portal.latestSnapshot.readinessScore}/100`
                  : "No snapshot yet"}
              </p>
            </div>
            <span className="pill pill-subtle">
              {portal.latestSnapshot.readinessBand ?? "awaiting data"}
            </span>
          </article>

          <article className="settings-card">
            <div className="settings-card-copy">
              <strong>Garmin connection</strong>
              <p className="muted">
                {garmin.connection ? "Connected" : "Not connected yet"}
                {!garmin.configured && garmin.reason ? ` · ${garmin.reason}` : ""}
              </p>
            </div>
            <span className="pill pill-subtle">{garmin.connection ? "active" : "pending"}</span>
            <div className="athlete-action-row">
              {garmin.connection ? (
                <button
                  className="ghost-button"
                  disabled={pendingAction === "disconnect"}
                  onClick={() => void disconnectGarmin()}
                  type="button"
                >
                  {pendingAction === "disconnect" ? "Disconnecting..." : "Disconnect Garmin"}
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={!garmin.configured || pendingAction === "connect"}
                  onClick={() => void connectGarmin()}
                  type="button"
                >
                  {pendingAction === "connect" ? "Connecting..." : "Connect Garmin"}
                </button>
              )}
            </div>
          </article>
        </div>

        <section className="surface athlete-insight-panel">
          <p className="eyebrow">Today</p>
          <h2>How Pulsi sees your recent trend</h2>
          {portal.latestSnapshot.snapshotDate ? (
            <>
              <p className="muted">
                Snapshot date: {new Date(portal.latestSnapshot.snapshotDate).toLocaleDateString()}
              </p>
              {portal.latestSnapshot.rationale.length > 0 ? (
                <ul className="athlete-rationale-list">
                  {portal.latestSnapshot.rationale.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="muted">
              Pulsi will start showing personal recovery and readiness context here once Garmin
              data is available for your profile.
            </p>
          )}
        </section>

        <footer className="athlete-footer muted">
          Signed in as {session.user.email}. Athlete pages only show your own profile.
        </footer>
      </section>
    </main>
  );
}
