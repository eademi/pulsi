import { Hono } from "hono";

import { createApiSuccessSchema, garminAdminBackfillRerunSchema, garminAdminOverviewSchema } from "@pulsi/shared";

import { requirePlatformAdmin } from "../auth/platform-admin";
import type { AppBindings } from "../context/app-context";
import { requireAuth } from "../http/middleware";
import { ok } from "../http/responses";
import type { AdminGarminService } from "../services/admin-garmin-service";

export const buildAdminRoutes = (adminGarminService: AdminGarminService) =>
  new Hono<AppBindings>()
    .use("/admin/*", requireAuth)
    .get("/admin/garmin", async (c) => {
      const actor = c.get("requestContext").actor!;
      requirePlatformAdmin(actor);

      const overview = await adminGarminService.getOverview();
      createApiSuccessSchema(garminAdminOverviewSchema).parse({ data: overview });
      return ok(c, overview);
    })
    .post("/admin/garmin/connections/:connectionId/backfill", async (c) => {
      const actor = c.get("requestContext").actor!;
      requirePlatformAdmin(actor);

      const result = await adminGarminService.rerunBackfill({
        connectionId: c.req.param("connectionId"),
        createdByUserId: actor.userId
      });

      createApiSuccessSchema(garminAdminBackfillRerunSchema).parse({ data: result });
      return ok(c, result);
    });
