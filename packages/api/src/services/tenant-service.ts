import type { CreateTenantInput, InviteTenantMemberInput } from "@pulsi/shared";

import type { Database } from "../db/client";
import { AppError } from "../http/errors";
import type { InvitationRepository } from "../repositories/invitation-repository";
import type { MembershipRepository } from "../repositories/membership-repository";
import type { TenantRepository } from "../repositories/tenant-repository";

export class TenantService {
  public constructor(
    private readonly db: Database,
    private readonly tenantRepository: TenantRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly invitationRepository: InvitationRepository
  ) {}

  public async listMemberships(userId: string) {
    return this.membershipRepository.listForUser(userId);
  }

  public async createTenant(input: CreateTenantInput, ownerUserId: string) {
    const existingMembership = await this.membershipRepository.findAnyActiveMembership(ownerUserId);

    if (existingMembership) {
      throw new AppError(
        409,
        "CONFLICT",
        "Users can only belong to one organization. Leave the current organization before creating another."
      );
    }

    const existing = await this.tenantRepository.findBySlug(input.slug);

    if (existing) {
      throw new AppError(409, "CONFLICT", "Tenant slug already exists");
    }

    return this.tenantRepository.createWithOwner({
      ...input,
      ownerUserId
    });
  }

  public async listTenantMembers(tenantId: string) {
    return this.membershipRepository.listForTenant(tenantId);
  }

  public async listTenantInvitations(tenantId: string) {
    return this.invitationRepository.listForTenant(tenantId);
  }

  public async listPendingInvitations(email: string, now: Date) {
    const normalizedEmail = normalizeEmail(email);
    const invitations = await this.invitationRepository.listPendingForEmail(normalizedEmail, now);

    return Promise.all(
      invitations.map(async (invitation) => {
        if (new Date(invitation.expiresAt) <= now) {
          await this.invitationRepository.markExpired(invitation.id);
          return null;
        }

        return invitation;
      })
    ).then((items) => items.filter((item): item is NonNullable<typeof item> => item !== null));
  }

  public async inviteTenantMember(
    tenantId: string,
    input: InviteTenantMemberInput,
    invitedByUserId: string,
    now: Date
  ) {
    const normalizedEmail = normalizeEmail(input.email);

    const existingMember = await this.membershipRepository.findForTenantByEmail(tenantId, normalizedEmail);
    if (existingMember?.status === "active") {
      throw new AppError(409, "CONFLICT", "User already has access to this tenant");
    }

    const activeMembershipElsewhere = await this.membershipRepository.findAnyActiveMembershipByEmail(
      normalizedEmail
    );

    if (activeMembershipElsewhere && activeMembershipElsewhere.tenantId !== tenantId) {
      throw new AppError(
        409,
        "CONFLICT",
        `This user already belongs to ${activeMembershipElsewhere.tenantName}. Pulsi users can only belong to one organization at a time.`
      );
    }

    const existingInvitation = await this.invitationRepository.findPendingByTenantAndEmail(
      tenantId,
      normalizedEmail
    );

    if (existingInvitation) {
      if (new Date(existingInvitation.expiresAt) <= now) {
        await this.invitationRepository.markExpired(existingInvitation.id);
      } else {
        throw new AppError(409, "CONFLICT", "A pending invitation already exists for this email");
      }
    }

    const invitation = await this.invitationRepository.create({
      tenantId,
      email: normalizedEmail,
      role: input.role,
      invitedByUserId,
      expiresAt: addDays(now, 7)
    });

    if (!invitation) {
      throw new AppError(500, "INTERNAL_ERROR", "Failed to create tenant invitation");
    }

    return invitation;
  }

  public async acceptInvitation(
    invitationId: string,
    actor: { userId: string; email: string },
    now: Date
  ) {
    const invitation = await this.invitationRepository.findById(invitationId);

    if (!invitation) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Invitation not found");
    }

    if (normalizeEmail(invitation.email) !== normalizeEmail(actor.email)) {
      throw new AppError(403, "FORBIDDEN", "You cannot accept an invitation for another user");
    }

    if (invitation.status !== "pending") {
      throw new AppError(409, "CONFLICT", "This invitation is no longer pending");
    }

    if (new Date(invitation.expiresAt) <= now) {
      await this.invitationRepository.markExpired(invitation.id);
      throw new AppError(409, "CONFLICT", "This invitation has expired");
    }

    const activeMembership = await this.membershipRepository.findAnyActiveMembership(actor.userId);

    if (activeMembership && activeMembership.tenantId !== invitation.tenantId) {
      throw new AppError(
        409,
        "CONFLICT",
        `You already belong to ${activeMembership.tenantName}. Pulsi currently supports one organization per user.`
      );
    }

    await this.db.transaction(async (tx) => {
      await this.membershipRepository.upsertMembership(
        {
          tenantId: invitation.tenantId,
          userId: actor.userId,
          role: invitation.role,
          invitedByUserId: invitation.invitedByUserId,
          isDefaultTenant: true
        },
        tx
      );
      await this.invitationRepository.markAccepted(invitation.id, actor.userId, tx);
    });

    return invitation;
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};
