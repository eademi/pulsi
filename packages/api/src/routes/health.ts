import { Hono } from "hono";

import type { AppBindings } from "../context/app-context";
import { ok } from "../http/responses";

export const healthRoutes = new Hono<AppBindings>().get("/health", (c) =>
  ok(c, {
    service: "pulsi-api",
    status: "ok"
  })
);
