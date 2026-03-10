import { randomUUID } from "node:crypto";

import type { Context, Next } from "hono";

import { getAuthSession } from "../auth/auth";
import type { AppBindings, AuthenticatedActor } from "../context/app-context";
import { logger } from "../telemetry/logger";
import type { MembershipRepository } from "../repositories/membership-repository";
import type { TenantAccessService } from "../services/tenant-access-service";
import { AppError } from "./errors";

export const requestContextMiddleware =
  (membershipRepository: MembershipRepository) =>
  async (c: Context<AppBindings>, next: Next) => {
    const requestId = c.req.header("x-request-id") ?? randomUUID();
    const requestLogger = logger.child({
      requestId,
      method: c.req.method,
      path: c.req.path
    });

    let actor: AuthenticatedActor | null = null;
    const session = await getAuthSession(c.req.raw.headers);

    if (session) {
      const memberships = await membershipRepository.listForUser(session.user.id);
      actor = {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        sessionId: session.session.id,
        sessionExpiresAt: session.session.expiresAt,
        memberships
      };
      requestLogger.setBindings({
        userId: actor.userId
      });
    }

    c.set("requestContext", {
      requestId,
      logger: requestLogger,
      now: new Date(),
      actor,
      tenant: null
    });

    c.header("x-request-id", requestId);

    await next();
  };

export const requireAuth = async (c: Context<AppBindings>, next: Next) => {
  const requestContext = c.get("requestContext");

  if (!requestContext.actor) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
  }

  await next();
};

export const tenantScopeMiddleware =
  (tenantAccessService: TenantAccessService) =>
  async (c: Context<AppBindings>, next: Next) => {
    const requestContext = c.get("requestContext");
    const tenantSlug = c.req.param("tenantSlug");

    if (!requestContext.actor) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
    }

    if (!tenantSlug) {
      throw new AppError(400, "VALIDATION_ERROR", "Tenant slug is required");
    }

    const membership = await tenantAccessService.resolveMembership(
      requestContext.actor.userId,
      tenantSlug
    );

    c.set("requestContext", {
      ...requestContext,
      logger: requestContext.logger.child({
        tenantId: membership.tenantId,
        tenantSlug: membership.tenantSlug
      }),
      tenant: {
        id: membership.tenantId,
        slug: membership.tenantSlug,
        name: membership.tenantName,
        timezone: membership.timezone,
        role: membership.role,
        accessScope: membership.accessScope,
        accessibleSquadIds: membership.assignedSquads.map((squad) => squad.id),
        assignedSquads: membership.assignedSquads
      }
    });

    await next();
  };
