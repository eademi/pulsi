import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import { apiClient } from "../lib/api";
import { getAthleteHomePath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({
  params,
  request
}: {
  params: Record<string, string | undefined>;
  request: Request;
}) => {
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
    session
  };
};

export const clientAction = async ({
  params
}: {
  params: Record<string, string | undefined>;
}) => {
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
      error: error instanceof Error ? error.message : "Unable to claim athlete profile."
    };
  }
};

export default function AthleteClaimRoute() {
  const { claim, session } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="athlete-shell">
      <section className="athlete-panel surface">
        <div className="athlete-panel-header">
          <div>
            <p className="eyebrow">Athlete claim</p>
            <h1>Claim your Pulsi profile</h1>
            <p className="muted">
              This link was issued for {claim.email}. You are signed in as {session.user.email}.
            </p>
          </div>

          <Form action="/auth/sign-out" method="post">
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </Form>
        </div>

        <section className="surface athlete-insight-panel">
          <p className="eyebrow">Profile</p>
          <h2>{claim.athleteName}</h2>
          <p className="muted">
            {claim.tenantName} · {claim.currentSquad?.name ?? "No squad assigned"}
          </p>
          <p className="muted">
            Expires {new Date(claim.expiresAt).toLocaleString()}
          </p>
        </section>

        {actionData?.error ? <p className="form-error">{actionData.error}</p> : null}

        <Form className="invite-form" method="post">
          <button className="primary-button" disabled={isSubmitting} type="submit">
            Claim this athlete profile
          </button>
        </Form>

        <div className="athlete-footer muted">
          Use the same email address your club entered when they generated the claim link.
          <Link className="welcome-link" to="/auth/sign-in">
            Switch account
          </Link>
        </div>
      </section>
    </main>
  );
}
