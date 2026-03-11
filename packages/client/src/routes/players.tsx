import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";

import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
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

  return { activeMembership, athletes, squads, tenantSlug };
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

      const claimLink = await apiClient.createAthleteClaimLink(tenantSlug, athleteId, { email });
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
    <section className="space-y-4">
      <PageHeader
        description="Create athlete records once, assign them to squads, and use those records as the source of truth for readiness and Garmin connectivity."
        eyebrow="Players"
        title="Athlete roster operations"
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="surface-panel rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Create player</p>
          <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Add athlete profile</h2>

          {canManage ? (
            squads.length > 0 ? (
              <Form className="mt-6 space-y-4" method="post">
                <input name="intent" type="hidden" value="create-athlete" />

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-obsidian-300">First name</span>
                  <input className="input-field" name="firstName" placeholder="Egzon" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-obsidian-300">Last name</span>
                  <input className="input-field" name="lastName" placeholder="Ademi" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-obsidian-300">Position</span>
                  <input className="input-field" name="position" placeholder="Midfielder" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-obsidian-300">External reference</span>
                  <input className="input-field" name="externalRef" placeholder="player-101" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-obsidian-300">Squad</span>
                  <select className="input-field" defaultValue="" name="squadId">
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

                {actionData?.error ? <Message tone="error">{actionData.error}</Message> : null}
                {actionData?.success ? <Message tone="success">{actionData.success}</Message> : null}

                <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
                  Create player
                </button>
              </Form>
            ) : (
              <div className="mt-6">
                <EmptyState body="Create a squad first so athletes can be assigned immediately." title="No active squads" />
              </div>
            )
          ) : (
            <div className="mt-6">
              <EmptyState body="Your role can review the roster but not change it." title="View only" />
            </div>
          )}
        </section>

        <section className="space-y-4">
          <DataTable headers={["Athlete", "Squad", "Status", "Move squad", "Claim link"]}>
            {athletes.map((athlete) => (
              <DataRow key={athlete.id}>
                <DataCell>
                  <div className="font-medium text-obsidian-100">
                    {athlete.firstName} {athlete.lastName}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">
                    {athlete.position ?? "Player"}
                  </div>
                </DataCell>
                <DataCell>{athlete.currentSquad?.name ?? "No squad"}</DataCell>
                <DataCell>
                  <StatusBadge label={athlete.status} status={athlete.status === "active" ? "active" : "no_data"} />
                </DataCell>
                <DataCell>
                  {canManage && squads.length > 0 ? (
                    <Form className="flex gap-2" method="post">
                      <input name="intent" type="hidden" value="move-athlete" />
                      <input name="athleteId" type="hidden" value={athlete.id} />
                      <select className="input-field h-10 min-w-32" defaultValue={athlete.currentSquad?.id ?? ""} name="squadId">
                        {squads.map((squad) => (
                          <option key={squad.id} value={squad.id}>
                            {squad.name}
                          </option>
                        ))}
                      </select>
                      <button className="btn-secondary h-10" disabled={isSubmitting} type="submit">
                        Move
                      </button>
                    </Form>
                  ) : (
                    "—"
                  )}
                </DataCell>
                <DataCell>
                  {canManage ? (
                    <Form className="flex gap-2" method="post">
                      <input name="intent" type="hidden" value="generate-claim-link" />
                      <input name="athleteId" type="hidden" value={athlete.id} />
                      <input className="input-field h-10 min-w-40" name="email" placeholder="athlete@pulsi.com" type="email" />
                      <button className="btn-secondary h-10" disabled={isSubmitting} type="submit">
                        Generate
                      </button>
                    </Form>
                  ) : (
                    "—"
                  )}
                </DataCell>
              </DataRow>
            ))}
          </DataTable>

          {actionData?.claimLink ? (
            <section className="surface-grid rounded-[var(--radius-panel)] p-5">
              <p className="eyebrow">Latest athlete claim link</p>
              <h2 className="mt-2 text-xl font-semibold text-obsidian-100">{actionData.claimLink.athleteName}</h2>
              <p className="mt-3 text-sm text-obsidian-400">
                Send this to {actionData.claimLink.email}. It expires {new Date(actionData.claimLink.expiresAt).toLocaleString()}.
              </p>
              <code className="mt-4 block rounded-[var(--radius-soft)] border border-white/8 bg-black/20 px-4 py-3 text-xs text-accent-300">
                {actionData.claimLink.claimUrl}
              </code>
            </section>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function Message({
  tone,
  children
}: {
  tone: "error" | "success";
  children: string;
}) {
  return (
    <p
      className={
        tone === "success"
          ? "rounded-[var(--radius-soft)] border border-ready-500/25 bg-ready-500/10 px-4 py-3 text-sm text-ready-500"
          : "rounded-[var(--radius-soft)] border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500"
      }
    >
      {children}
    </p>
  );
}

const nullableText = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return text ? text : null;
};
