import { Hono } from "hono";

import { actorSessionSchema, createApiSuccessSchema } from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireAuth } from "../http/middleware";
import { ok } from "../http/responses";

export const sessionRoutes = new Hono<AppBindings>()
  .use("*", requireAuth)
  .get("/session", (c) => {
    const requestContext = c.get("requestContext");
    const actor = requestContext.actor!;

    const payload = {
      user: {
        id: actor.userId,
        email: actor.email,
        name: actor.name,
        image: actor.image ?? null
      },
      session: {
        id: actor.sessionId,
        expiresAt: actor.sessionExpiresAt
      },
      memberships: actor.memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantSlug: membership.tenantSlug,
        tenantName: membership.tenantName,
        role: membership.role,
        status: membership.status,
        accessScope: membership.accessScope,
        assignedSquads: membership.assignedSquads
      }))
    };

    createApiSuccessSchema(actorSessionSchema).parse({ data: payload });

    return ok(c, payload);
  });
