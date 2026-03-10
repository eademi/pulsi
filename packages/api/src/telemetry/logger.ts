import pino from "pino";

import { env } from "../env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: undefined,
  redact: {
    paths: [
      "authorization",
      "headers.authorization",
      "accessToken",
      "refreshToken",
      "credentials",
      "body.rawPayload"
    ],
    censor: "[redacted]"
  },
  formatters: {
    level: (label) => ({ level: label })
  }
});

export interface Metrics {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  timing(name: string, durationMs: number, tags?: Record<string, string>): void;
}

export class NoopMetrics implements Metrics {
  increment(_name: string, _value = 1, _tags: Record<string, string> = {}): void {}

  timing(_name: string, _durationMs: number, _tags: Record<string, string> = {}): void {}
}
