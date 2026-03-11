import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import { apiClient } from "../lib/api";
import { getAthleteHomePath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
  const token = params.token;

  if (!token) {
    throw new Error("Claim token is required.");
  }

  const session = await apiClient.getSessionOptional();
  if (!session) {
    const next = new URL(request.url).pathname;
    throw redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (session.actorType === "athlete") {
    throw redirect(getAthleteHomePath());
  }

  if (session.memberships.length > 0) {
    throw redirect(getDefaultAppPath(session));
  }

  const claim = await apiClient.getAthleteClaim(token);

  return {
    claim,
    session,
  };
};

export const clientAction = async ({ params }: { params: Record<string, string | undefined> }) => {
  const token = params.token;

  if (!token) {
    return { error: "Claim token is required." };
  }

  try {
    await apiClient.acceptAthleteClaim(token);
    const session = await apiClient.getSession();
    throw redirect(getDefaultAppPath(session));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to claim athlete profile.",
    };
  }
};

export default function AthleteClaimRoute() {
  const { claim, session } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 lg:px-6">
      <section className="surface-panel mx-auto flex max-w-3xl flex-col gap-6 rounded-[var(--radius-panel)] p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Athlete claim</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-obsidian-100">Claim your Pulsi profile</h1>
            <p className="mt-3 text-sm text-obsidian-400">
              This link was issued for {claim.email}. You are signed in as {session.user.email}.
            </p>
          </div>

          <Form action="/auth/sign-out" method="post">
            <button className="btn-secondary" type="submit">
              Sign out
            </button>
          </Form>
        </div>

        <section className="surface-grid rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Profile</p>
          <h2 className="mt-3 text-2xl font-semibold text-obsidian-100">{claim.athleteName}</h2>
          <p className="mt-2 text-sm text-obsidian-400">
            {claim.tenantName} · {claim.currentSquad?.name ?? "No squad assigned"}
          </p>
          <p className="mt-2 text-sm text-obsidian-500">Expires {new Date(claim.expiresAt).toLocaleString()}</p>
        </section>

        <section className="rounded-[var(--radius-soft)] border border-white/8 bg-white/[0.03] p-4 text-sm text-obsidian-400">
          Use the same email address your club entered when they generated the claim link. Once claimed, this account becomes athlete-only and will no
          longer access staff routes.
        </section>

        {actionData?.error ? (
          <p className="rounded-[var(--radius-soft)] border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500">{actionData.error}</p>
        ) : null}

        <Form className="grid gap-3" method="post">
          <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
            Claim this athlete profile
          </button>
        </Form>

        <div className="flex flex-wrap items-center gap-3 text-sm text-obsidian-500">
          <span>Need another account?</span>
          <Link className="text-accent-300 hover:text-accent-200" to="/auth/sign-in">
            Switch account
          </Link>
        </div>
      </section>
    </main>
  );
}
