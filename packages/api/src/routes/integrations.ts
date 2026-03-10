import { Hono } from "hono";

import {
  createApiSuccessSchema,
  integrationProviderSchema,
  syncJobSchema,
  triggerIntegrationSyncInputSchema
} from "@pulsi/shared";

import type { AppBindings } from "../context/app-context";
import { requireMinimumRole } from "../auth/authorization";
import { AppError } from "../http/errors";
import { ok, parseOrThrow } from "../http/responses";
import type { IntegrationSyncService } from "../services/integration-sync-service";

export const buildIntegrationRoutes = (integrationSyncService: IntegrationSyncService) =>
  new Hono<AppBindings>().post("/integrations/:provider/sync", async (c) => {
    const requestContext = c.get("requestContext");
    requireMinimumRole(requestContext.tenant!.role, "performance_staff");

    const provider = parseProvider(c.req.param("provider"));
    const body = parseOrThrow(triggerIntegrationSyncInputSchema.safeParse(await c.req.json()));
    const result = await integrationSyncService.syncAthleteConnection({
      tenantId: requestContext.tenant!.id,
      athleteId: body.athleteId,
      provider,
      actorUserId: requestContext.actor!.userId
    });

    const payload = {
      id: result.job.id,
      tenantId: result.job.tenantId,
      provider: result.job.provider,
      status: result.job.status,
      scheduledFor: new Date(result.job.scheduledFor).toISOString(),
      attempts: result.job.attempts,
      lastError: result.job.lastError
    };

    createApiSuccessSchema(syncJobSchema).parse({ data: payload });

    return ok(c, payload, {
      generatedAt: requestContext.now.toISOString()
    });
  });

const parseProvider = (value: string | undefined) => {
  const parsed = integrationProviderSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Unsupported integration provider");
  }

  return parsed.data;
};
