import { Form, Link, redirect, useLoaderData } from "react-router";

import { apiClient } from "../lib/api";
import { getDefaultMembership, hasActiveMemberships } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSessionOptional();

  if (!session) {
    throw redirect("/auth/sign-in");
  }

  if (hasActiveMemberships(session)) {
    const membership = getDefaultMembership(session)!;
    throw redirect(`/${membership.tenantSlug}/dashboard`);
  }

  return { session };
};

export default function WelcomeRoute() {
  const { session } = useLoaderData<typeof clientLoader>();

  return (
    <main className="route-error-shell">
      <section className="route-error-card welcome-card">
        <p className="eyebrow">Account created</p>
        <h1>You are signed in, but no club access has been assigned yet.</h1>
        <p className="muted">
          {session.user.name}, your account exists and your session is active. A Pulsi administrator
          still needs to add you to a club tenant before the dashboard can load.
        </p>

        <div className="welcome-actions">
          <Link className="primary-button welcome-link" to="/">
            Retry access check
          </Link>

          <Form action="/auth/sign-out" method="post">
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </Form>
        </div>
      </section>
    </main>
  );
}
