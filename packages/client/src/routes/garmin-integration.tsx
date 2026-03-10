import { startTransition, useState } from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";

import type {
  Athlete,
  AthleteDeviceConnection,
  GarminIntegrationStatus,
  TenantRole
} from "@pulsi/shared";

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

  const [athletes, connections, integrationStatus] = await Promise.all([
    apiClient.getTenantAthletes(tenantSlug),
    apiClient.getGarminConnections(tenantSlug),
    apiClient.getGarminIntegrationStatus(tenantSlug)
  ]);

  return {
    activeMembership,
    athletes,
    connections,
    integrationStatus,
    tenantSlug
  };
};

export default function GarminIntegrationRoute() {
  const { activeMembership, athletes, connections, integrationStatus, tenantSlug } =
    useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<
    Record<string, { authorizationUrl: string; expiresAt: string }>
  >({});
  const canManage = hasManageAccess(activeMembership.role) && integrationStatus.configured;
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
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to start Garmin connection."
      });
      setPendingAthleteId(null);
    }
  };

  const generateConsentLink = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      const session = await apiClient.createGarminConnectionSession(tenantSlug, {
        athleteId
      });

      setGeneratedLinks((current) => ({
        ...current,
        [athleteId]: {
          authorizationUrl: session.authorizationUrl,
          expiresAt: session.expiresAt
        }
      }));
      setMessage({
        kind: "success",
        text: "Athlete Garmin consent link generated."
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to generate Garmin consent link."
      });
    } finally {
      setPendingAthleteId(null);
    }
  };

  const disconnectAthlete = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      await apiClient.disconnectGarminConnection(tenantSlug, athleteId);
      setMessage({
        kind: "success",
        text: "Garmin connection disconnected."
      });
      startTransition(() => revalidator.revalidate());
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Unable to disconnect Garmin."
      });
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

      {message ? (
        <p className={message.kind === "success" ? "form-success" : "form-error"}>{message.text}</p>
      ) : null}

      {!integrationStatus.configured ? (
        <section className="surface settings-panel garmin-status-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Garmin setup required</p>
              <h2>Garmin OAuth is not configured locally</h2>
            </div>
          </div>
          <p className="muted">
            {integrationStatus.reason ??
              "Set your real Garmin application credentials before starting athlete connections."}
          </p>
          <code className="garmin-status-code">packages/api/.env.local</code>
        </section>
      ) : null}

      <section className="surface settings-panel">
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">Connection modes</p>
            <h2>Staff-assisted or remote athlete consent</h2>
          </div>
        </div>

        <div className="garmin-mode-grid">
          <article className="settings-card garmin-mode-card">
            <div className="settings-card-copy">
              <strong>Connect on this device</strong>
              <p className="muted">
                Best when the athlete is present with staff. Open Garmin OAuth immediately and let
                the athlete sign in on the current device.
              </p>
            </div>
          </article>

          <article className="settings-card garmin-mode-card">
            <div className="settings-card-copy">
              <strong>Generate athlete consent link</strong>
              <p className="muted">
                Best when the athlete is remote. Pulsi creates a Garmin authorization URL that can
                be copied and sent without the athlete needing a Pulsi account.
              </p>
            </div>
          </article>
        </div>
      </section>

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
                generatedLink={generatedLinks[athlete.id] ?? null}
                integrationStatus={integrationStatus}
                isPending={pendingAthleteId === athlete.id}
                key={athlete.id}
                onConnect={() => connectAthlete(athlete.id)}
                onGenerateLink={() => generateConsentLink(athlete.id)}
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
  generatedLink,
  integrationStatus,
  isPending,
  onConnect,
  onGenerateLink,
  onDisconnect
}: {
  athlete: Athlete;
  connection: AthleteDeviceConnection | null;
  canManage: boolean;
  generatedLink: { authorizationUrl: string; expiresAt: string } | null;
  integrationStatus: GarminIntegrationStatus;
  isPending: boolean;
  onConnect: () => void;
  onGenerateLink: () => void;
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
          {integrationStatus.configured
            ? "Start OAuth for this athlete to enable Garmin Health and Activity ingestion."
            : "Garmin connection is disabled until the local server is configured with real Garmin credentials."}
        </p>
      )}

      {generatedLink ? (
        <div className="garmin-link-panel">
          <div className="garmin-link-header">
            <span className="eyebrow">Athlete consent link</span>
            <span className="muted">
              Expires {new Date(generatedLink.expiresAt).toLocaleString()}
            </span>
          </div>
          <div className="garmin-link-row">
            <input
              className="auth-input garmin-link-input"
              readOnly
              type="text"
              value={generatedLink.authorizationUrl}
            />
            <button
              className="ghost-button garmin-copy-button"
              onClick={() => void navigator.clipboard.writeText(generatedLink.authorizationUrl)}
              type="button"
            >
              Copy link
            </button>
          </div>
        </div>
      ) : null}
    </div>

    {canManage ? (
      <div className="garmin-card-actions">
        {connection ? (
          <button className="ghost-button" disabled={isPending} onClick={onDisconnect} type="button">
            Disconnect
          </button>
        ) : (
          <>
            <button className="primary-button" disabled={isPending} onClick={onConnect} type="button">
              Connect here
            </button>
            <button className="ghost-button" disabled={isPending} onClick={onGenerateLink} type="button">
              Generate link
            </button>
          </>
        )}
      </div>
    ) : null}
  </article>
);

const hasManageAccess = (role: TenantRole) =>
  role === "club_owner" || role === "coach" || role === "performance_staff";
