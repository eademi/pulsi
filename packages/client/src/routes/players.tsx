import { useEffect, useRef, useState } from "react";
import { Form, redirect, useActionData, useLoaderData, useNavigation, useSubmit } from "react-router";
import { hasTenantCapability, type Athlete } from "@pulsi/shared";

import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { CenteredDialog, ConfirmDialog } from "../components/ui/dialogs";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { MetricTooltip } from "../components/ui/tooltip";
import { useToast } from "../app/toast-provider";
import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const tenantSlug = params.tenantSlug;
  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load players.");
  }

  const session = await apiClient.getSession();
  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }
  const activeMembership = session.memberships.find((membership) => membership.status === "active" && membership.tenantSlug === tenantSlug);

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const [athletes, squads, garminConnections] = await Promise.all([
    apiClient.getTenantAthletes(tenantSlug, { status: "all" }),
    apiClient.getTenantSquads(tenantSlug, { status: "active" }),
    apiClient.getGarminConnections(tenantSlug),
  ]);

  return { activeMembership, athletes, garminConnections, squads, tenantSlug };
};

export const clientAction = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
  const feedbackId = crypto.randomUUID();
  const tenantSlug = params.tenantSlug;
  if (!tenantSlug) {
    return { error: "Tenant slug is required.", feedbackId, intent: "unknown" };
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "create-athlete") {
      const firstName = String(formData.get("firstName") ?? "").trim();
      const lastName = String(formData.get("lastName") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      const squadId = String(formData.get("squadId") ?? "").trim();

      if (!firstName || !lastName || !email || !squadId) {
        return { error: "First name, last name, athlete email, and squad are required.", feedbackId, intent };
      }

      const createdAthlete = await apiClient.createAthlete(tenantSlug, {
        externalRef: nullableText(formData.get("externalRef")),
        firstName,
        lastName,
        email,
        position: nullableText(formData.get("position")),
        squadId,
        status: "active",
      });

      return {
        invite: createdAthlete.invite,
        feedbackId,
        intent,
        success: "Player created and athlete account invite generated.",
      };
    }

    if (intent === "move-athlete") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      const squadId = String(formData.get("squadId") ?? "").trim();
      if (!athleteId || !squadId) {
        return { error: "Athlete and squad are required.", feedbackId, intent };
      }

      await apiClient.updateAthleteSquad(tenantSlug, athleteId, { squadId });
      return { feedbackId, intent, success: "Player moved to the selected squad." };
    }

    if (intent === "archive-athlete") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      if (!athleteId) {
        return { error: "Athlete is required.", feedbackId, intent };
      }

      await apiClient.archiveAthlete(tenantSlug, athleteId);
      return { feedbackId, intent, success: "Athlete archived. Garmin access and pending athlete invites were revoked." };
    }

    if (intent === "restore-athlete") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      const squadId = String(formData.get("squadId") ?? "").trim();
      if (!athleteId || !squadId) {
        return { error: "Athlete and squad are required to restore an archived profile.", feedbackId, intent };
      }

      await apiClient.restoreAthlete(tenantSlug, athleteId, { squadId });
      return { feedbackId, intent, success: "Athlete restored to the selected squad." };
    }

    if (intent === "delete-athlete") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      if (!athleteId) {
        return { error: "Athlete is required.", feedbackId, intent };
      }

      await apiClient.deleteAthlete(tenantSlug, athleteId);
      return { feedbackId, intent, success: "Athlete permanently deleted." };
    }

    if (intent === "generate-athlete-invite") {
      const athleteId = String(formData.get("athleteId") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim();
      if (!athleteId || !email) {
        return { error: "Athlete and email are required to generate an athlete invite.", feedbackId, intent };
      }

      const invite = await apiClient.createAthleteClaimLink(tenantSlug, athleteId, { email });
      return {
        invite,
        feedbackId,
        intent,
        success: "Athlete account invite generated.",
      };
    }

    return { error: "Unknown player action.", feedbackId, intent: intent || "unknown" };
  } catch (error) {
    return {
      feedbackId,
      intent: intent || "unknown",
      error: error instanceof Error ? error.message : "Unable to update players.",
    };
  }
};

