import { randomUUID } from "node:crypto";

import type { Context, Next } from "hono";

import { resolveAuthenticatedActor } from "../auth/actor-resolution";
import { getAuthSession } from "../auth/auth";
import type { AppBindings, AuthenticatedActor } from "../context/app-context";
import { logger } from "../telemetry/logger";
import type { AthleteAccountRepository } from "../repositories/athlete-account-repository";
import type { MembershipRepository } from "../repositories/membership-repository";
import type { TenantAccessService } from "../services/tenant-access-service";
import { AppError } from "./errors";

export const requestContextMiddleware =
  (
    membershipRepository: MembershipRepository,
    athleteAccountRepository: AthleteAccountRepository
  ) =>
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
      const [memberships, athleteProfile] = await Promise.all([
        membershipRepository.listForUser(session.user.id),
        athleteAccountRepository.findActiveProfileByUserId(session.user.id)
      ]);

      actor = resolveAuthenticatedActor({
        session,
        memberships,
        athleteProfile
      });
      requestLogger.setBindings({
        userId: actor.userId,
        actorType: actor.actorType
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

    if (requestContext.actor.actorType !== "staff") {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Athlete accounts cannot access organization staff routes"
      );
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
