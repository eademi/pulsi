import { Hono } from "hono";

import { createTenantInputSchema, createApiSuccessSchema, tenantSchema } from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireAuth } from "../http/middleware";
import { created, ok, parseOrThrow } from "../http/responses";
import type { TenantService } from "../services/tenant-service";

export const buildTenantRoutes = (tenantService: TenantService) =>
  new Hono<AppBindings>()
    .use("*", requireAuth)
    .get("/tenants", async (c) => {
      const requestContext = c.get("requestContext");
      const memberships = await tenantService.listMemberships(requestContext.actor!.userId);
      const tenants = memberships.map((membership) => ({
        id: membership.tenantId,
        slug: membership.tenantSlug,
        name: membership.tenantName,
        timezone: membership.timezone,
        createdAt: toIsoString(membership.createdAt)
      }));

      createApiSuccessSchema(tenantSchema.array()).parse({ data: tenants });

      return ok(c, tenants);
    })
    .post("/tenants", async (c) => {
      const requestContext = c.get("requestContext");
      const body = parseOrThrow(createTenantInputSchema.safeParse(await c.req.json()));
      const tenant = await tenantService.createTenant(body, requestContext.actor!.userId);
      const payload = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        timezone: tenant.timezone,
        createdAt: toIsoString(tenant.createdAt)
      };

      createApiSuccessSchema(tenantSchema).parse({ data: payload });

      return created(c, payload);
    });

const toIsoString = (value: Date | string) => new Date(value).toISOString();
