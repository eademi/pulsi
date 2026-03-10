import { Hono } from "hono";
import { cors } from "hono/cors";

import { db } from "./db/client";
import type { AppBindings } from "./context/app-context";
import { auth } from "./auth/auth";
import { toErrorResponse } from "./http/responses";
import { requestContextMiddleware, tenantScopeMiddleware } from "./http/middleware";
import { ActivityRepository } from "./repositories/activity-repository";
import { AthleteRepository } from "./repositories/athlete-repository";
import { IntegrationRepository } from "./repositories/integration-repository";
import { InvitationRepository } from "./repositories/invitation-repository";
import { MembershipRepository } from "./repositories/membership-repository";
import { ReadinessRepository } from "./repositories/readiness-repository";
import { TenantRepository } from "./repositories/tenant-repository";
import { buildActivityRoutes } from "./routes/activities";
import { buildAthleteRoutes } from "./routes/athletes";
import { buildGarminPublicRoutes, buildGarminTenantRoutes } from "./routes/garmin";
import { healthRoutes } from "./routes/health";
import { buildReadinessRoutes } from "./routes/readiness";
import { buildSquadRoutes } from "./routes/squads";
import { sessionRoutes } from "./routes/session";
import { buildTenantAccessRoutes, buildTenantRoutes } from "./routes/tenants";
import { GarminApiClient } from "./integrations/garmin/garmin-client";
import { GarminMapper } from "./integrations/garmin/garmin-mapper";
import { TokenCipher } from "./integrations/garmin/token-cipher";
import { env } from "./env";
import { logger } from "./telemetry/logger";
import { GarminRepository } from "./repositories/garmin-repository";
import { SquadRepository } from "./repositories/squad-repository";
import { GarminConnectionService } from "./services/garmin-connection-service";
import { GarminBackfillService } from "./services/garmin-backfill-service";
import { GarminOAuthService } from "./services/garmin-oauth-service";
import { GarminTokenService } from "./services/garmin-token-service";
import { ActivityService } from "./services/activity-service";
import { MetricIngestionService } from "./services/metric-ingestion-service";
import { ReadinessEngine } from "./services/readiness-engine";
import { ReadinessService } from "./services/readiness-service";
import { TenantAccessService } from "./services/tenant-access-service";
import { SquadService } from "./services/squad-service";
import { TenantService } from "./services/tenant-service";

const membershipRepository = new MembershipRepository(db);
const invitationRepository = new InvitationRepository(db);
const activityRepository = new ActivityRepository(db);
const athleteRepository = new AthleteRepository(db);
const readinessRepository = new ReadinessRepository(db);
const tenantRepository = new TenantRepository(db);
const integrationRepository = new IntegrationRepository(db);
const garminRepository = new GarminRepository(db);
const squadRepository = new SquadRepository(db);
const readinessEngine = new ReadinessEngine();
const garminApiClient = new GarminApiClient();
const garminMapper = new GarminMapper();
const tokenCipher = new TokenCipher();

const tenantService = new TenantService(db, tenantRepository, membershipRepository, invitationRepository);
const tenantAccessService = new TenantAccessService(membershipRepository);
const activityService = new ActivityService(athleteRepository, activityRepository);
const readinessService = new ReadinessService(athleteRepository, readinessRepository);
const squadService = new SquadService(squadRepository);
const metricIngestionService = new MetricIngestionService(integrationRepository, readinessEngine);
const garminTokenService = new GarminTokenService(
  garminRepository,
  garminApiClient,
  tokenCipher
);
const garminBackfillService = new GarminBackfillService(
  garminApiClient,
  garminTokenService,
  garminMapper,
  integrationRepository,
  metricIngestionService
);
const garminOAuthService = new GarminOAuthService(
  athleteRepository,
  garminRepository,
  garminApiClient,
  garminTokenService
);
const garminConnectionService = new GarminConnectionService(
  garminRepository,
  garminTokenService,
  garminApiClient,
  garminMapper,
  integrationRepository,
  metricIngestionService
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
app.route(
  "/v1",
  buildGarminPublicRoutes(garminOAuthService, garminConnectionService, garminBackfillService)
);

const tenantScopedRoutes = new Hono<AppBindings>()
  .use("*", tenantScopeMiddleware(tenantAccessService))
  .route("/", buildTenantAccessRoutes(tenantService))
  .route("/", buildActivityRoutes(activityService))
  .route("/", buildAthleteRoutes(athleteRepository))
  .route("/", buildReadinessRoutes(readinessService))
  .route("/", buildSquadRoutes(squadService))
  .route(
    "/",
    buildGarminTenantRoutes(
      garminOAuthService,
      garminConnectionService,
      athleteRepository,
      garminRepository
    )
  );

app.route("/v1/tenants/:tenantSlug", tenantScopedRoutes);
