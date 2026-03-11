import { Form, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { hasTenantCapability } from "@pulsi/shared";

import { DataCell, DataRow, DataTable } from "../components/ui/data-table";
import { EmptyState } from "../components/ui/empty-state";
import { PageHeader } from "../components/ui/page-header";
import { StatusBadge } from "../components/ui/status-badge";
import { apiClient } from "../lib/api";
import { getDashboardPath, getDefaultAppPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const tenantSlug = params.tenantSlug;

  if (!tenantSlug) {
    throw new Error("Tenant slug is required to load squads.");
  }

  const session = await apiClient.getSession();
  if (session.actorType === "athlete") {
    throw redirect(getDefaultAppPath(session));
  }
  const activeMembership = session.memberships.find((membership) => membership.status === "active" && membership.tenantSlug === tenantSlug);

  if (!activeMembership) {
    throw redirect(getDashboardPath(session.memberships[0]?.tenantSlug ?? tenantSlug));
  }

  const squads = await apiClient.getTenantSquads(tenantSlug, { status: "all" });

  return {
    activeMembership,
    squads,
    tenantSlug,
  };
};

export const clientAction = async ({ params, request }: { params: Record<string, string | undefined>; request: Request }) => {
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
      slug: slug || undefined,
    });

    return { success: "Squad created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create squad." };
  }
};

export default function SquadsRoute() {
  const { activeMembership, squads } = useLoaderData<typeof clientLoader>();
  const actionData = useActionData() as { error?: string; success?: string } | null;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const canManage = hasTenantCapability(activeMembership.role, "squads:manage");

  return (
    <section className="space-y-4">
      <PageHeader
        description="Use squads as the operational unit for readiness review, roster segmentation, and staff access scope."
        eyebrow="Squad Readiness"
        title="Squad structure and availability"
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          {squads.length > 0 ? (
            <DataTable headers={["Squad", "Category", "Athletes", "Status"]}>
              {squads.map((squad) => (
                <DataRow key={squad.id}>
                  <DataCell>
                    <div className="font-medium text-obsidian-100">{squad.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-obsidian-500">{squad.slug}</div>
                  </DataCell>
                  <DataCell>{squad.category ?? "General squad"}</DataCell>
                  <DataCell>{squad.athleteCount}</DataCell>
                  <DataCell>
                    <StatusBadge label={squad.status} status={squad.status === "active" ? "active" : "no_data"} />
                  </DataCell>
                </DataRow>
              ))}
            </DataTable>
          ) : (
            <EmptyState
              body="Create the first squad so players, visibility, and readiness boards can be organized correctly."
              title="No squads configured yet"
            />
          )}
        </section>

        <section className="surface-panel rounded-[var(--radius-panel)] p-5">
          <p className="eyebrow">Create squad</p>
          <h2 className="mt-2 text-xl font-semibold text-obsidian-100">Add a new squad</h2>
          <p className="mt-3 text-sm text-obsidian-400">Keep squad naming consistent with the real football structure: Senior, U18, U16, etc.</p>

          {canManage ? (
            <Form className="mt-6 space-y-4" method="post">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-obsidian-300">Name</span>
                <input className="input-field" name="name" placeholder="Under 18" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-obsidian-300">Slug</span>
                <input className="input-field" name="slug" placeholder="u18" />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-obsidian-300">Category</span>
                <input className="input-field" name="category" placeholder="Academy" />
              </label>

              {actionData?.error ? (
                <p className="rounded-[var(--radius-soft)] border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500">
                  {actionData.error}
                </p>
              ) : null}
              {actionData?.success ? (
                <p className="rounded-[var(--radius-soft)] border border-ready-500/25 bg-ready-500/10 px-4 py-3 text-sm text-ready-500">
                  {actionData.success}
                </p>
              ) : null}

              <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
                Create squad
              </button>
            </Form>
          ) : (
            <div className="mt-6">
              <EmptyState body="Your role can review squad structure but not change it." title="View only" />
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
