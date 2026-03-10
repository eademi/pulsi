import { Hono } from "hono";

import {
  athleteActivitySummarySchema,
  createApiSuccessSchema,
  listAthleteActivitiesQuerySchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireCapability } from "../auth/authorization";
import { ok, parseOrThrow } from "../http/responses";
import type { ActivityService } from "../services/activity-service";

export const buildActivityRoutes = (activityService: ActivityService) =>
  new Hono<AppBindings>().get("/athletes/:athleteId/activities", async (c) => {
    const requestContext = c.get("requestContext");
    requireCapability(requestContext.tenant!.role, "activities:view");

    const query = parseOrThrow(listAthleteActivitiesQuerySchema.safeParse(c.req.query()));
    const payload = await activityService.listAthleteActivities(
      requestContext.tenant!,
      c.req.param("athleteId"),
      query
    );

    createApiSuccessSchema(athleteActivitySummarySchema).parse({ data: payload });

    return ok(c, payload, {
      pagination: {
        count: payload.activities.length,
        limit: query.limit
      }
    });
  });
