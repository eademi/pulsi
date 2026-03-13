import { Hono } from "hono";

import {
  adminViewerSchema,
  createApiSuccessSchema,
  garminAdminBackfillRerunSchema,
  garminAdminOverviewSchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { ok } from "../http/responses";
import type { AdminGarminService } from "../services/admin-garmin-service";

export const buildAdminRoutes = (adminGarminService: AdminGarminService) =>
  new Hono<AppBindings>()
    .get("/bootstrap", async (c) => {
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
    .get("/garmin", async (c) => {
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
    .post("/garmin/connections/:connectionId/backfill", async (c) => {
      const identity = c.get("adminContext").identity!;

      const result = await adminGarminService.rerunBackfill({
        connectionId: c.req.param("connectionId"),
        createdByUserId: identity.userId
      });

      createApiSuccessSchema(garminAdminBackfillRerunSchema).parse({ data: result });
      return ok(c, result);
    });
