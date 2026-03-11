import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";
import type { TenantInvitation, TenantMember, TenantRole } from "@pulsi/shared";

import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load organization settings.");
  }

  const session = await apiClient.getSession();
  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }
  const activeMembership = session.memberships.find((membership) => membership.status === "active" && membership.tenantSlug === tenantSlug);

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  if (!hasTenantCapability(activeMembership.role, "staff:manage")) {
    throw redirect(getDashboardPath(tenantSlug));
  }

  const [members, invitations, squads] = await Promise.all([
    apiClient.getTenantMembers(tenantSlug),
    apiClient.getTenantInvitations(tenantSlug),
    apiClient.getTenantSquads(tenantSlug, { status: "active" }),
  ]);

  return { invitations, members, squads };
};

export const clientAction = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
  const tenantSlug = params.tenantSlug;
  if (!tenantSlug) {
    return { error: "Tenant slug is required." };
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "invite");

  try {
    if (intent === "invite") {
      const email = String(formData.get("email") ?? "").trim();
      const role = String(formData.get("role") ?? "").trim();

      if (!email || !role) {
        return { error: "Email and role are required." };
      }

      await apiClient.inviteTenantMember(tenantSlug, {
        email,
        role: role as TenantRole,
      });

      return { success: "Invitation sent." };
    }

    if (intent === "scope") {
      const userId = String(formData.get("userId") ?? "").trim();
      const accessScope = String(formData.get("accessScope") ?? "").trim();
      const squadIds = formData.getAll("squadIds").map((value) => String(value));

      if (!userId || !accessScope) {
        return { error: "User and access scope are required." };
      }

      await apiClient.updateTenantMemberAccess(tenantSlug, userId, {
        accessScope: accessScope as "all_squads" | "assigned_squads",
        squadIds,
      });

      return { success: "Access scope updated." };
    }

    return { error: "Unknown organization settings action." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update organization settings." };
  }
};

export default function OrganizationSettingsRoute() {
  const { invitations, members, squads } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string; success?: string } | null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <section className="space-y-4">
      <PageHeader
        description="Manage staff roles and squad visibility without breaking organization-level isolation."
        eyebrow="Organization settings"
        title="Staff access control"
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="surface-panel rounded-panel p-5">
          <p className="eyebrow">Invite staff</p>
          <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Add team member</h2>

          <Form className="mt-6 space-y-4" method="post">
            <input name="intent" type="hidden" value="invite" />

            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">Email</span>
              <input className="input-field" name="email" placeholder="coach@club.com" type="email" />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-obsidian-300">Role</span>
              <select className="input-field" defaultValue="coach" name="role">
                <option value="coach">Coach</option>
                <option value="org_admin">Organization admin</option>
                <option value="performance_staff">Performance staff</option>
                <option value="analyst">Analyst</option>
              </select>
            </label>

            {actionData?.error ? <Message tone="error">{actionData.error}</Message> : null}
            {actionData?.success ? <Message tone="success">{actionData.success}</Message> : null}

            <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
              Send invitation
            </button>
          </Form>
        </section>

        <section className="space-y-4">
          <DataTable headers={["Member", "Role", "Scope", "Assigned squads"]}>
            {members.map((member) => (
              <DataRow key={member.userId}>
                <DataCell>
                  <div className="font-medium text-obsidian-100">{member.name}</div>
                  <div className="mt-1 text-sm text-obsidian-500">{member.email}</div>
                </DataCell>
                <DataCell>
                  <StatusBadge label={member.role.replaceAll("_", " ")} status="active" />
                </DataCell>
                <DataCell>{member.accessScope.replaceAll("_", " ")}</DataCell>
                <DataCell>{member.assignedSquads.map((squad) => squad.name).join(", ") || "All squads"}</DataCell>
              </DataRow>
            ))}
          </DataTable>

          <section className="surface-panel rounded-panel p-5">
            <p className="eyebrow">Adjust squad scope</p>
            <div className="mt-4 grid gap-4">
              {members.map((member) => (
                <MemberScopeForm isSubmitting={isSubmitting} key={member.userId} member={member} squads={squads} />
              ))}
            </div>
          </section>

          <section className="surface-grid rounded-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Pending invitations</p>
                <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Awaiting acceptance</h2>
              </div>
              <StatusBadge label={String(invitations.filter((item) => item.status === "pending").length)} status="active" />
            </div>

            {invitations.some((invitation) => invitation.status === "pending") ? (
              <div className="mt-4 grid gap-3">
                {invitations
                  .filter((invitation) => invitation.status === "pending")
                  .map((invitation) => (
                    <InvitationCard invitation={invitation} key={invitation.id} />
                  ))}
              </div>
            ) : (
              <div className="mt-4">
                <EmptyState body="No pending invitations right now." title="Invitation queue is clear" />
              </div>
            )}
          </section>
        </section>
      </div>
    </section>
  );
}

function MemberScopeForm({
  member,
  squads,
  isSubmitting,
}: {
  member: TenantMember;
  squads: Awaited<ReturnType<typeof apiClient.getTenantSquads>>;
  isSubmitting: boolean;
}) {
  return (
    <Form className="rounded-soft border border-white/8 bg-white/3 p-4" method="post">
      <input name="intent" type="hidden" value="scope" />
      <input name="userId" type="hidden" value={member.userId} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-obsidian-100">{member.name}</p>
          <p className="mt-1 text-sm text-obsidian-500">{member.email}</p>
        </div>
        {member.role === "club_owner" ? (
          <StatusBadge label="all squads" status="active" />
        ) : (
          <div className="grid min-w-0 flex-1 gap-4 lg:max-w-xl">
            <select className="input-field" defaultValue={member.accessScope} name="accessScope">
              <option value="all_squads">All squads</option>
              <option value="assigned_squads">Assigned squads only</option>
            </select>

            <div className="grid gap-2 sm:grid-cols-2">
              {squads.map((squad) => (
                <label className="flex items-center gap-3 rounded-soft border border-white/8 bg-black/15 px-3 py-2" key={squad.id}>
                  <input
                    defaultChecked={member.assignedSquads.some((assigned) => assigned.id === squad.id)}
                    name="squadIds"
                    type="checkbox"
                    value={squad.id}
                  />
                  <span className="text-sm text-obsidian-300">{squad.name}</span>
                </label>
              ))}
            </div>

            <button className="btn-secondary justify-center" disabled={isSubmitting} type="submit">
              Save access
            </button>
          </div>
        )}
      </div>
    </Form>
  );
}

function InvitationCard({ invitation }: { invitation: TenantInvitation }) {
  return (
    <div className="rounded-soft border border-white/8 bg-white/3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-obsidian-100">{invitation.email}</p>
          <p className="mt-1 text-sm text-obsidian-500">
            {invitation.role.replaceAll("_", " ")} until {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge label="pending" status="active" />
      </div>
    </div>
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
