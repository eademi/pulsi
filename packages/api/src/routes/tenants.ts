import { Hono } from "hono";
import { z } from "zod";

import {
  createApiSuccessSchema,
  createTenantInputSchema,
  inviteTenantMemberInputSchema,
  tenantInvitationSchema,
  tenantMemberSchema,
  tenantSchema,
  updateTenantMemberAccessInputSchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { AppError } from "../http/errors";
import { requireAuth } from "../http/middleware";
import { created, ok, parseOrThrow } from "../http/responses";
import { requireCapability } from "../auth/authorization";
import type { TenantService } from "../services/tenant-service";

export const buildTenantRoutes = (tenantService: TenantService) =>
  new Hono<AppBindings>()
    .use("*", requireAuth)
    .get("/tenants", async (c) => {
      const requestContext = c.get("requestContext");
      const memberships = await tenantService.listMemberships(requestContext.actor!.userId);
      const tenants = memberships.map((membership) => ({
        id: membership.tenantId,
        slug: membership.tenantSlug,
        name: membership.tenantName,
        timezone: membership.timezone,
        createdAt: toIsoString(membership.createdAt)
      }));

      createApiSuccessSchema(tenantSchema.array()).parse({ data: tenants });

      return ok(c, tenants);
    })
    .post("/tenants", async (c) => {
      const requestContext = c.get("requestContext");
      const body = parseOrThrow(createTenantInputSchema.safeParse(await c.req.json()));
      const tenant = await tenantService.createTenant(body, requestContext.actor!.userId);
      const payload = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        timezone: tenant.timezone,
        createdAt: toIsoString(tenant.createdAt)
      };

      createApiSuccessSchema(tenantSchema).parse({ data: payload });

      return created(c, payload);
    })
    .get("/invitations", async (c) => {
      const requestContext = c.get("requestContext");
      const invitations = await tenantService.listPendingInvitations(
        requestContext.actor!.email,
        requestContext.now
      );
      const payload = invitations.map(toTenantInvitationDto);

      createApiSuccessSchema(tenantInvitationSchema.array()).parse({ data: payload });

      return ok(c, payload);
    })
    .post("/invitations/:invitationId/accept", async (c) => {
      const requestContext = c.get("requestContext");
      await tenantService.acceptInvitation(
        c.req.param("invitationId"),
        {
          userId: requestContext.actor!.userId,
          email: requestContext.actor!.email
        },
        requestContext.now
      );

      createApiSuccessSchema(
        z.object({
          accepted: z.boolean()
        })
      ).parse({
        data: { accepted: true }
      });

      return ok(c, { accepted: true });
    });

export const buildTenantAccessRoutes = (tenantService: TenantService) =>
  new Hono<AppBindings>()
    .use("*", requireAuth)
    .get("/memberships", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "staff:manage");
      const members = await tenantService.listTenantMembers(requestContext.tenant!.id);
      const payload = members.map((member) => ({
        ...member,
        joinedAt: toIsoString(member.joinedAt)
      }));

      createApiSuccessSchema(tenantMemberSchema.array()).parse({ data: payload });

      return ok(c, payload);
    })
    .get("/invitations", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "staff:manage");
      const invitations = await tenantService.listTenantInvitations(requestContext.tenant!.id);
      const payload = invitations.map(toTenantInvitationDto);

      createApiSuccessSchema(tenantInvitationSchema.array()).parse({ data: payload });

      return ok(c, payload);
    })
    .post("/invitations", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "staff:manage");
      const body = parseOrThrow(inviteTenantMemberInputSchema.safeParse(await c.req.json()));
      if (body.role === "club_owner") {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Club owner invitations are not supported through this route"
        );
      }
      const invitation = await tenantService.inviteTenantMember(
        requestContext.tenant!.id,
        body,
        requestContext.actor!.userId,
        requestContext.now
      );
      const payload = toTenantInvitationDto({
        ...invitation,
        tenantSlug: requestContext.tenant!.slug,
        tenantName: requestContext.tenant!.name
      });

      createApiSuccessSchema(tenantInvitationSchema).parse({ data: payload });

      return created(c, payload);
    })
    .patch("/memberships/:userId/access", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "staff:manage");
      const body = parseOrThrow(updateTenantMemberAccessInputSchema.safeParse(await c.req.json()));
      const member = await tenantService.updateMemberAccess(
        requestContext.tenant!.id,
        c.req.param("userId"),
        body
      );
      const payload = {
        ...member,
        joinedAt: toIsoString(member.joinedAt)
      };

      createApiSuccessSchema(tenantMemberSchema).parse({ data: payload });

      return ok(c, payload);
    });

const toIsoString = (value: Date | string) => new Date(value).toISOString();

const toTenantInvitationDto = (invitation: {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  email: string;
  role: "club_owner" | "org_admin" | "coach" | "performance_staff" | "analyst";
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: Date | string;
  createdAt: Date | string;
  acceptedAt?: Date | string | null;
}) => ({
  ...invitation,
  expiresAt: toIsoString(invitation.expiresAt),
  createdAt: toIsoString(invitation.createdAt),
  acceptedAt: invitation.acceptedAt ? toIsoString(invitation.acceptedAt) : null
});
