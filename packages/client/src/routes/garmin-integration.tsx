import { startTransition, useState } from "react";
import { redirect, useLoaderData, useRevalidator } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";
import type { Athlete, AthleteDeviceConnection, GarminIntegrationStatus, TenantRole } from "@pulsi/shared";

import { ConfirmDialog } from "../components/ui/dialogs";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load Garmin integration.");
  }

  const session = await apiClient.getSession();
  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }
  const activeMembership = session.memberships.find((membership) => membership.status === "active" && membership.tenantSlug === tenantSlug);

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const [athletes, connections, integrationStatus] = await Promise.all([
    apiClient.getTenantAthletes(tenantSlug),
    apiClient.getGarminConnections(tenantSlug),
    apiClient.getGarminIntegrationStatus(tenantSlug),
  ]);

  return { activeMembership, athletes, connections, integrationStatus, tenantSlug };
};

export default function GarminIntegrationRoute() {
  const { activeMembership, athletes, connections, integrationStatus, tenantSlug } = useLoaderData<typeof clientLoader>();
  const revalidator = useRevalidator();
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, { authorizationUrl: string; expiresAt: string }>>({});
  const canManage = hasManageAccess(activeMembership.role) && integrationStatus.configured;
  const connectionsByAthlete = new Map(connections.map((connection) => [connection.athleteId, connection]));

  const connectAthlete = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      const session = await apiClient.createGarminConnectionSession(tenantSlug, { athleteId });
      window.location.assign(session.authorizationUrl);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Unable to start Garmin connection." });
      setPendingAthleteId(null);
    }
  };

  const generateConsentLink = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      const session = await apiClient.createGarminConnectionSession(tenantSlug, { athleteId });
      setGeneratedLinks((current) => ({
        ...current,
        [athleteId]: {
          authorizationUrl: session.authorizationUrl,
          expiresAt: session.expiresAt,
        },
      }));
      setMessage({ kind: "success", text: "Athlete Garmin consent link generated." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Unable to generate Garmin consent link." });
    } finally {
      setPendingAthleteId(null);
    }
  };

  const disconnectAthlete = async (athleteId: string) => {
    setMessage(null);
    setPendingAthleteId(athleteId);

    try {
      await apiClient.disconnectGarminConnection(tenantSlug, athleteId);
      setMessage({ kind: "success", text: "Garmin connection disconnected." });
      startTransition(() => revalidator.revalidate());
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Unable to disconnect Garmin." });
    } finally {
      setPendingAthleteId(null);
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader
        description="Manage athlete Garmin consent, connection health, and the handoff between club staff and athlete self-service."
        eyebrow="Garmin Integration"
        title="Wearable connectivity"
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

      {!integrationStatus.configured ? (
        <section className="surface-grid rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Garmin setup required</p>
          <h2 className="mt-2 text-xl font-semibold text-obsidian-100">OAuth is not configured locally</h2>
          <p className="mt-3 text-sm text-obsidian-400">
            {integrationStatus.reason ?? "Set real Garmin credentials before creating athlete consent sessions."}
          </p>
          <code className="mt-4 block rounded-[var(--radius-soft)] border border-white/8 bg-black/20 px-4 py-3 text-xs text-accent-300">
            packages/api/.env.local
          </code>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ModeCard body="Open Garmin OAuth immediately when the athlete is present with staff." title="Connect on this device" />
        <ModeCard body="Generate a Garmin consent URL and share it remotely with the athlete." title="Generate athlete consent link" />
      </div>

      {athletes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
              onDisconnect={() => disconnectAthlete(athlete.id)}
              onGenerateLink={() => generateConsentLink(athlete.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState body="Create athletes first, then manage their Garmin connection state here." title="No athlete profiles available" />
      )}
    </section>
  );
}

function GarminAthleteCard({
  athlete,
  connection,
  canManage,
  generatedLink,
  integrationStatus,
  isPending,
  onConnect,
  onGenerateLink,
  onDisconnect,
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
}) {
  return (
    <article className="surface-panel rounded-[var(--radius-panel)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{athlete.currentSquad?.name ?? "Unassigned squad"}</p>
          <h3 className="mt-2 text-xl font-semibold text-obsidian-100">
            {athlete.firstName} {athlete.lastName}
          </h3>
          <p className="mt-1 text-sm text-obsidian-500">{athlete.position ?? "Player"}</p>
        </div>
        <StatusBadge status={connection ? "active" : "no_data"} label={connection ? "connected" : "not connected"} />
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-obsidian-300">
          Last sync: {connection?.lastSuccessfulSyncAt ? new Date(connection.lastSuccessfulSyncAt).toLocaleString() : "No sync yet"}
        </div>
        <div className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-obsidian-300">
          Permissions: {connection?.grantedPermissions.join(", ") || "Awaiting consent"}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          className={connection ? "btn-secondary w-full justify-center" : "btn-primary w-full justify-center"}
          disabled={!canManage || !integrationStatus.configured || isPending}
          onClick={onConnect}
          type="button"
        >
          {isPending ? "Starting..." : "Connect on this device"}
        </button>
        <button
          className="btn-secondary w-full justify-center"
          disabled={!canManage || !integrationStatus.configured || isPending}
          onClick={onGenerateLink}
          type="button"
        >
          Generate consent link
        </button>
        {connection ? (
          <ConfirmDialog
            confirmLabel="Disconnect Garmin"
            description="This removes the active Garmin link for this athlete and stops future syncs until they reconnect."
            onConfirm={onDisconnect}
            title="Disconnect this athlete?"
            trigger={<span className="btn-danger w-full justify-center">Disconnect Garmin</span>}
          />
        ) : null}
      </div>

      {generatedLink ? (
        <div className="mt-5 rounded-[var(--radius-soft)] border border-accent-500/20 bg-accent-500/10 p-4">
          <p className="text-sm font-medium text-obsidian-100">Latest consent link</p>
          <p className="mt-1 text-xs text-obsidian-400">Expires {new Date(generatedLink.expiresAt).toLocaleString()}</p>
          <code className="mt-3 block break-all rounded-[var(--radius-soft)] border border-white/8 bg-black/20 px-3 py-3 text-xs text-accent-300">
            {generatedLink.authorizationUrl}
          </code>
        </div>
      ) : null}
    </article>
  );
}

function ModeCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="surface-grid rounded-[var(--radius-panel)] p-5">
      <p className="eyebrow">Connection mode</p>
      <h2 className="mt-2 text-xl font-semibold text-obsidian-100">{title}</h2>
      <p className="mt-3 text-sm text-obsidian-400">{body}</p>
    </section>
  );
}

function hasManageAccess(role: TenantRole) {
  return hasTenantCapability(role, "garmin:manage");
}
