import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("welcome", "routes/welcome.tsx"),
  route("athlete", "routes/athlete-home.tsx"),
  route("athlete/setup/:token", "routes/athlete-claim.tsx"),
  route("athlete/claim/:token", "routes/athlete-claim-redirect.tsx"),
  layout("routes/auth-layout.tsx", [
    route("auth/sign-in", "routes/auth-sign-in.tsx"),
    route("auth/register", "routes/auth-register.tsx")
  ]),
  route("auth/sign-out", "routes/auth-sign-out.tsx"),
  layout("routes/tenant-layout.tsx", [
    route(":tenantSlug/dashboard", "routes/dashboard.tsx"),
    route(":tenantSlug/players", "routes/players.tsx"),
    route(":tenantSlug/squads", "routes/squads.tsx"),
    route(":tenantSlug/session-planner", "routes/session-planner.tsx"),
    route(":tenantSlug/reports", "routes/reports.tsx"),
    route(":tenantSlug/settings", "routes/organization-settings.tsx"),
    route(":tenantSlug/integrations/garmin", "routes/garmin-integration.tsx")
  ])
] satisfies RouteConfig;
