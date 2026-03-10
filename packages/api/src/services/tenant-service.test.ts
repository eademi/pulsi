import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../http/errors";
import { TenantService } from "./tenant-service";

const createTenantService = () => {
  const calls = {
    createInvitation: [] as Array<Record<string, unknown>>,
    expiredInvitations: [] as string[],
    markAccepted: [] as Array<{ acceptedByUserId: string; invitationId: string }>,
    memberships: [] as Array<Record<string, unknown>>
  };

  let pendingInvitation: null | {
    email: string;
    expiresAt: Date;
    id: string;
  } = null;

  let invitationById: null | {
    email: string;
    expiresAt: Date;
    id: string;
    invitedByUserId: string;
    role: "club_owner" | "coach" | "performance_staff" | "analyst";
    status: "pending" | "accepted" | "revoked" | "expired";
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  } = null;

  let existingMember: null | {
    email: string;
    status: "active" | "invited" | "disabled";
    userId: string;
  } = null;

  let userMemberships: Array<{ status: "active" | "invited" | "disabled" }> = [];
  let activeMembershipByUserId: null | {
    tenantId: string;
    tenantName: string;
  } = null;
  let activeMembershipByEmail: null | {
    email: string;
    tenantId: string;
    tenantName: string;
    userId: string;
  } = null;

  const db = {
    transaction: async <T>(callback: (_tx: unknown) => Promise<T>) => callback({})
  };

  const tenantRepository = {
    createWithOwner: async () => ({ id: "tenant-1", name: "Example FC", slug: "example-fc", timezone: "UTC" }),
    findBySlug: async () => null
  };

  const membershipRepository = {
    findAnyActiveMembership: async () => activeMembershipByUserId,
    findAnyActiveMembershipByEmail: async () => activeMembershipByEmail,
    findForTenantByEmail: async () => existingMember,
    listForTenant: async () => [],
    listForUser: async () => userMemberships,
    upsertMembership: async (input: Record<string, unknown>) => {
      calls.memberships.push(input);
      return input;
    }
  };

  const invitationRepository = {
    create: async (input: Record<string, unknown>) => {
      calls.createInvitation.push(input);
      return {
        acceptedAt: null,
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        email: input.email as string,
        expiresAt: input.expiresAt as Date,
        id: "new-invite",
        role: input.role as "club_owner" | "coach" | "performance_staff" | "analyst",
        status: "pending" as const,
        tenantId: input.tenantId as string
      };
    },
    findById: async () => invitationById,
    findPendingByTenantAndEmail: async () => pendingInvitation,
    listForTenant: async () => [],
    listPendingForEmail: async () => [],
    markAccepted: async (invitationId: string, acceptedByUserId: string) => {
      calls.markAccepted.push({ acceptedByUserId, invitationId });
      return null;
    },
    markExpired: async (invitationId: string) => {
      calls.expiredInvitations.push(invitationId);
      return null;
    }
  };

  return {
    calls,
    service: new TenantService(
      db as never,
      tenantRepository as never,
      membershipRepository as never,
      invitationRepository as never
    ),
    setExistingMember(value: typeof existingMember) {
      existingMember = value;
    },
    setActiveMembershipByEmail(value: typeof activeMembershipByEmail) {
      activeMembershipByEmail = value;
    },
    setActiveMembershipByUserId(value: typeof activeMembershipByUserId) {
      activeMembershipByUserId = value;
    },
    setInvitationById(value: typeof invitationById) {
      invitationById = value;
    },
    setPendingInvitation(value: typeof pendingInvitation) {
      pendingInvitation = value;
    },
    setUserMemberships(value: typeof userMemberships) {
      userMemberships = value;
    }
  };
};

