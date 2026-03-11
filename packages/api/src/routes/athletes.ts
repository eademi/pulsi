import { Hono } from "hono";

import {
  athleteSchema,
  createApiSuccessSchema,
  createAthleteInputSchema,
  deleteAthleteResponseSchema,
  listAthletesQuerySchema,
  restoreAthleteInputSchema,
  updateAthleteSquadInputSchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireCapability } from "../auth/authorization";
import { AppError } from "../http/errors";
import { created, ok, parseOrThrow } from "../http/responses";
import type { AthleteRepository } from "../repositories/athlete-repository";
import type { AthleteManagementService } from "../services/athlete-management-service";

export const buildAthleteRoutes = (
  athleteRepository: AthleteRepository,
  athleteManagementService: AthleteManagementService
) =>
  new Hono<AppBindings>()
    .get("/athletes", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:view");

      const query = parseOrThrow(listAthletesQuerySchema.safeParse(c.req.query()));
      const athletes = await athleteRepository.listByTenant(requestContext.tenant!.id, {
        accessScope: requestContext.tenant!.accessScope,
        accessibleSquadIds: requestContext.tenant!.accessibleSquadIds,
        status: query.status,
        squadId: query.squadId,
        squadSlug: query.squadSlug
      });
      const payload = athletes.map((athlete) => ({
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      }));

      createApiSuccessSchema(athleteSchema.array()).parse({ data: payload });

      return ok(c, payload);
    })
    .post("/athletes", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const body = parseOrThrow(createAthleteInputSchema.safeParse(await c.req.json()));
      const athlete = await athleteManagementService.createAthlete(requestContext.tenant!.id, body);

      if (!athlete) {
        throw new AppError(500, "INTERNAL_ERROR", "Athlete could not be loaded after creation");
      }

      const payload = {
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      };

      createApiSuccessSchema(athleteSchema).parse({ data: payload });

      return created(c, payload);
    })
    .patch("/athletes/:athleteId/squad", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const body = parseOrThrow(updateAthleteSquadInputSchema.safeParse(await c.req.json()));
      const athlete = await athleteManagementService.assignAthleteToSquad({
        tenantId: requestContext.tenant!.id,
        athleteId: c.req.param("athleteId"),
        squadId: body.squadId,
        accessScope: requestContext.tenant!.accessScope,
        accessibleSquadIds: requestContext.tenant!.accessibleSquadIds
      });
      const payload = {
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      };

      createApiSuccessSchema(athleteSchema).parse({ data: payload });

      return ok(c, payload);
    })
    .patch("/athletes/:athleteId/archive", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const athlete = await athleteManagementService.archiveAthlete({
        tenantId: requestContext.tenant!.id,
        athleteId: c.req.param("athleteId"),
        accessScope: requestContext.tenant!.accessScope,
        accessibleSquadIds: requestContext.tenant!.accessibleSquadIds
      });
      const payload = {
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      };

      createApiSuccessSchema(athleteSchema).parse({ data: payload });

      return ok(c, payload);
    })
    .patch("/athletes/:athleteId/restore", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const body = parseOrThrow(restoreAthleteInputSchema.safeParse(await c.req.json()));
      const athlete = await athleteManagementService.restoreAthlete({
        tenantId: requestContext.tenant!.id,
        athleteId: c.req.param("athleteId"),
        squadId: body.squadId,
        accessScope: requestContext.tenant!.accessScope,
        accessibleSquadIds: requestContext.tenant!.accessibleSquadIds
      });
      const payload = {
        ...athlete,
        createdAt: new Date(athlete.createdAt).toISOString()
      };

      createApiSuccessSchema(athleteSchema).parse({ data: payload });

      return ok(c, payload);
    })
    .delete("/athletes/:athleteId", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const result = await athleteManagementService.deleteAthlete({
        tenantId: requestContext.tenant!.id,
        athleteId: c.req.param("athleteId"),
        accessScope: requestContext.tenant!.accessScope
      });

      createApiSuccessSchema(deleteAthleteResponseSchema).parse({ data: result });

      return ok(c, result);
    });
