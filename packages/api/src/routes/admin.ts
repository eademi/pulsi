import { Hono } from "hono";

import {
  adminViewerSchema,
  createApiSuccessSchema,
  garminAdminBackfillRerunSchema,
  garminAdminOverviewSchema
} from "@pulsi/shared";

import { requirePlatformAdminAccess } from "../auth/platform-admin";
import type { AppBindings } from "../context/app-context";
import { requireAuth } from "../http/middleware";
import { ok } from "../http/responses";
import type { PlatformAdminRepository } from "../repositories/platform-admin-repository";
import type { AdminGarminService } from "../services/admin-garmin-service";

export const buildAdminRoutes = (
  adminGarminService: AdminGarminService,
  platformAdminRepository: PlatformAdminRepository
) =>
  new Hono<AppBindings>()
    .use("/admin/*", requireAuth, requirePlatformAdminAccess(platformAdminRepository))
    .get("/admin/bootstrap", async (c) => {
      const identity = c.get("requestContext").identity!;

      const viewer = {
        id: identity.userId,
        email: identity.email,
        name: identity.name,
        image: identity.image ?? null
      };

      createApiSuccessSchema(adminViewerSchema).parse({ data: viewer });
      return ok(c, viewer);
    })
    .get("/admin/garmin", async (c) => {
      const identity = c.get("requestContext").identity!;

      const overview = await adminGarminService.getOverview();
      const payload = {
        ...overview,
        viewer: {
          id: identity.userId,
          email: identity.email,
          name: identity.name,
          image: identity.image ?? null
        }
      };
      createApiSuccessSchema(garminAdminOverviewSchema).parse({ data: payload });
      return ok(c, payload);
    })
    .post("/admin/garmin/connections/:connectionId/backfill", async (c) => {
      const identity = c.get("requestContext").identity!;

      const result = await adminGarminService.rerunBackfill({
        connectionId: c.req.param("connectionId"),
        createdByUserId: identity.userId
      });

      createApiSuccessSchema(garminAdminBackfillRerunSchema).parse({ data: result });
      return ok(c, result);
    });
