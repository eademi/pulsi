import { Hono } from "hono";

import {
  athleteClaimDetailsSchema,
  athleteClaimLinkSchema,
  athletePortalSchema,
  createApiSuccessSchema,
  createAthleteClaimLinkInputSchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireCapability } from "../auth/authorization";
import type { AthleteAccountService } from "../services/athlete-account-service";
import { AppError } from "../http/errors";
import { created, ok, parseOrThrow } from "../http/responses";
import { requireAuth } from "../http/middleware";

const requireUnassignedAccount = (actor: NonNullable<AppBindings["Variables"]["requestContext"]["actor"]>) => {
  if (actor.actorType === "athlete" || actor.memberships.length > 0) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only unassigned Pulsi accounts can view or accept athlete account invites"
    );
  }
};

export const buildAthleteAccountRoutes = (athleteAccountService: AthleteAccountService) =>
  new Hono<AppBindings>()
    .use("/athlete-invites/:token", requireAuth)
    .use("/athlete-invites/:token/accept", requireAuth)
    .use("/athlete-claims/:token", requireAuth)
    .use("/athlete-claims/:token/accept", requireAuth)
    .use("/me/athlete", requireAuth)
    .get("/athlete-invites/:token", async (c) => {
      const actor = c.get("requestContext").actor!;
      requireUnassignedAccount(actor);

      const details = await athleteAccountService.getClaimDetails(c.req.param("token"));
      createApiSuccessSchema(athleteClaimDetailsSchema).parse({ data: details });
      return ok(c, details);
    })
    .get("/athlete-claims/:token", async (c) => {
      const actor = c.get("requestContext").actor!;
      requireUnassignedAccount(actor);

      const details = await athleteAccountService.getClaimDetails(c.req.param("token"));
      createApiSuccessSchema(athleteClaimDetailsSchema).parse({ data: details });
      return ok(c, details);
    })
    .post("/athlete-invites/:token/accept", async (c) => {
      const actor = c.get("requestContext").actor!;
      const result = await athleteAccountService.acceptClaim({
        token: c.req.param("token"),
        userId: actor.userId,
        userEmail: actor.email,
        membershipCount: actor.memberships.length,
        actorType: actor.actorType
      });

      return ok(c, result);
    })
    .post("/athlete-claims/:token/accept", async (c) => {
      const actor = c.get("requestContext").actor!;
      const result = await athleteAccountService.acceptClaim({
        token: c.req.param("token"),
        userId: actor.userId,
        userEmail: actor.email,
        membershipCount: actor.memberships.length,
        actorType: actor.actorType
      });

      return ok(c, result);
    })
    .get("/me/athlete", async (c) => {
      const actor = c.get("requestContext").actor!;

      if (actor.actorType !== "athlete") {
        throw new AppError(403, "FORBIDDEN", "Athlete access is required");
      }

      const portal = await athleteAccountService.getAthletePortal(actor.athleteProfile);
      createApiSuccessSchema(athletePortalSchema).parse({ data: portal });
      return ok(c, portal);
    });

export const buildTenantAthleteAccountRoutes = (athleteAccountService: AthleteAccountService) =>
  new Hono<AppBindings>()
    .post("/athletes/:athleteId/invites", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const body = parseOrThrow(createAthleteClaimLinkInputSchema.safeParse(await c.req.json()));
      const claimLink = await athleteAccountService.createClaimLink({
        tenantId: requestContext.tenant!.id,
        athleteId: c.req.param("athleteId"),
        email: body.email,
        createdByUserId: requestContext.actor!.userId,
        accessScope: requestContext.tenant!.accessScope,
        accessibleSquadIds: requestContext.tenant!.accessibleSquadIds
      });

      createApiSuccessSchema(athleteClaimLinkSchema).parse({ data: claimLink });
      return created(c, claimLink);
    })
    .post("/athletes/:athleteId/claim-links", async (c) => {
      const requestContext = c.get("requestContext");
      requireCapability(requestContext.tenant!.role, "athletes:manage");

      const body = parseOrThrow(createAthleteClaimLinkInputSchema.safeParse(await c.req.json()));
      const claimLink = await athleteAccountService.createClaimLink({
        tenantId: requestContext.tenant!.id,
        athleteId: c.req.param("athleteId"),
        email: body.email,
        createdByUserId: requestContext.actor!.userId,
        accessScope: requestContext.tenant!.accessScope,
        accessibleSquadIds: requestContext.tenant!.accessibleSquadIds
      });

      createApiSuccessSchema(athleteClaimLinkSchema).parse({ data: claimLink });
      return created(c, claimLink);
    });
