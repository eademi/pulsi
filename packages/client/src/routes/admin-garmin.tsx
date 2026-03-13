import { useEffect } from "react";
import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import { useToast } from "../app/toast-provider";
import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSession();

  if (session.actorType === "athlete" || !session.platformAdmin) {
    throw redirect(getDefaultAppPath(session));
  }

  const overview = await apiClient.getAdminGarminOverview();
  return { overview, session };
};

export const clientAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent !== "rerun-backfill") {
    return { error: "Unknown Garmin admin action." };
  }

  const connectionId = String(formData.get("connectionId") ?? "").trim();
  if (!connectionId) {
    return { error: "Connection is required to rerun backfill." };
  }

  try {
    await apiClient.rerunAdminGarminBackfill(connectionId);
    return { success: "Garmin onboarding backfill rerun started." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to rerun Garmin backfill." };
  }
};

export default function AdminGarminRoute() {
  const { overview, session } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string; success?: string } | null;
  const navigation = useNavigation();
  const { pushToast } = useToast();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.error) {
      pushToast({
        title: "Garmin admin action failed",
        body: actionData.error,
        tone: "risk"
      });
    }

    if (actionData?.success) {
      pushToast({
        title: "Garmin admin action complete",
        body: actionData.success,
        tone: "success"
      });
    }
  }, [actionData, pushToast]);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6 lg:px-6">
      <PageHeader
        description={`Internal Garmin diagnostics for ${session.user.email}. Use this surface to verify config, inspect recent Garmin state, and manually rerun onboarding backfill without going through club UI.`}
        eyebrow="Pulsi Admin"
        title="Garmin operations"
      />

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="surface-panel rounded-panel p-5">
            <p className="eyebrow">Configuration</p>
            <div className="mt-4 space-y-3 text-sm text-obsidian-300">
              <div className="flex items-center justify-between gap-3">
                <span>Configured</span>
                <StatusBadge label={overview.config.configured ? "Ready" : "Missing values"} status="active" muted={!overview.config.configured} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-obsidian-500">API base</p>
                <p className="mt-1 break-all text-obsidian-100">{overview.config.apiBaseUrl}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-obsidian-500">OAuth redirect</p>
                <p className="mt-1 break-all text-obsidian-100">{overview.config.oauthRedirectUri}</p>
              </div>
            </div>
          </section>

          <section className="surface-panel rounded-panel p-5">
            <p className="eyebrow">Recent webhook events</p>
            <div className="mt-4 space-y-3">
              {overview.webhookEvents.length > 0 ? (
                overview.webhookEvents.slice(0, 6).map((event) => (
                  <div className="rounded-soft border border-white/8 bg-white/3 px-4 py-3" key={event.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-obsidian-100">{event.notificationType}</p>
                      <StatusBadge label={event.status} status="active" muted={event.status !== "processed"} />
                    </div>
                    <p className="mt-2 text-sm text-obsidian-400">
                      {event.deliveryMethod.toUpperCase()} · {event.tenantSlug ?? "No tenant"} · {new Date(event.receivedAt).toLocaleString()}
                    </p>
                    {event.lastError ? <p className="mt-2 text-xs text-risk-400">{event.lastError}</p> : null}
                  </div>
                ))
              ) : (
                <EmptyState body="No Garmin webhook events have been recorded yet." title="No events" />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-panel rounded-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Connections</p>
                <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Active and historical Garmin links</h2>
              </div>
              <StatusBadge label={String(overview.connections.length)} status="active" />
            </div>

            <div className="mt-4">
              <DataTable headers={["Athlete", "Organization", "Status", "Permissions", "Token health", "Backfill"]}>
                {overview.connections.map((connection) => (
                  <DataRow key={connection.id}>
                    <DataCell>
                      <div className="font-medium text-obsidian-100">{connection.athleteName}</div>
                      <div className="mt-1 text-xs text-obsidian-500">{connection.providerUserId}</div>
                    </DataCell>
                    <DataCell>
                      <div className="text-obsidian-100">{connection.tenantName}</div>
                      <div className="mt-1 text-xs text-obsidian-500">{connection.tenantSlug}</div>
                    </DataCell>
                    <DataCell>
                      <StatusBadge label={connection.status} status="active" muted={connection.status !== "active"} />
                    </DataCell>
                    <DataCell>
                      <div className="flex flex-wrap gap-1">
                        {connection.grantedPermissions.map((permission) => (
                          <span className="pill pill-muted" key={permission}>
                            {permission}
                          </span>
                        ))}
                      </div>
                    </DataCell>
                    <DataCell>
                      <div className="text-sm text-obsidian-100">
                        Access: {connection.accessTokenExpiresAt ? new Date(connection.accessTokenExpiresAt).toLocaleString() : "n/a"}
                      </div>
                      <div className="mt-1 text-xs text-obsidian-500">
                        Refresh: {connection.refreshTokenExpiresAt ? new Date(connection.refreshTokenExpiresAt).toLocaleString() : "n/a"}
                      </div>
                    </DataCell>
                    <DataCell>
                      <Form method="post">
                        <input name="intent" type="hidden" value="rerun-backfill" />
                        <input name="connectionId" type="hidden" value={connection.id} />
                        <button className="btn-secondary h-10" disabled={isSubmitting} type="submit">
                          Rerun backfill
                        </button>
                      </Form>
                    </DataCell>
                  </DataRow>
                ))}
              </DataTable>
            </div>
          </section>

          <section className="surface-panel rounded-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">OAuth and jobs</p>
                <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Recent Garmin session activity</h2>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-soft border border-white/8 bg-white/3 p-4">
                <p className="text-sm font-semibold text-obsidian-100">OAuth sessions</p>
                <div className="mt-3 space-y-3">
                  {overview.oauthSessions.length > 0 ? (
                    overview.oauthSessions.slice(0, 8).map((sessionItem) => (
                      <div className="border-b border-white/8 pb-3 last:border-b-0 last:pb-0" key={sessionItem.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-obsidian-100">{sessionItem.athleteName}</p>
                          <StatusBadge
                            label={sessionItem.status}
                            status="active"
                            muted={sessionItem.status !== "completed"}
                          />
                        </div>
                        <p className="mt-1 text-xs text-obsidian-500">
                          {sessionItem.tenantSlug} · {new Date(sessionItem.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState body="No Garmin OAuth sessions have been created yet." title="No sessions" />
                  )}
                </div>
              </div>

              <div className="rounded-soft border border-white/8 bg-white/3 p-4">
                <p className="text-sm font-semibold text-obsidian-100">Sync jobs</p>
                <div className="mt-3 space-y-3">
                  {overview.syncJobs.length > 0 ? (
                    overview.syncJobs.slice(0, 8).map((job) => (
                      <div className="border-b border-white/8 pb-3 last:border-b-0 last:pb-0" key={job.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-obsidian-100">{job.athleteName ?? "No athlete"}</p>
                          <StatusBadge
                            label={job.status}
                            status="active"
                            muted={job.status !== "succeeded"}
                          />
                        </div>
                        <p className="mt-1 text-xs text-obsidian-500">
                          {job.tenantSlug} · attempts {job.attempts} · {new Date(job.createdAt).toLocaleString()}
                        </p>
                        {job.lastError ? <p className="mt-2 text-xs text-risk-400">{job.lastError}</p> : null}
                      </div>
                    ))
                  ) : (
                    <EmptyState body="No Garmin sync jobs have been recorded yet." title="No jobs" />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
