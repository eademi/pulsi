import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDefaultAppPath, hasActiveMemberships } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSessionOptional();

  if (!session) {
    throw redirect("/auth/sign-in");
  }

  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
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
      const slug = String(formData.get("slug") ?? "")
        .trim()
        .toLowerCase();
      const timezone = String(formData.get("timezone") ?? "").trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;

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
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "Unable to complete the request.",
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
    <main className="min-h-screen bg-transparent px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          description={`Signed in as ${session.user.email}. This account has no active organization yet, so create a workspace or accept an invitation.`}
          eyebrow="Workspace onboarding"
          title="Choose how this account enters Pulsi"
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <section className="surface-panel rounded-panel p-6">
            <p className="eyebrow">Create a club workspace</p>
            <h2 className="mt-3 text-2xl font-semibold text-obsidian-100">Start a new organization</h2>
            <p className="mt-3 text-sm text-obsidian-400">Use this when you are the first owner for a club or performance department.</p>

            <Form className="mt-6 space-y-4" method="post">
              <input name="intent" type="hidden" value="create-tenant" />
              <input name="timezone" type="hidden" value={timezone} />

              <label className="grid gap-2">
                <span className="text-sm font-medium text-obsidian-300">Club name</span>
                <input className="input-field" name="name" placeholder="FC Example" type="text" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-obsidian-300">Workspace slug</span>
                <input className="input-field" name="slug" placeholder="fc-example" type="text" />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label={timezone} status="active" />
                <span className="text-sm text-obsidian-500">Timezone can be changed later.</span>
              </div>

              {actionData?.error ? (
                <p className="rounded-soft border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500">{actionData.error}</p>
              ) : null}

              <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
                Create workspace
              </button>
            </Form>
          </section>

          <section className="surface-panel rounded-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Pending invitations</p>
                <h2 className="mt-3 text-2xl font-semibold text-obsidian-100">Access waiting for you</h2>
              </div>
              <StatusBadge label={String(invitations.length)} status="active" />
            </div>

            {invitations.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {invitations.map((invitation) => (
                  <Form className="rounded-soft border border-white/8 bg-white/3 p-4" key={invitation.id} method="post">
                    <input name="intent" type="hidden" value="accept-invitation" />
                    <input name="invitationId" type="hidden" value={invitation.id} />

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-medium text-obsidian-100">{invitation.tenantName}</p>
                        <p className="mt-1 text-sm text-obsidian-400">
                          {invitation.role.replaceAll("_", " ")} · expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="btn-secondary justify-center" disabled={isSubmitting} type="submit">
                        Accept invitation
                      </button>
                    </div>
                  </Form>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  body="If another organization invites this email later, the invitation will appear here automatically."
                  title="No invites yet"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn-secondary" to="/">
                Retry access check
              </Link>
              <Form action="/auth/sign-out" method="post">
                <button className="btn-secondary" type="submit">
                  Sign out
                </button>
              </Form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
