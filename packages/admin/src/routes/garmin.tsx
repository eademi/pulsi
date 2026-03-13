import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import { apiClient } from "../lib/api";

export const clientLoader = async () => {
  const viewer = await apiClient.getAdminBootstrapOptional();

  if (!viewer) {
    throw redirect("/sign-in");
  }

  const overview = await apiClient.getAdminGarminOverview();
  return { overview, viewer };
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

export default function GarminAdminRoute() {
  const { overview, viewer } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string; success?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen px-6 py-8 text-zinc-50">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Pulsi Internal</p>
            <h1 className="mt-3 text-3xl font-semibold">Garmin operations</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Internal Garmin diagnostics for {viewer.email}. This app is intentionally separate from the club-facing client bundle.
            </p>
          </div>
          <Form action="/sign-out" method="post">
            <button className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-100 transition hover:bg-white/5" type="submit">
              Sign out
            </button>
          </Form>
        </header>

        {actionData?.error ? (
          <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-300">
            {actionData.error}
          </section>
        ) : null}

        {actionData?.success ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
            {actionData.success}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Configuration</p>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-zinc-400">Configured</dt>
                  <dd className={overview.config.configured ? "text-emerald-300" : "text-rose-300"}>
                    {overview.config.configured ? "Ready" : "Missing values"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-zinc-500">API base</dt>
                  <dd className="mt-1 break-all text-zinc-100">{overview.config.apiBaseUrl}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.16em] text-zinc-500">OAuth redirect</dt>
                  <dd className="mt-1 break-all text-zinc-100">{overview.config.oauthRedirectUri}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Recent webhook events</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                  {overview.webhookEvents.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {overview.webhookEvents.length > 0 ? (
                  overview.webhookEvents.slice(0, 6).map((event) => (
                    <article className="rounded-xl border border-white/10 bg-white/3 px-4 py-3" key={event.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-100">{event.notificationType}</p>
                        <span className="text-xs text-zinc-400">{event.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {event.deliveryMethod.toUpperCase()} · {event.tenantSlug ?? "No tenant"} · {new Date(event.receivedAt).toLocaleString()}
                      </p>
                      {event.lastError ? <p className="mt-2 text-xs text-rose-300">{event.lastError}</p> : null}
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                    No Garmin webhook events have been recorded yet.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Connections</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                  {overview.connections.length}
                </span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500">
                      <th className="px-3 py-3 font-medium">Athlete</th>
                      <th className="px-3 py-3 font-medium">Organization</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Permissions</th>
                      <th className="px-3 py-3 font-medium">Token health</th>
                      <th className="px-3 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {overview.connections.map((connection) => (
                      <tr key={connection.id}>
                        <td className="px-3 py-4 align-top">
                          <div className="font-medium text-zinc-100">{connection.athleteName}</div>
                          <div className="mt-1 text-xs text-zinc-500">{connection.providerUserId}</div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="text-zinc-100">{connection.tenantName}</div>
                          <div className="mt-1 text-xs text-zinc-500">{connection.tenantSlug}</div>
                        </td>
                        <td className="px-3 py-4 align-top text-zinc-300">{connection.status}</td>
                        <td className="px-3 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {connection.grantedPermissions.map((permission) => (
                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300" key={permission}>
                                {permission}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-xs text-zinc-400">
                          <div>Access: {connection.accessTokenExpiresAt ? new Date(connection.accessTokenExpiresAt).toLocaleString() : "n/a"}</div>
                          <div className="mt-1">Refresh: {connection.refreshTokenExpiresAt ? new Date(connection.refreshTokenExpiresAt).toLocaleString() : "n/a"}</div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <Form method="post">
                            <input name="intent" type="hidden" value="rerun-backfill" />
                            <input name="connectionId" type="hidden" value={connection.id} />
                            <button
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 px-3 text-sm font-medium text-zinc-100 transition hover:bg-white/5 disabled:opacity-60"
                              disabled={isSubmitting}
                              type="submit"
                            >
                              Rerun backfill
                            </button>
                          </Form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
                <h2 className="text-lg font-semibold">OAuth sessions</h2>
                <div className="mt-4 space-y-3">
                  {overview.oauthSessions.length > 0 ? (
                    overview.oauthSessions.slice(0, 8).map((sessionItem) => (
                      <article className="rounded-xl border border-white/10 bg-white/3 px-4 py-3" key={sessionItem.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-100">{sessionItem.athleteName}</p>
                          <span className="text-xs text-zinc-400">{sessionItem.status}</span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          {sessionItem.tenantSlug} · {new Date(sessionItem.createdAt).toLocaleString()}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                      No Garmin OAuth sessions have been created yet.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
                <h2 className="text-lg font-semibold">Sync jobs</h2>
                <div className="mt-4 space-y-3">
                  {overview.syncJobs.length > 0 ? (
                    overview.syncJobs.slice(0, 8).map((job) => (
                      <article className="rounded-xl border border-white/10 bg-white/3 px-4 py-3" key={job.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-100">{job.athleteName ?? "No athlete"}</p>
                          <span className="text-xs text-zinc-400">{job.status}</span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          {job.tenantSlug} · attempts {job.attempts} · {new Date(job.createdAt).toLocaleString()}
                        </p>
                        {job.lastError ? <p className="mt-2 text-xs text-rose-300">{job.lastError}</p> : null}
                      </article>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
                      No Garmin sync jobs have been recorded yet.
                    </p>
                  )}
                </div>
              </section>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
