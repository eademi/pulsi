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
  garminActivityPingSchema,
  garminActivityPushSchema
} from "../integrations/garmin/activity-api.contracts";
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
    // OAuth callback after the user completes Garmin consent in the browser.
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
    // Garmin common lifecycle callback when a user registration is revoked remotely.
    .post("/webhooks/garmin/:webhookToken/common/deregistrations", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const payload = parseOrThrow(
        garminDeregistrationWebhookSchema.safeParse(await c.req.json())
      );
      await garminConnectionService.handleDeregistrations(payload);
      return ok(c, { accepted: true });
    })
    // Garmin common lifecycle callback when granted permissions change after consent.
    .post("/webhooks/garmin/:webhookToken/common/user-permissions", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const payload = parseOrThrow(
        garminUserPermissionsWebhookSchema.safeParse(await c.req.json())
      );
      await garminConnectionService.handlePermissionChanges(payload);
      return ok(c, { accepted: true });
    })
    // Health API ping notifications contain callback URLs that Pulsi fetches asynchronously.
    .post("/webhooks/garmin/:webhookToken/health/ping", async (c) => {
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
    // Activity API ping notifications contain callback URLs for discrete training sessions.
    .post("/webhooks/garmin/:webhookToken/activity/ping", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const requestContext = c.get("requestContext");
      const payload = parseOrThrow(garminActivityPingSchema.safeParse(await c.req.json()));

      void garminConnectionService.handleActivityPing(payload).catch((error) => {
        requestContext.logger.error(
          {
            err: error,
            provider: "garmin",
            notificationType: "activity_ping"
          },
          "garmin_activity_ping_processing_failed"
        );
      });

      return ok(c, { accepted: true });
    })
    // Health API push notifications deliver summary payloads directly in the request body.
    .post("/webhooks/garmin/:webhookToken/health", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const body = parseOrThrow(garminHealthPushSchema.safeParse(await c.req.json()));

      const result = await garminConnectionService.handleHealthPush(body);
      return ok(c, result);
    })
    // Activity API push notifications deliver activity summaries directly in the request body.
    .post("/webhooks/garmin/:webhookToken/activity", async (c) => {
      assertWebhookToken(c.req.param("webhookToken"));
      const body = parseOrThrow(garminActivityPushSchema.safeParse(await c.req.json()));

      const result = await garminConnectionService.handleActivityPush(body);
      return ok(c, result);
    });

const assertWebhookToken = (token: string | undefined) => {
  if (!token || token !== env.GARMIN_WEBHOOK_SECRET) {
    throw new AppError(403, "FORBIDDEN", "Invalid Garmin webhook token");
  }
};
