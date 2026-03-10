import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";

import type { TenantInvitation, TenantMember } from "@pulsi/shared";

import { apiClient } from "../lib/api";
import { getDashboardPath } from "../lib/session";

export const clientLoader = async ({
  params
}: {
  params: Record<string, string | undefined>;
}) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load organization settings.");
  }

  const session = await apiClient.getSession();
  const activeMembership = session.memberships.find(
    (membership) => membership.status === "active" && membership.tenantSlug === tenantSlug
  );

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  if (activeMembership.role !== "club_owner") {
    throw redirect(getDashboardPath(tenantSlug));
  }

  const [members, invitations] = await Promise.all([
    apiClient.getTenantMembers(tenantSlug),
    apiClient.getTenantInvitations(tenantSlug)
  ]);

  return {
    invitations,
    members,
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
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!email || !role) {
    return { error: "Email and role are required." };
  }

  try {
    await apiClient.inviteTenantMember(tenantSlug, {
      email,
      role: role as "club_owner" | "coach" | "performance_staff" | "analyst"
    });

    return { success: "Invitation sent." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to invite that user."
    };
  }
};

export default function OrganizationSettingsRoute() {
  const { invitations, members } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string; success?: string } | null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <section className="settings-stack">
      <header className="settings-hero surface">
        <div>
          <p className="eyebrow">Organization settings</p>
          <h1>Team access</h1>
          <p className="muted settings-copy">
            Manage which staff can access Pulsi for this organization. Squad-scoped permissions can
            sit on top of this later, but tenant membership starts here.
          </p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Invite staff</p>
              <h2>Add a new team member</h2>
            </div>
          </div>

          <Form className="invite-form" method="post">
            <label className="auth-field">
              <span>Email</span>
              <input className="auth-input" name="email" placeholder="coach@club.com" type="email" />
            </label>

            <label className="auth-field">
              <span>Role</span>
              <select className="auth-input invite-select" defaultValue="coach" name="role">
                <option value="coach">Coach</option>
                <option value="performance_staff">Performance staff</option>
                <option value="analyst">Analyst</option>
              </select>
            </label>

            {actionData?.error ? <p className="form-error">{actionData.error}</p> : null}
            {actionData?.success ? <p className="form-success">{actionData.success}</p> : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              Send invitation
            </button>
          </Form>
        </section>

        <section className="surface settings-panel">
          <div className="settings-panel-header">
            <div>
              <p className="eyebrow">Current members</p>
              <h2>{members.length} people with access</h2>
            </div>
          </div>

          <div className="settings-list">
            {members.map((member) => (
              <MemberCard key={member.userId} member={member} />
            ))}
          </div>
        </section>
      </div>

      <section className="surface settings-panel">
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">Pending invitations</p>
            <h2>{invitations.filter((invitation) => invitation.status === "pending").length} waiting</h2>
          </div>
        </div>

        {invitations.some((invitation) => invitation.status === "pending") ? (
          <div className="settings-list">
            {invitations
              .filter((invitation) => invitation.status === "pending")
              .map((invitation) => (
                <InvitationCard invitation={invitation} key={invitation.id} />
              ))}
          </div>
        ) : (
          <div className="surface empty-state">No pending invitations right now.</div>
        )}
      </section>
    </section>
  );
}

const MemberCard = ({ member }: { member: TenantMember }) => (
  <article className="settings-card">
    <div className="settings-card-copy">
      <strong>{member.name}</strong>
      <p className="muted">{member.email}</p>
    </div>
    <span className="pill pill-subtle">{member.role.replaceAll("_", " ")}</span>
  </article>
);

const InvitationCard = ({ invitation }: { invitation: TenantInvitation }) => (
  <article className="settings-card">
    <div className="settings-card-copy">
      <strong>{invitation.email}</strong>
      <p className="muted">
        {invitation.role.replaceAll("_", " ")} until{" "}
        {new Date(invitation.expiresAt).toLocaleDateString()}
      </p>
    </div>
    <span className="pill pill-subtle">Pending</span>
  </article>
);
