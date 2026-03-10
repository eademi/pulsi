import { startTransition, useState } from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import type { Athlete, AthleteDeviceConnection, TenantRole } from "@pulsi/shared";

import { apiClient } from "../lib/api";
import { getDashboardPath } from "../lib/session";

export const clientLoader = async ({
  params
}: {
  params: Record<string, string | undefined>;
}) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load Garmin integration.");
  }

  const session = await apiClient.getSession();
  const activeMembership = session.memberships.find(
    (membership) => membership.status === "active" && membership.tenantSlug === tenantSlug
  );

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const [athletes, connections] = await Promise.all([
    apiClient.getTenantAthletes(tenantSlug),
    apiClient.getGarminConnections(tenantSlug)
  ]);

  return {
    activeMembership,
    athletes,
    connections,
    tenantSlug
  };
};

export default function GarminIntegrationRoute() {
  const { activeMembership, athletes, connections, tenantSlug } =
    useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canManage = hasManageAccess(activeMembership.role);
  const connectionsByAthlete = new Map(connections.map((connection) => [connection.athleteId, connection]));

  const connectAthlete = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      const session = await apiClient.createGarminConnectionSession(tenantSlug, {
        athleteId
      });
      window.location.assign(session.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Garmin connection.");
      setPendingAthleteId(null);
    }
  };

  const disconnectAthlete = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      await apiClient.disconnectGarminConnection(tenantSlug, athleteId);
      startTransition(() => revalidator.revalidate());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to disconnect Garmin.");
    } finally {
      setPendingAthleteId(null);
    }
  };

  return (
    <section className="settings-stack">
      <header className="settings-hero surface">
        <div>
          <p className="eyebrow">Garmin integration</p>
          <h1>Wearable connectivity</h1>
          <p className="muted settings-copy">
            Connect Garmin accounts athlete by athlete. Pulsi uses Garmin OAuth, ingests Health and
            Activity data, and turns the supported subset into readiness outputs.
          </p>
        </div>
      </header>

      {message ? <p className="form-error">{message}</p> : null}

      <section className="surface settings-panel">
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">Athletes</p>
            <h2>{athletes.length} athlete profiles</h2>
          </div>
        </div>

        {athletes.length > 0 ? (
          <div className="garmin-grid">
            {athletes.map((athlete) => (
              <GarminAthleteCard
                athlete={athlete}
                canManage={canManage}
                connection={connectionsByAthlete.get(athlete.id) ?? null}
                isPending={pendingAthleteId === athlete.id}
                key={athlete.id}
                onConnect={() => connectAthlete(athlete.id)}
                onDisconnect={() => disconnectAthlete(athlete.id)}
              />
            ))}
          </div>
        ) : (
          <div className="surface empty-state">
            No athletes exist yet. Add players first, then connect Garmin for the relevant athlete
            records.
          </div>
        )}
      </section>
    </section>
  );
}

const GarminAthleteCard = ({
  athlete,
  connection,
  canManage,
  isPending,
  onConnect,
  onDisconnect
}: {
  athlete: Athlete;
  connection: AthleteDeviceConnection | null;
  canManage: boolean;
  isPending: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) => (
  <article className="settings-card garmin-card">
    <div className="settings-card-copy garmin-card-copy">
      <div className="garmin-card-topline">
        <strong>
          {athlete.firstName} {athlete.lastName}
        </strong>
        <span className={`pill ${connection ? "pill-subtle" : ""}`}>
          {connection ? "Connected" : "Not connected"}
        </span>
      </div>

      <p className="muted">
        {athlete.squad ?? "No squad"} · {athlete.position ?? "No position"}
      </p>

      {connection ? (
        <div className="garmin-connection-meta">
          <span>
            Permissions: {connection.grantedPermissions.length > 0 ? connection.grantedPermissions.join(", ") : "none"}
          </span>
          <span>
            Last sync:{" "}
            {connection.lastSuccessfulSyncAt
              ? new Date(connection.lastSuccessfulSyncAt).toLocaleString()
              : "No successful sync yet"}
          </span>
        </div>
      ) : (
        <p className="muted">
          Start OAuth for this athlete to enable Garmin Health and Activity ingestion.
        </p>
      )}
    </div>

    {canManage ? (
      <div className="garmin-card-actions">
        {connection ? (
          <button className="ghost-button" disabled={isPending} onClick={onDisconnect} type="button">
            Disconnect
          </button>
        ) : (
          <button className="primary-button" disabled={isPending} onClick={onConnect} type="button">
            Connect Garmin
          </button>
        )}
      </div>
    ) : null}
  </article>
);

const hasManageAccess = (role: TenantRole) =>
  role === "club_owner" || role === "coach" || role === "performance_staff";
