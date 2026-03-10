import { serve } from "@hono/node-server";

import { app } from "./app";
import { env } from "./env";
import { logger } from "./telemetry/logger";

serve(
  {
    fetch: app.fetch,
    port: env.PORT
  },
  (info) => {
    logger.info({ port: info.port }, "pulsi_api_started");
  }
);
