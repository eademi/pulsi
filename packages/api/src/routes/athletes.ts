import { Hono } from "hono";

import { athleteSchema, createApiSuccessSchema, listReadinessQuerySchema } from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireMinimumRole } from "../auth/authorization";
import { ok, parseOrThrow } from "../http/responses";
import type { AthleteRepository } from "../repositories/athlete-repository";

export const buildAthleteRoutes = (athleteRepository: AthleteRepository) =>
  new Hono<AppBindings>().get("/athletes", async (c) => {
    const requestContext = c.get("requestContext");
    requireMinimumRole(requestContext.tenant!.role, "analyst");

    const query = parseOrThrow(listReadinessQuerySchema.safeParse(c.req.query()));
    const athletes = await athleteRepository.listByTenant(requestContext.tenant!.id, {
      accessScope: requestContext.tenant!.accessScope,
      accessibleSquadIds: requestContext.tenant!.accessibleSquadIds,
      squadId: query.squadId,
      squadSlug: query.squadSlug ?? query.squad
    });
    const payload = athletes.map((athlete) => ({
      ...athlete,
      createdAt: new Date(athlete.createdAt).toISOString()
    }));

    createApiSuccessSchema(athleteSchema.array()).parse({ data: payload });

    return ok(c, payload);
  });
