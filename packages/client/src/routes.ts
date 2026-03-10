import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("welcome", "routes/welcome.tsx"),
  layout("routes/auth-layout.tsx", [
    route("auth/sign-in", "routes/auth-sign-in.tsx"),
    route("auth/register", "routes/auth-register.tsx")
  ]),
  route("auth/sign-out", "routes/auth-sign-out.tsx"),
  layout("routes/tenant-layout.tsx", [route(":tenantSlug/dashboard", "routes/dashboard.tsx")])
] satisfies RouteConfig;
