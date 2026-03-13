import { Hono } from "hono";

import {
  adminViewerSchema,
  createApiSuccessSchema,
  garminAdminBackfillRerunSchema,
  garminAdminOverviewSchema
} from "@pulsi/shared";

import { requirePlatformAdminAccess } from "../auth/platform-admin";
import type { AppBindings } from "../context/app-context";
import { requireAdminAuth } from "../http/middleware";
import { ok } from "../http/responses";
import type { AdminProfileRepository } from "../repositories/admin-profile-repository";
import type { AdminGarminService } from "../services/admin-garmin-service";

export const buildAdminRoutes = (
  adminGarminService: AdminGarminService,
  adminProfileRepository: AdminProfileRepository
) =>
  new Hono<AppBindings>()
    .use("/admin/*", requireAdminAuth(adminProfileRepository), requirePlatformAdminAccess)
    .get("/admin/bootstrap", async (c) => {
      const identity = c.get("adminContext").identity!;

      const viewer = {
        id: identity.userId,
        email: identity.email,
        name: identity.name,
        image: identity.image ?? null,
        role: identity.role
      };

      createApiSuccessSchema(adminViewerSchema).parse({ data: viewer });
      return ok(c, viewer);
    })
    .get("/admin/garmin", async (c) => {
      const identity = c.get("adminContext").identity!;

      const overview = await adminGarminService.getOverview();
      const payload = {
        ...overview,
        viewer: {
          id: identity.userId,
          email: identity.email,
          name: identity.name,
          image: identity.image ?? null,
          role: identity.role
        }
      };
      createApiSuccessSchema(garminAdminOverviewSchema).parse({ data: payload });
      return ok(c, payload);
    })
    .post("/admin/garmin/connections/:connectionId/backfill", async (c) => {
      const identity = c.get("adminContext").identity!;

      const result = await adminGarminService.rerunBackfill({
        connectionId: c.req.param("connectionId"),
        createdByUserId: identity.userId
      });

      createApiSuccessSchema(garminAdminBackfillRerunSchema).parse({ data: result });
      return ok(c, result);
    });
