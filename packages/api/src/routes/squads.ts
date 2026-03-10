import { Hono } from "hono";

import { createApiSuccessSchema, listSquadsQuerySchema, squadSchema } from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireMinimumRole } from "../auth/authorization";
import { ok, parseOrThrow } from "../http/responses";
import type { SquadService } from "../services/squad-service";

export const buildSquadRoutes = (squadService: SquadService) =>
  new Hono<AppBindings>().get("/squads", async (c) => {
    const requestContext = c.get("requestContext");
    requireMinimumRole(requestContext.tenant!.role, "analyst");

    const query = parseOrThrow(listSquadsQuerySchema.safeParse(c.req.query()));
    const squads = await squadService.listTenantSquads(requestContext.tenant!, query);
    const payload = squads.map((squad) => ({
      ...squad,
      athleteCount: Number(squad.athleteCount),
      createdAt: new Date(squad.createdAt).toISOString()
    }));

    createApiSuccessSchema(squadSchema.array()).parse({ data: payload });

    return ok(c, payload, {
      pagination: {
        count: payload.length,
        limit: payload.length
      }
    });
  });