export default function PlayersRoute() {
  const { activeMembership, athletes, garminConnections, squads } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as {
    error?: string;
    feedbackId?: string;
    intent?: string;
    success?: string;
    invite?: {
      athleteName: string;
      claimUrl: string;
      email: string;
      expiresAt: string;
    };
  } | null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const canManage = hasTenantCapability(activeMembership.role, "athletes:manage");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [moveModalAthleteId, setMoveModalAthleteId] = useState<string | null>(null);
  const [accountDialogAthleteId, setAccountDialogAthleteId] = useState<string | null>(null);
  const { pushToast } = useToast();
  const submit = useSubmit();
  const lastHandledFeedbackId = useRef<string | null>(null);
  const activeAthletes = athletes.filter((athlete) => athlete.status !== "inactive");
  const archivedAthletes = athletes.filter((athlete) => athlete.status === "inactive");
  const garminConnectedAthleteIds = new Set(
    garminConnections.filter((connection) => connection.status === "active").map((connection) => connection.athleteId),
  );
  const moveModalAthlete = activeAthletes.find((athlete) => athlete.id === moveModalAthleteId) ?? null;
  const accountDialogAthlete = athletes.find((athlete) => athlete.id === accountDialogAthleteId && athlete.accountState === "claimed") ?? null;

  const submitDeleteAthlete = (athleteId: string) => {
    const formData = new FormData();
    formData.set("intent", "delete-athlete");
    formData.set("athleteId", athleteId);
    submit(formData, { method: "post" });
  };

  useEffect(() => {
    if (actionData?.success && actionData.intent === "create-athlete") {
      setCreateModalOpen(false);
    }
  }, [actionData]);

  useEffect(() => {
    if (actionData?.success && actionData.intent === "move-athlete") {
      setMoveModalAthleteId(null);
    }
  }, [actionData]);

  useEffect(() => {
    if (!actionData?.intent || actionData.intent === "create-athlete") {
      return;
    }

    const message = actionData.error ?? actionData.success;
    if (!message) {
      return;
    }

    if (!actionData.feedbackId || lastHandledFeedbackId.current === actionData.feedbackId) {
      return;
    }

    lastHandledFeedbackId.current = actionData.feedbackId;
    pushToast({
      body: message,
      title: actionData.error ? `${describeIntent(actionData.intent)} failed` : `${describeIntent(actionData.intent)} complete`,
      tone: actionData.error ? "risk" : "success",
    });
  }, [actionData, pushToast]);

  return (
    <section className="space-y-4">
      <PageHeader
        actions={
          canManage ? (
            <button className="btn-primary" disabled={squads.length === 0} onClick={() => setCreateModalOpen(true)} type="button">
              Add player
            </button>
          ) : undefined
        }
        description="Create athlete records with their Pulsi account setup invite, assign them to squads, and use those records as the source of truth for readiness and Garmin connectivity."
        eyebrow="Players"
        title="Athlete roster operations"
      />

      {!canManage ? (
        <section className="surface-panel rounded-panel p-5">
          <EmptyState body="Your role can review the roster but not change it." title="View only" />
        </section>
      ) : null}

      {canManage && squads.length === 0 ? (
        <section className="surface-panel rounded-panel p-5">
          <EmptyState body="Create a squad first so athletes can be assigned immediately." title="No active squads" />
        </section>
      ) : null}

      <div className="space-y-4">
        <section className="surface-panel rounded-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Active roster</p>
              <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Manage current players</h2>
            </div>
            <StatusBadge label={String(activeAthletes.length)} status="active" />
          </div>

          <div className="mt-4">
            <DataTable headers={["Athlete", "Pulsi account", "Squad", "Status", "Move squad", "Account invite", "Lifecycle"]}>
              {activeAthletes.map((athlete) => (
                <DataRow key={athlete.id}>
                  <DataCell>
                    <AthleteIdentityCell athlete={athlete} garminConnected={garminConnectedAthleteIds.has(athlete.id)} />
                  </DataCell>
                  <DataCell>
                    <AccountStateBadge athlete={athlete} onOpenDetails={setAccountDialogAthleteId} />
                  </DataCell>
                  <DataCell>{athlete.currentSquad?.name ?? "No squad"}</DataCell>
                  <DataCell>
                    <StatusBadge label={athlete.status} status={athlete.status === "active" ? "active" : "no_data"} />
                  </DataCell>
                  <DataCell>
                    {canManage && squads.length > 0 ? (
                      <button className="btn-secondary h-10" onClick={() => setMoveModalAthleteId(athlete.id)} type="button">
                        Move squad
                      </button>
                    ) : (
                      "—"
                    )}
                  </DataCell>
                  <DataCell>
                    {canManage ? (
      athlete.accountState === "claimed" ? (
                        <span className="pill pill-muted">Already claimed</span>
                      ) : (
                        <Form className="flex gap-2" method="post">
                          <input name="intent" type="hidden" value="generate-athlete-invite" />
                          <input name="athleteId" type="hidden" value={athlete.id} />
                          <input
                            className="input-field h-10 min-w-40"
                            defaultValue={athlete.accountDetails?.pendingEmail ?? ""}
                            name="email"
                            placeholder="athlete@pulsi.com"
                            type="email"
                          />
                          <button className="btn-secondary h-10" disabled={isSubmitting} type="submit">
                            {athlete.accountState === "invited" ? "Resend invite" : "Send invite"}
                          </button>
                        </Form>
                      )
                    ) : (
                      "—"
                    )}
                  </DataCell>
                  <DataCell>
                    {canManage ? (
                      <Form method="post">
                        <input name="intent" type="hidden" value="archive-athlete" />
                        <input name="athleteId" type="hidden" value={athlete.id} />
                        <button className="btn-danger h-10" disabled={isSubmitting} type="submit">
                          Archive
                        </button>
                      </Form>
                    ) : (
                      "—"
                    )}
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          </div>
        </section>

        <section className="surface-panel rounded-panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Archived athletes</p>
              <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Restore or permanently remove</h2>
            </div>
            <StatusBadge label={String(archivedAthletes.length)} status="no_data" />
          </div>
          <p className="mt-3 text-sm text-obsidian-400">
            Archiving is the default lifecycle path. Permanent deletion is only allowed for clean records with no Pulsi account, Garmin connection, or
            historical data.
          </p>

          <div className="mt-4">
            {archivedAthletes.length > 0 ? (
              <DataTable headers={["Athlete", "Garmin", "Pulsi account", "Status", "Restore to squad", "Delete permanently"]}>
                {archivedAthletes.map((athlete) => (
                  <DataRow key={athlete.id}>
                    <DataCell>
                      <AthleteIdentityCell athlete={athlete} garminConnected={garminConnectedAthleteIds.has(athlete.id)} />
                    </DataCell>
                    <DataCell>
                      <GarminConnectionBadge connected={garminConnectedAthleteIds.has(athlete.id)} />
                    </DataCell>
                    <DataCell>
                      <AccountStateBadge athlete={athlete} onOpenDetails={setAccountDialogAthleteId} />
                    </DataCell>
                    <DataCell>
                      <StatusBadge label="archived" status="no_data" />
                    </DataCell>
                    <DataCell>
                      {canManage && squads.length > 0 ? (
                        <Form className="flex gap-2" method="post">
                          <input name="intent" type="hidden" value="restore-athlete" />
                          <input name="athleteId" type="hidden" value={athlete.id} />
                          <select className="input-field h-10 min-w-32" defaultValue="" name="squadId">
                            <option disabled value="">
                              Select squad
                            </option>
                            {squads.map((squad) => (
                              <option key={squad.id} value={squad.id}>
                                {squad.name}
                              </option>
                            ))}
                          </select>
                          <button className="btn-secondary h-10" disabled={isSubmitting} type="submit">
                            Restore
                          </button>
                        </Form>
                      ) : (
                        "—"
                      )}
                    </DataCell>
                    <DataCell>
                      {canManage ? (
                        <ConfirmDialog
                          confirmLabel="Delete athlete"
                          description={`Permanently remove ${athlete.firstName} ${athlete.lastName}. This only succeeds for archived profiles with no Pulsi athlete account, Garmin connection, or historical readiness data.`}
                          onConfirm={() => submitDeleteAthlete(athlete.id)}
                          title="Delete archived athlete?"
                          trigger={<span className={`btn-danger h-10 ${isSubmitting ? "pointer-events-none opacity-45" : ""}`}>Delete</span>}
                        />
                      ) : (
                        "—"
                      )}
                    </DataCell>
                  </DataRow>
                ))}
              </DataTable>
            ) : (
              <EmptyState body="Archived athletes will appear here once a profile is removed from the active roster." title="No archived athletes" />
            )}
          </div>
        </section>

        {actionData?.invite ? (
          <section className="surface-grid rounded-panel p-5">
            <p className="eyebrow">Latest athlete account invite</p>
            <h2 className="mt-2 text-xl font-semibold text-obsidian-100">{actionData.invite.athleteName}</h2>
            <p className="mt-3 text-sm text-obsidian-400">
              Send this setup link to {actionData.invite.email}. It expires {new Date(actionData.invite.expiresAt).toLocaleString()}.
            </p>
            <code className="mt-4 block rounded-soft border border-white/8 bg-black/20 px-4 py-3 text-xs text-accent-300">
              {actionData.invite.claimUrl}
            </code>
          </section>
        ) : null}
      </div>

      <CenteredDialog
        description="Create a new player record, assign it to an active squad, and issue the initial Pulsi account setup invite in one step."
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn-primary" disabled={isSubmitting} form="create-athlete-form" type="submit">
              {isSubmitting && navigation.formData?.get("intent") === "create-athlete" ? "Creating..." : "Create player"}
            </button>
          </>
        }
        onOpenChange={setCreateModalOpen}
        open={createModalOpen}
        title="Add athlete profile"
        widthClassName="max-w-xl"
      >
        <Form className="space-y-4" id="create-athlete-form" method="post">
          <input name="intent" type="hidden" value="create-athlete" />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">First name</span>
              <input className="input-field" name="firstName" placeholder="Egzon" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">Last name</span>
              <input className="input-field" name="lastName" placeholder="Ademi" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">Position</span>
              <input className="input-field" name="position" placeholder="Midfielder" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">Athlete email</span>
              <input className="input-field" name="email" placeholder="egzon@pulsi.com" type="email" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {actionData?.intent === "create-athlete" && actionData?.error ? <Message tone="error">{actionData.error}</Message> : null}
          {actionData?.intent === "create-athlete" && actionData?.success ? <Message tone="success">{actionData.success}</Message> : null}
        </Form>
      </CenteredDialog>

      <CenteredDialog
        description={
          moveModalAthlete
            ? `Move ${moveModalAthlete.firstName} ${moveModalAthlete.lastName} to a different squad. This should be used only when the athlete actually changes roster context.`
            : "Move this athlete to a different squad."
        }
        footer={
          <>
            <button className="btn-secondary" onClick={() => setMoveModalAthleteId(null)} type="button">
              Cancel
            </button>
            <button className="btn-primary" disabled={isSubmitting || !moveModalAthlete} form="move-athlete-form" type="submit">
              {isSubmitting && navigation.formData?.get("intent") === "move-athlete" ? "Moving..." : "Move athlete"}
            </button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) {
            setMoveModalAthleteId(null);
          }
        }}
        open={Boolean(moveModalAthlete)}
        title="Move athlete to squad"
        widthClassName="max-w-lg"
      >
        {moveModalAthlete ? (
          <Form className="space-y-4" id="move-athlete-form" method="post">
            <input name="intent" type="hidden" value="move-athlete" />
            <input name="athleteId" type="hidden" value={moveModalAthlete.id} />

            <div className="rounded-soft border border-white/8 bg-white/3 px-4 py-3">
              <p className="text-sm font-medium text-obsidian-100">
                {moveModalAthlete.firstName} {moveModalAthlete.lastName}
              </p>
              <p className="mt-1 text-sm text-obsidian-400">Current squad: {moveModalAthlete.currentSquad?.name ?? "Unassigned"}</p>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">New squad</span>
              <select className="input-field" defaultValue={moveModalAthlete.currentSquad?.id ?? ""} name="squadId">
                {squads.map((squad) => (
                  <option key={squad.id} value={squad.id}>
                    {squad.name}
                  </option>
                ))}
              </select>
            </label>

            {actionData?.intent === "move-athlete" && actionData?.error ? <Message tone="error">{actionData.error}</Message> : null}
          </Form>
        ) : null}
      </CenteredDialog>

      <CenteredDialog
        description={
          accountDialogAthlete
            ? `Pulsi athlete-account details for ${accountDialogAthlete.firstName} ${accountDialogAthlete.lastName}.`
            : "Pulsi athlete-account details."
        }
        footer={
          <button className="btn-secondary" onClick={() => setAccountDialogAthleteId(null)} type="button">
            Close
          </button>
        }
        onOpenChange={(open) => {
          if (!open) {
            setAccountDialogAthleteId(null);
          }
        }}
        open={Boolean(accountDialogAthlete)}
        title="Athlete account"
        widthClassName="max-w-lg"
      >
        {accountDialogAthlete ? (
          <div className="space-y-4">
            <div className="rounded-soft border border-white/8 bg-white/3 px-4 py-3">
              <p className="text-sm font-medium text-obsidian-100">
                {accountDialogAthlete.firstName} {accountDialogAthlete.lastName}
              </p>
              <p className="mt-1 text-sm text-obsidian-400">Squad: {accountDialogAthlete.currentSquad?.name ?? "Unassigned"}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AccountDetail label="Pulsi account" value={accountDialogAthlete.accountDetails?.email ?? "Unknown"} />
              <AccountDetail label="Linked user name" value={accountDialogAthlete.accountDetails?.name ?? "Unknown"} />
              <AccountDetail
                label="Activated at"
                value={
                  accountDialogAthlete.accountDetails?.claimedAt
                    ? new Date(accountDialogAthlete.accountDetails.claimedAt).toLocaleString()
                    : "Unknown"
                }
              />
              <AccountDetail label="Garmin status" value={garminConnectedAthleteIds.has(accountDialogAthlete.id) ? "Connected" : "Not connected"} />
            </div>
          </div>
        ) : null}
      </CenteredDialog>
    </section>
  );
}

