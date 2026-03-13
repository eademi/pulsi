import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDirectory, "..");

// Load package-local env files without depending on shell-exported variables.
process.loadEnvFile(resolve(packageRoot, ".env"));
process.loadEnvFile(resolve(packageRoot, ".env.local"));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_URL: z.string().url().default("http://localhost:3001"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().url().default("http://localhost:3002"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  ADMIN_AUTH_SECRET: z.string().min(32).optional(),
  GARMIN_API_BASE_URL: z.string().url(),
  GARMIN_CLIENT_ID: z.string().min(1),
  GARMIN_CLIENT_SECRET: z.string().min(1),
  GARMIN_OAUTH_REDIRECT_URI: z.string().url(),
  GARMIN_TOKEN_ENCRYPTION_KEY: z.string().min(32),
  GARMIN_WEBHOOK_SECRET: z.string().min(16),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  ADMIN_AUTH_SECRET: parsedEnv.ADMIN_AUTH_SECRET ?? parsedEnv.BETTER_AUTH_SECRET
};
export type Environment = typeof env;
