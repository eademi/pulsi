import { Hono } from "hono";

import {
  athleteReadinessSchema,
  createApiSuccessSchema,
  listReadinessQuerySchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireCapability } from "../auth/authorization";
import { ok, parseOrThrow } from "../http/responses";
import type { ReadinessService } from "../services/readiness-service";

export const buildReadinessRoutes = (readinessService: ReadinessService) =>
  new Hono<AppBindings>().get("/readiness", async (c) => {
    const requestContext = c.get("requestContext");
    requireCapability(requestContext.tenant!.role, "readiness:view");

    const query = parseOrThrow(listReadinessQuerySchema.safeParse(c.req.query()));
    const readiness = await readinessService.listTenantReadiness(requestContext.tenant!, query);

    createApiSuccessSchema(athleteReadinessSchema.array()).parse({ data: readiness });

    return ok(c, readiness, {
      pagination: {
        count: readiness.length,
        limit: query.limit
      }
    });
  });