function Message({ tone, children }: { tone: "error" | "success"; children: string }) {
  return (
    <p
      className={
        tone === "success"
          ? "rounded-soft border border-ready-500/25 bg-ready-500/10 px-4 py-3 text-sm text-ready-500"
          : "rounded-soft border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500"
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

function describeIntent(intent?: string) {
  switch (intent) {
    case "move-athlete":
      return "Squad move";
    case "archive-athlete":
      return "Archive athlete";
    case "restore-athlete":
      return "Restore athlete";
    case "delete-athlete":
      return "Delete athlete";
    case "generate-athlete-invite":
      return "Athlete invite";
    case "create-athlete":
      return "Create athlete";
    default:
      return "Player update";
  }
}

function GarminIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 8.5A4.5 4.5 0 0 1 11.5 4h1A4.5 4.5 0 0 1 17 8.5v7A4.5 4.5 0 0 1 12.5 20h-1A4.5 4.5 0 0 1 7 15.5z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function AthleteIdentityCell({ athlete, garminConnected }: { athlete: Athlete; garminConnected: boolean }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="font-medium text-obsidian-100">
          {athlete.firstName} {athlete.lastName}
        </div>
        {garminConnected ? (
          <MetricTooltip content="Garmin account connected">
            <span className="inline-flex size-7 items-center justify-center rounded-full border border-accent-500/25 bg-accent-500/10 text-accent-300">
              <GarminIcon />
            </span>
          </MetricTooltip>
        ) : null}
      </div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">{athlete.position ?? "Player"}</div>
    </>
  );
}

function GarminConnectionBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <span className="pill border-accent-500/35 bg-accent-500/12 text-accent-300">
        <GarminIcon />
        Garmin connected
      </span>
    );
  }

  return <span className="pill pill-muted">No Garmin</span>;
}

function AccountStateBadge({ athlete, onOpenDetails }: { athlete: Athlete; onOpenDetails: (athleteId: string) => void }) {
  if (athlete.accountState === "claimed") {
    return (
      <button className="btn-secondary h-9" onClick={() => onOpenDetails(athlete.id)} type="button">
        Claimed
      </button>
    );
  }

  if (athlete.accountState === "invited") {
    return <span className="pill pill-caution">Invite pending</span>;
  }

  return <span className="pill pill-muted">No account</span>;
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-soft border border-white/8 bg-white/3 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-obsidian-500">{label}</p>
      <p className="mt-2 text-sm text-obsidian-100">{value}</p>
    </div>
  );
}
