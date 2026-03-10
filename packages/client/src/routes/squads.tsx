import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";

import { apiClient } from "../lib/api";
import { getDashboardPath } from "../lib/session";

export const clientLoader = async ({
  params
}: {
  params: Record<string, string | undefined>;
}) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load squads.");
  }

  const session = await apiClient.getSession();
  const activeMembership = session.memberships.find(
    (membership) => membership.status === "active" && membership.tenantSlug === tenantSlug
  );

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const squads = await apiClient.getTenantSquads(tenantSlug, { status: "all" });

  return {
    activeMembership,
    squads,
    tenantSlug
  };
};

export const clientAction = async ({
  params,
  request
}: {
  params: Record<string, string | undefined>;
  request: Request;
}) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    return { error: "Tenant slug is required." };
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  if (!name) {
    return { error: "Squad name is required." };
  }

  try {
    await apiClient.createSquad(tenantSlug, {
      category: category || null,
      name,
      slug: slug || undefined
    });

    return { success: "Squad created." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create squad."
    };
  }
};

export default function SquadsRoute() {
  const { activeMembership, squads } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string; success?: string } | null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const canManage = hasTenantCapability(activeMembership.role, "squads:manage");

  return (
    <section className="settings-stack">
      <header className="settings-hero surface">
        <div>
          <p className="eyebrow">Squads</p>
          <h1>Team structure</h1>
          <p className="muted settings-copy">
            Model the squads inside this organization so athlete data, staff access, and Garmin
            visibility all follow the same structure.
          </p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Current squads</p>
              <h2>{squads.length} configured</h2>
            </div>
          </div>

          {squads.length > 0 ? (
            <div className="settings-list">
              {squads.map((squad) => (
                <article className="settings-card" key={squad.id}>
                  <div className="settings-card-copy">
                    <strong>{squad.name}</strong>
                    <p className="muted">
                      {squad.category ?? "General squad"} · {squad.athleteCount} athletes
                    </p>
                  </div>
                  <div className="settings-card-actions">
                    <span className="pill pill-subtle">{squad.slug}</span>
                    <span className="pill pill-subtle">{squad.status}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="surface empty-state">
              No squads exist yet. Create the first squad before adding players.
            </div>
          )}
        </section>

        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Create squad</p>
              <h2>Add a new squad</h2>
            </div>
          </div>

          {canManage ? (
            <Form className="invite-form" method="post">
              <label className="auth-field">
                <span>Name</span>
                <input className="auth-input" name="name" placeholder="Under 18" />
              </label>

              <label className="auth-field">
                <span>Slug</span>
                <input className="auth-input" name="slug" placeholder="u18" />
              </label>

              <label className="auth-field">
                <span>Category</span>
                <input className="auth-input" name="category" placeholder="Academy" />
              </label>

              {actionData?.error ? <p className="form-error">{actionData.error}</p> : null}
              {actionData?.success ? <p className="form-success">{actionData.success}</p> : null}

              <button className="primary-button" disabled={isSubmitting} type="submit">
                Create squad
              </button>
            </Form>
          ) : (
            <div className="surface empty-state">
              Only club owners can create or rename squads.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
