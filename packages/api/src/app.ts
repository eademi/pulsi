import { Hono } from "hono";
import { cors } from "hono/cors";

import { adminAuth } from "./auth/admin-auth";
import { auth } from "./auth/auth";
import { buildRepositories, buildServices } from "./app/dependencies";
import { buildV1Routes } from "./app/routes";
import type { AppBindings } from "./context/app-context";
import { db } from "./db/client";
import { env } from "./env";
import { requestMetaMiddleware } from "./http/middleware";
import { toErrorResponse } from "./http/responses";
import { logger } from "./telemetry/logger";

const repositories = buildRepositories(db);
const services = buildServices(db, repositories);

export const app = new Hono<AppBindings>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = new Set([env.CLIENT_URL, env.ADMIN_URL]);

      if (!origin) {
        return env.CLIENT_URL;
      }

      return allowedOrigins.has(origin) ? origin : env.CLIENT_URL;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    credentials: true,
    exposeHeaders: ["X-Request-Id"]
  })
);
app.use("*", requestMetaMiddleware);

app.onError((error, c) => {
  const requestContext = c.get("requestContext");
  const requestId = requestContext?.requestId ?? "unknown";
  (requestContext?.logger ?? logger).error({ err: error, requestId }, "request_failed");
  const response = toErrorResponse(requestId, error);
  return new Response(JSON.stringify(response.body), {
    status: response.status,
    headers: {
      "content-type": "application/json"
    }
  });
});

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.on(["GET", "POST"], "/api/admin-auth/*", (c) => adminAuth.handler(c.req.raw));
app.route("/v1", buildV1Routes(repositories, services));
