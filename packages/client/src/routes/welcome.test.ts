import assert from "node:assert/strict";
import test from "node:test";

import type { ActorSession } from "@pulsi/shared";

import { apiClient } from "../lib/api";
import { getDashboardPath } from "../lib/session";
import { clientAction } from "./welcome";

const createStaffSession = (
  overrides?: Partial<Extract<ActorSession, { actorType: "staff" }>>
): Extract<ActorSession, { actorType: "staff" }> => ({
  actorType: "staff",
  athleteProfile: null,
  memberships: [
    {
      accessScope: "all_squads",
      assignedSquads: [],
      role: "club_owner",
      status: "active",
      tenantId: "tenant-1",
      tenantName: "Example FC",
      tenantSlug: "example-fc",
    },
  ],
  session: {
    expiresAt: "2026-03-13T08:00:00.000Z",
    id: "session-1",
  },
  user: {
    email: "owner@example.com",
    id: "user-1",
    name: "Owner User",
  },
  ...overrides,
});

test("welcome create-tenant action preserves redirect responses", async () => {
  const originalCreateTenant = apiClient.createTenant;
  const originalGetSession = apiClient.getSession;

  let createTenantInput: Parameters<typeof apiClient.createTenant>[0] | null = null;

  apiClient.createTenant = async (input) => {
    createTenantInput = input;

    return {
      createdAt: "2026-03-13T08:00:00.000Z",
      id: "tenant-1",
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
    };
  };

  apiClient.getSession = async () => createStaffSession();

  try {
    const formData = new FormData();
    formData.set("intent", "create-tenant");
    formData.set("name", "Example FC");
    formData.set("slug", "Example-FC");
    formData.set("timezone", "Europe/Berlin");

    await assert.rejects(
      () => clientAction({ request: new Request("http://localhost/welcome", { method: "POST", body: formData }) }),
      (error) => {
        assert.ok(error instanceof Response);
        assert.equal(error.status, 302);
        assert.equal(error.headers.get("Location"), getDashboardPath("example-fc"));
        return true;
      }
    );

    assert.deepEqual(createTenantInput, {
      name: "Example FC",
      slug: "example-fc",
      timezone: "Europe/Berlin",
    });
  } finally {
    apiClient.createTenant = originalCreateTenant;
    apiClient.getSession = originalGetSession;
  }
});
