import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import { apiClient } from "../lib/api";
import { getDefaultAppPath, hasActiveMemberships } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSessionOptional();

  if (!session) {
    throw redirect("/auth/sign-in");
  }

  if (hasActiveMemberships(session)) {
    throw redirect(getDefaultAppPath(session));
  }

  const invitations = await apiClient.getPendingInvitations();

  return { invitations, session };
};

export const clientAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "create-tenant") {
      const name = String(formData.get("name") ?? "").trim();
      const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
      const timezone =
        String(formData.get("timezone") ?? "").trim() ||
        Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (!name || !slug) {
        return { error: "Club name and slug are required." };
      }

      await apiClient.createTenant({ name, slug, timezone });
      const session = await apiClient.getSession();
      throw redirect(getDefaultAppPath(session));
    }

    if (intent === "accept-invitation") {
      const invitationId = String(formData.get("invitationId") ?? "");

      if (!invitationId) {
        return { error: "Invitation id is required." };
      }

      await apiClient.acceptInvitation(invitationId);
      const session = await apiClient.getSession();
      throw redirect(getDefaultAppPath(session));
    }

    return { error: "Unsupported welcome action." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to complete the request."
    };
  }
};

export default function WelcomeRoute() {
  const { invitations, session } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string } | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <main className="welcome-shell">
      <section className="welcome-grid">
        <article className="surface welcome-panel">
          <p className="eyebrow">Workspace access</p>
          <h1>Choose how this account should enter Pulsi.</h1>
          <p className="muted">
            {session.user.name}, your account is active. You can create a new club workspace or
            accept an invitation that was sent to {session.user.email}.
          </p>

          {actionData?.error ? <p className="form-error">{actionData.error}</p> : null}

          <Form className="welcome-form" method="post">
            <input name="intent" type="hidden" value="create-tenant" />
            <input name="timezone" type="hidden" value={timezone} />

            <div className="welcome-form-grid">
              <label className="auth-field">
                <span>Club name</span>
                <input className="auth-input" name="name" placeholder="FC Example" type="text" />
              </label>

              <label className="auth-field">
                <span>Workspace slug</span>
                <input className="auth-input" name="slug" placeholder="fc-example" type="text" />
              </label>
            </div>

            <div className="welcome-inline-meta">
              <span className="pill pill-subtle">{timezone}</span>
              <span className="muted">Timezone defaults to this browser and can be changed later.</span>
            </div>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              Create tenant workspace
            </button>
          </Form>
        </article>

        <article className="surface welcome-panel">
          <div className="welcome-section-header">
            <div>
              <p className="eyebrow">Pending invitations</p>
              <h2>{invitations.length > 0 ? "Access waiting for you" : "No invites yet"}</h2>
            </div>
            <span className="pill pill-subtle">{invitations.length}</span>
          </div>

          {invitations.length > 0 ? (
            <div className="invitation-stack">
              {invitations.map((invitation) => (
                <Form className="invitation-card" key={invitation.id} method="post">
                  <input name="intent" type="hidden" value="accept-invitation" />
                  <input name="invitationId" type="hidden" value={invitation.id} />

                  <div>
                    <p className="eyebrow">Invite from {invitation.tenantName}</p>
                    <h3>{invitation.role.replaceAll("_", " ")}</h3>
                    <p className="muted">
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>

                  <button className="ghost-button invitation-button" disabled={isSubmitting} type="submit">
                    Accept invitation
                  </button>
                </Form>
              ))}
            </div>
          ) : (
            <div className="welcome-empty-state">
              <p className="muted">
                If another club owner adds you later, the invitation will appear here the next time
                you visit this page.
              </p>
            </div>
          )}

          <div className="welcome-footer-actions">
            <Link className="ghost-button welcome-link-button" to="/">
              Retry access check
            </Link>

            <Form action="/auth/sign-out" method="post">
              <button className="ghost-button" type="submit">
                Sign out
              </button>
            </Form>
          </div>
        </article>
      </section>
    </main>
  );
}
