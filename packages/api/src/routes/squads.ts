import { Hono } from "hono";

import {
  createApiSuccessSchema,
  createSquadInputSchema,
  listSquadsQuerySchema,
  squadSchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireCapability } from "../auth/authorization";
import { created, ok, parseOrThrow } from "../http/responses";
import type { SquadService } from "../services/squad-service";

export const buildSquadRoutes = (squadService: SquadService) =>
  new Hono<AppBindings>()
    .get("/squads", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "squads:view");

      const query = parseOrThrow(listSquadsQuerySchema.safeParse(c.req.query()));
      const squads = await squadService.listTenantSquads(requestContext.tenant!, query);
      const payload = squads.map((squad) => ({
        ...squad,
        athleteCount: Number(squad.athleteCount),
        createdAt: new Date(squad.createdAt).toISOString()
      }));

      createApiSuccessSchema(squadSchema.array()).parse({ data: payload });

      return ok(c, payload);
    })
    .post("/squads", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "squads:manage");

      const body = parseOrThrow(createSquadInputSchema.safeParse(await c.req.json()));
      const squad = await squadService.createTenantSquad(requestContext.tenant!.id, body);
      const payload = {
        ...squad,
        athleteCount: 0,
        createdAt: new Date(squad.createdAt).toISOString()
      };

      createApiSuccessSchema(squadSchema).parse({ data: payload });

      return created(c, payload);
    });
