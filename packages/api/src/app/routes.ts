import { Hono } from "hono";

import type { AppBindings } from "../context/app-context";
import {
  productActorContextMiddleware,
  requireAdminAuth,
  tenantScopeMiddleware
} from "../http/middleware";
import { buildActivityRoutes } from "../routes/activities";
import { buildAdminRoutes } from "../routes/admin";
import {
  buildAthleteAccountRoutes,
  buildTenantAthleteAccountRoutes
} from "../routes/athlete-accounts";
import { buildAthleteRoutes } from "../routes/athletes";
import {
  buildGarminAthleteRoutes,
  buildGarminPublicRoutes,
  buildGarminTenantRoutes
} from "../routes/garmin";
import { healthRoutes } from "../routes/health";
import { buildReadinessRoutes } from "../routes/readiness";
import { sessionRoutes } from "../routes/session";
import { buildSquadRoutes } from "../routes/squads";
import { buildTenantAccessRoutes, buildTenantRoutes } from "../routes/tenants";
import { requirePlatformAdminAccess } from "../auth/platform-admin";
import type { buildRepositories, buildServices } from "./dependencies";

type Repositories = ReturnType<typeof buildRepositories>;
type Services = ReturnType<typeof buildServices>;

export const buildV1Routes = (repositories: Repositories, services: Services) => {
  const publicRoutes = new Hono<AppBindings>()
    .route("/", healthRoutes)
    .route(
      "/",
      buildGarminPublicRoutes(
        services.garminOAuthService,
        services.garminLifecycleService,
        services.garminHealthIngestionService,
        services.garminActivityIngestionService,
        services.garminBackfillService
      )
    );

  const productRoutes = new Hono<AppBindings>()
    .use(
      "*",
      productActorContextMiddleware(
        repositories.membershipRepository,
        repositories.athleteAccountRepository
      )
    )
    .route("/", sessionRoutes)
    .route("/", buildTenantRoutes(services.tenantService))
    .route("/", buildAthleteAccountRoutes(services.athleteAccountService))
    .route(
      "/",
      buildGarminAthleteRoutes(
        services.garminOAuthService,
        services.garminLifecycleService,
        repositories.garminRepository
      )
    );

  const adminRoutes = new Hono<AppBindings>()
    .use(
      "/admin/*",
      requireAdminAuth(repositories.adminProfileRepository),
      requirePlatformAdminAccess
    )
    .route("/admin", buildAdminRoutes(services.adminGarminService));

  const tenantScopedRoutes = new Hono<AppBindings>()
    .use("*", tenantScopeMiddleware(services.tenantAccessService))
    .route("/", buildTenantAccessRoutes(services.tenantService))
    .route("/", buildActivityRoutes(services.activityService))
    .route("/", buildTenantAthleteAccountRoutes(services.athleteAccountService))
    .route(
      "/",
      buildAthleteRoutes(
        repositories.athleteRepository,
        services.athleteManagementService,
        services.athleteOnboardingService
      )
    )
    .route("/", buildReadinessRoutes(services.readinessService))
    .route("/", buildSquadRoutes(services.squadService))
    .route(
      "/",
      buildGarminTenantRoutes(
        services.garminOAuthService,
        services.garminLifecycleService,
        repositories.athleteRepository,
        repositories.garminRepository
      )
    );

  return new Hono<AppBindings>()
    .route("/", publicRoutes)
    .route("/", productRoutes)
    .route("/", adminRoutes)
    .route("/tenants/:tenantSlug", tenantScopedRoutes);
};
