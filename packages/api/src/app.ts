import { Hono } from "hono";
import { cors } from "hono/cors";

import { db } from "./db/client";
import type { AppBindings } from "./context/app-context";
import { auth } from "./auth/auth";
import { toErrorResponse } from "./http/responses";
import { requestContextMiddleware, tenantScopeMiddleware } from "./http/middleware";
import { AthleteRepository } from "./repositories/athlete-repository";
import { IntegrationRepository } from "./repositories/integration-repository";
import { MembershipRepository } from "./repositories/membership-repository";
import { ReadinessRepository } from "./repositories/readiness-repository";
import { TenantRepository } from "./repositories/tenant-repository";
import { buildAthleteRoutes } from "./routes/athletes";
import { healthRoutes } from "./routes/health";
import { buildIntegrationRoutes } from "./routes/integrations";
import { buildReadinessRoutes } from "./routes/readiness";
import { sessionRoutes } from "./routes/session";
import { buildTenantRoutes } from "./routes/tenants";
import { GarminHealthAdapter } from "./integrations/garmin/garmin-adapter";
import { GarminApiClient } from "./integrations/garmin/garmin-client";
import { GarminMapper } from "./integrations/garmin/garmin-mapper";
import type { GarminCredentialProvider } from "./integrations/garmin/garmin.types";
import { HealthProviderRegistry } from "./integrations/provider-registry";
import { env } from "./env";
import { logger } from "./telemetry/logger";
import { IntegrationSyncService } from "./services/integration-sync-service";
import { ReadinessEngine } from "./services/readiness-engine";
import { ReadinessService } from "./services/readiness-service";
import { TenantAccessService } from "./services/tenant-access-service";
import { TenantService } from "./services/tenant-service";

class EnvironmentCredentialProvider implements GarminCredentialProvider {
  public async getAccessToken(credentialKey: string): Promise<string> {
    const token = process.env[credentialKey];

    if (!token) {
      throw new Error(`Missing Garmin credential for key ${credentialKey}`);
    }

    return token;
  }
}

const membershipRepository = new MembershipRepository(db);
const athleteRepository = new AthleteRepository(db);
const readinessRepository = new ReadinessRepository(db);
const tenantRepository = new TenantRepository(db);
const integrationRepository = new IntegrationRepository(db);
const readinessEngine = new ReadinessEngine();

const tenantService = new TenantService(tenantRepository, membershipRepository);
const tenantAccessService = new TenantAccessService(membershipRepository);
const readinessService = new ReadinessService(athleteRepository, readinessRepository);
const garminAdapter = new GarminHealthAdapter(
  new GarminApiClient(new EnvironmentCredentialProvider()),
  new GarminMapper()
);
const providerRegistry = new HealthProviderRegistry([garminAdapter]);
const integrationSyncService = new IntegrationSyncService(
  integrationRepository,
  providerRegistry,
  readinessEngine
);

export const app = new Hono<AppBindings>();

app.use(
  "*",
  cors({
    origin: env.CLIENT_URL,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    credentials: true,
    exposeHeaders: ["X-Request-Id"]
  })
);
app.use("*", requestContextMiddleware(membershipRepository));

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
app.route("/v1", healthRoutes);
app.route("/v1", sessionRoutes);
app.route("/v1", buildTenantRoutes(tenantService));

const tenantScopedRoutes = new Hono<AppBindings>()
  .use("*", tenantScopeMiddleware(tenantAccessService))
  .route("/", buildAthleteRoutes(athleteRepository))
  .route("/", buildReadinessRoutes(readinessService))
  .route("/", buildIntegrationRoutes(integrationSyncService));

app.route("/v1/tenants/:tenantSlug", tenantScopedRoutes);
