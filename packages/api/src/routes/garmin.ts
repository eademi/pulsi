import { Hono } from "hono";

import {
  createApiSuccessSchema,
  createGarminConnectionSessionInputSchema,
  disconnectGarminConnectionInputSchema,
  garminConnectionSessionSchema,
  garminOauthCallbackQuerySchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireMinimumRole } from "../auth/authorization";
import {
  garminDeregistrationWebhookSchema,
  garminUserPermissionsWebhookSchema
} from "../integrations/garmin/garmin.contracts";
import {
  garminHealthPingSchema,
  garminHealthPushSchema
} from "../integrations/garmin/health-api.contracts";
import { env } from "../env";
import { AppError } from "../http/errors";
import { created, ok, parseOrThrow } from "../http/responses";
import type { GarminConnectionService } from "../services/garmin-connection-service";
import type { GarminOAuthService } from "../services/garmin-oauth-service";

export const buildGarminTenantRoutes = (
  garminOAuthService: GarminOAuthService,
  garminConnectionService: GarminConnectionService
) =>
  new Hono<AppBindings>()
    .post("/integrations/garmin/connection-sessions", async (c) => {
      const requestContext = c.get("requestContext");
      requireMinimumRole(requestContext.tenant!.role, "performance_staff");

      const body = parseOrThrow(
        createGarminConnectionSessionInputSchema.safeParse(await c.req.json())
      );
      const session = await garminOAuthService.createAuthorizationSession({
        tenantId: requestContext.tenant!.id,
        athleteId: body.athleteId,
        actorUserId: requestContext.actor!.userId,
        redirectUri: env.GARMIN_OAUTH_REDIRECT_URI
      });

      const payload = {
        authorizationUrl: session.authorizationUrl,
        state: session.state,
        expiresAt: session.expiresAt.toISOString()
      };

      createApiSuccessSchema(garminConnectionSessionSchema).parse({ data: payload });

      return created(c, payload);
    })
    .delete("/integrations/garmin/connections/:athleteId", async (c) => {
      const requestContext = c.get("requestContext");
      requireMinimumRole(requestContext.tenant!.role, "performance_staff");

      const body = parseOrThrow(
        disconnectGarminConnectionInputSchema.safeParse({
          athleteId: c.req.param("athleteId")
        })
      );
      await garminConnectionService.disconnectAthleteConnection({
        tenantId: requestContext.tenant!.id,
        athleteId: body.athleteId
      });

      return ok(c, {
        athleteId: body.athleteId,
        disconnected: true
      });
    });

export const buildGarminPublicRoutes = (
  garminOAuthService: GarminOAuthService,
  garminConnectionService: GarminConnectionService
) =>
  new Hono<AppBindings>()
    .get("/integrations/garmin/callback", async (c) => {
      const query = parseOrThrow(
        garminOauthCallbackQuerySchema.safeParse({
          code: c.req.query("code"),
          state: c.req.query("state")
        })
      );
      const result = await garminOAuthService.completeAuthorization(query);

      const redirectUrl = new URL(`${env.CLIENT_URL}/${result.tenantSlug}/dashboard`);
      redirectUrl.searchParams.set("garmin", "connected");
      redirectUrl.searchParams.set("athleteId", result.athleteId);

      return c.redirect(redirectUrl.toString(), 302);
    })
    .post("/webhooks/garmin/:webhookToken/deregistrations", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const payload = parseOrThrow(
        garminDeregistrationWebhookSchema.safeParse(await c.req.json())
      );
      await garminConnectionService.handleDeregistrations(payload);
      return ok(c, { accepted: true });
    })
    .post("/webhooks/garmin/:webhookToken/user-permissions", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const payload = parseOrThrow(
        garminUserPermissionsWebhookSchema.safeParse(await c.req.json())
      );
      await garminConnectionService.handlePermissionChanges(payload);
      return ok(c, { accepted: true });
    })
    .post("/webhooks/garmin/:webhookToken/ping", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const requestContext = c.get("requestContext");
      const payload = parseOrThrow(garminHealthPingSchema.safeParse(await c.req.json()));

      void garminConnectionService.handleHealthPing(payload).catch((error) => {
        requestContext.logger.error(
          {
            err: error,
            provider: "garmin",
            notificationType: "ping"
          },
          "garmin_ping_processing_failed"
        );
      });

      return ok(c, { accepted: true });
    })
    .post("/webhooks/garmin/:webhookToken/health", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const body = parseOrThrow(garminHealthPushSchema.safeParse(await c.req.json()));

      const result = await garminConnectionService.handleHealthPush(body);
      return ok(c, result);
    });

const assertWebhookToken = (token: string | undefined) => {
  if (!token || token !== env.GARMIN_WEBHOOK_SECRET) {
    throw new AppError(403, "FORBIDDEN", "Invalid Garmin webhook token");
  }
};
