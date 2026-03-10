import { AppError } from "../../http/errors";
import { env } from "../../env";
import type { GarminCredentialProvider, GarminMetricsResponse } from "./garmin.types";

const sleep = async (durationMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export class GarminApiClient {
  public constructor(private readonly credentialProvider: GarminCredentialProvider) {}

  public async getDailyMetrics(input: {
    providerAthleteId: string;
    credentialKey: string;
    cursor?: string | null;
  }): Promise<GarminMetricsResponse> {
    const accessToken = await this.credentialProvider.getAccessToken(input.credentialKey);
    const url = new URL(`/wellness/daily/${input.providerAthleteId}`, env.GARMIN_API_BASE_URL);

    if (input.cursor) {
      url.searchParams.set("cursor", input.cursor);
    }

    return this.withRetry(async () => {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json"
        }
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "5");
        throw new GarminRetryableError(`Garmin rate limited request`, retryAfterSeconds * 1000);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new AppError(
          502,
          "EXTERNAL_SERVICE_FAILURE",
          "Garmin API request failed",
          { status: response.status, body }
        );
      }

      const payload = (await response.json()) as {
        data?: Array<Record<string, unknown>>;
        nextCursor?: string | null;
      };

      return {
        samples: (payload.data ?? []).map((sample) => ({
          calendarDate: String(sample.calendarDate),
          restingHeartRate: toNumber(sample.restingHeartRate),
          heartRateVariabilityMs: toNumber(sample.hrvNightlyMs ?? sample.heartRateVariabilityMs),
          sleepDurationSeconds: toNumber(sample.sleepDurationSeconds),
          sleepScore: toNumber(sample.sleepScore),
          bodyBatteryHigh: toNumber(sample.bodyBatteryHigh),
          bodyBatteryLow: toNumber(sample.bodyBatteryLow),
          averageStressLevel: toNumber(sample.averageStressLevel),
          trainingReadiness: toNumber(sample.trainingReadiness),
          rawPayload: sample
        })),
        nextCursor: payload.nextCursor ?? null
      };
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let delayMs = 500;

    while (attempt < 4) {
      try {
        return await operation();
      } catch (error) {
        attempt += 1;

        if (error instanceof GarminRetryableError && attempt < 4) {
          await sleep(Math.max(error.retryAfterMs, delayMs));
          delayMs *= 2;
          continue;
        }

        throw error;
      }
    }

    throw new AppError(502, "EXTERNAL_SERVICE_FAILURE", "Garmin API retry budget exhausted");
  }
}

class GarminRetryableError extends Error {
  public constructor(message: string, public readonly retryAfterMs: number) {
    super(message);
    this.name = "GarminRetryableError";
  }
}

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