test("inviteTenantMember rejects inviting an already active tenant member", async () => {
  const harness = createTenantService();
  harness.setExistingMember({
    email: "coach@club.com",
    status: "active",
    userId: "user-1"
  });

  await assert.rejects(
    () =>
      harness.service.inviteTenantMember(
        "tenant-1",
        { email: "coach@club.com", role: "coach" },
        "owner-1",
        new Date("2026-03-10T08:00:00.000Z")
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});

test("createTenant rejects creating a second organization for the same active user", async () => {
  const harness = createTenantService();
  harness.setActiveMembershipByUserId({
    tenantId: "tenant-1",
    tenantName: "Existing FC"
  });

  await assert.rejects(
    () =>
      harness.service.createTenant(
        { name: "Second FC", slug: "second-fc", timezone: "Europe/Berlin" },
        "user-1"
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});

test("inviteTenantMember expires stale pending invites before creating a new one", async () => {
  const harness = createTenantService();
  harness.setPendingInvitation({
    email: "coach@club.com",
    expiresAt: new Date("2026-03-01T08:00:00.000Z"),
    id: "invite-old"
  });

  await harness.service.inviteTenantMember(
    "tenant-1",
    { email: "coach@club.com", role: "coach" },
    "owner-1",
    new Date("2026-03-10T08:00:00.000Z")
  );

  assert.deepEqual(harness.calls.expiredInvitations, ["invite-old"]);
  assert.equal(harness.calls.createInvitation.length, 1);
});

test("inviteTenantMember rejects inviting a user who already belongs to another organization", async () => {
  const harness = createTenantService();
  harness.setActiveMembershipByEmail({
    email: "coach@club.com",
    tenantId: "tenant-2",
    tenantName: "Other FC",
    userId: "user-2"
  });

  await assert.rejects(
    () =>
      harness.service.inviteTenantMember(
        "tenant-1",
        { email: "coach@club.com", role: "coach" },
        "owner-1",
        new Date("2026-03-10T08:00:00.000Z")
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});

test("acceptInvitation creates the first tenant membership as default and marks the invite accepted", async () => {
  const harness = createTenantService();
  harness.setInvitationById({
    email: "coach@club.com",
    expiresAt: new Date("2026-03-20T08:00:00.000Z"),
    id: "invite-1",
    invitedByUserId: "owner-1",
    role: "coach",
    status: "pending",
    tenantId: "tenant-1",
    tenantName: "Example FC",
    tenantSlug: "example-fc"
  });
  harness.setUserMemberships([]);

  await harness.service.acceptInvitation(
    "invite-1",
    { email: "coach@club.com", userId: "user-1" },
    new Date("2026-03-10T08:00:00.000Z")
  );

  assert.equal(harness.calls.memberships.length, 1);
  assert.equal(harness.calls.memberships[0]?.isDefaultTenant, true);
  assert.deepEqual(harness.calls.markAccepted, [
    {
      acceptedByUserId: "user-1",
      invitationId: "invite-1"
    }
  ]);
});

test("acceptInvitation rejects an invite for a different email", async () => {
  const harness = createTenantService();
  harness.setInvitationById({
    email: "coach@club.com",
    expiresAt: new Date("2026-03-20T08:00:00.000Z"),
    id: "invite-1",
    invitedByUserId: "owner-1",
    role: "coach",
    status: "pending",
    tenantId: "tenant-1",
    tenantName: "Example FC",
    tenantSlug: "example-fc"
  });

  await assert.rejects(
    () =>
      harness.service.acceptInvitation(
        "invite-1",
        { email: "someone-else@club.com", userId: "user-1" },
        new Date("2026-03-10T08:00:00.000Z")
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "FORBIDDEN");
      return true;
    }
  );
});

test("acceptInvitation rejects joining a second organization", async () => {
  const harness = createTenantService();
  harness.setInvitationById({
    email: "coach@club.com",
    expiresAt: new Date("2026-03-20T08:00:00.000Z"),
    id: "invite-1",
    invitedByUserId: "owner-1",
    role: "coach",
    status: "pending",
    tenantId: "tenant-1",
    tenantName: "Example FC",
    tenantSlug: "example-fc"
  });
  harness.setActiveMembershipByUserId({
    tenantId: "tenant-2",
    tenantName: "Other FC"
  });

  await assert.rejects(
    () =>
      harness.service.acceptInvitation(
        "invite-1",
        { email: "coach@club.com", userId: "user-1" },
        new Date("2026-03-10T08:00:00.000Z")
      ),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "CONFLICT");
      return true;
    }
  );
});
