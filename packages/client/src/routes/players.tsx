import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";

import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({
  params
}: {
  params: Record<string, string | undefined>;
}) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load players.");
  }

  const session = await apiClient.getSession();
  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }
  const activeMembership = session.memberships.find(
    (membership) => membership.status === "active" && membership.tenantSlug === tenantSlug
  );

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const [athletes, squads] = await Promise.all([
    apiClient.getTenantAthletes(tenantSlug),
    apiClient.getTenantSquads(tenantSlug, { status: "active" })
  ]);

  return {
    activeMembership,
    athletes,
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
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "create-athlete") {
      const firstName = String(formData.get("firstName") ?? "").trim();
      const lastName = String(formData.get("lastName") ?? "").trim();
      const squadId = String(formData.get("squadId") ?? "").trim();

      if (!firstName || !lastName || !squadId) {
        return { error: "First name, last name, and squad are required." };
      }

      await apiClient.createAthlete(tenantSlug, {
        externalRef: nullableText(formData.get("externalRef")),
        firstName,
        lastName,
        position: nullableText(formData.get("position")),
        squadId,
        status: "active"
      });

      return { success: "Player created." };
    }

    if (intent === "move-athlete") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      const squadId = String(formData.get("squadId") ?? "").trim();

      if (!athleteId || !squadId) {
        return { error: "Athlete and squad are required." };
      }

      await apiClient.updateAthleteSquad(tenantSlug, athleteId, { squadId });

      return { success: "Player moved to the selected squad." };
    }

    if (intent === "generate-claim-link") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();

      if (!athleteId || !email) {
        return { error: "Athlete and email are required to generate a claim link." };
      }

      const claimLink = await apiClient.createAthleteClaimLink(tenantSlug, athleteId, {
        email
      });

      return {
        claimLink,
        success: "Athlete claim link generated."
      };
    }

    return { error: "Unknown player action." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update players."
    };
  }
};

export default function PlayersRoute() {
  const { activeMembership, athletes, squads } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as
    | {
        error?: string;
        success?: string;
        claimLink?: {
          athleteName: string;
          claimUrl: string;
          email: string;
          expiresAt: string;
        };
      }
    | null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const canManage = hasTenantCapability(activeMembership.role, "athletes:manage");

  return (
    <section className="settings-stack">
      <header className="settings-hero surface">
        <div>
          <p className="eyebrow">Players</p>
          <h1>Athlete roster</h1>
          <p className="muted settings-copy">
            Create athlete records once, attach them to squads, and use those records as the source
            of truth for readiness and Garmin connectivity.
          </p>
        </div>
      </header>

      <div className="settings-grid players-grid">
        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Create player</p>
              <h2>Add a new athlete profile</h2>
            </div>
          </div>

          {canManage ? (
            squads.length > 0 ? (
              <Form className="invite-form" method="post">
                <input name="intent" type="hidden" value="create-athlete" />

                <label className="auth-field">
                  <span>First name</span>
                  <input className="auth-input" name="firstName" placeholder="Egzon" />
                </label>

                <label className="auth-field">
                  <span>Last name</span>
                  <input className="auth-input" name="lastName" placeholder="Ademi" />
                </label>

                <label className="auth-field">
                  <span>Position</span>
                  <input className="auth-input" name="position" placeholder="Midfielder" />
                </label>

                <label className="auth-field">
                  <span>External reference</span>
                  <input className="auth-input" name="externalRef" placeholder="player-101" />
                </label>

                <label className="auth-field">
                  <span>Squad</span>
                  <select className="auth-input invite-select" defaultValue="" name="squadId">
                    <option disabled value="">
                      Select squad
                    </option>
                    {squads.map((squad) => (
                      <option key={squad.id} value={squad.id}>
                        {squad.name}
                      </option>
                    ))}
                  </select>
                </label>

                {actionData?.error ? <p className="form-error">{actionData.error}</p> : null}
                {actionData?.success ? <p className="form-success">{actionData.success}</p> : null}

                <button className="primary-button" disabled={isSubmitting} type="submit">
                  Create player
                </button>
              </Form>
            ) : (
              <div className="surface empty-state">
                Create a squad first so new athletes can be assigned immediately.
              </div>
            )
          ) : (
            <div className="surface empty-state">Analysts can view players but cannot edit the roster.</div>
          )}
        </section>

        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Roster</p>
              <h2>{athletes.length} visible athletes</h2>
            </div>
          </div>

          {athletes.length > 0 ? (
            <div className="settings-list">
              {athletes.map((athlete) => (
                <article className="settings-card player-card" key={athlete.id}>
                  <div className="settings-card-copy">
                    <strong>
                      {athlete.firstName} {athlete.lastName}
                    </strong>
                    <p className="muted">
                      {athlete.currentSquad?.name ?? "No squad"} · {athlete.position ?? "No position"}
                    </p>
                  </div>

                  {canManage && squads.length > 0 ? (
                    <div className="player-card-actions">
                      <Form className="inline-form" method="post">
                        <input name="intent" type="hidden" value="move-athlete" />
                        <input name="athleteId" type="hidden" value={athlete.id} />
                        <select
                          className="auth-input inline-select"
                          defaultValue={athlete.currentSquad?.id ?? ""}
                          name="squadId"
                        >
                          {squads.map((squad) => (
                            <option key={squad.id} value={squad.id}>
                              {squad.name}
                            </option>
                          ))}
                        </select>
                        <button className="ghost-button inline-button" disabled={isSubmitting} type="submit">
                          Move
                        </button>
                      </Form>

                      <Form className="claim-inline-form" method="post">
                        <input name="intent" type="hidden" value="generate-claim-link" />
                        <input name="athleteId" type="hidden" value={athlete.id} />
                        <input
                          className="auth-input claim-email-input"
                          name="email"
                          placeholder="athlete@email.com"
                          type="email"
                        />
                        <button className="ghost-button inline-button" disabled={isSubmitting} type="submit">
                          Generate claim link
                        </button>
                      </Form>
                    </div>
                  ) : (
                    <span className="pill pill-subtle">{athlete.status}</span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="surface empty-state">No athletes exist yet for this organization.</div>
          )}
        </section>
      </div>

      {actionData?.claimLink ? (
        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Latest athlete claim link</p>
              <h2>{actionData.claimLink.athleteName}</h2>
            </div>
          </div>

          <p className="muted">
            Send this link to {actionData.claimLink.email}. It expires{" "}
            {new Date(actionData.claimLink.expiresAt).toLocaleString()}.
          </p>
          <code className="garmin-status-code">{actionData.claimLink.claimUrl}</code>
        </section>
      ) : null}
    </section>
  );
}

const nullableText = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text ? text : null;
};
