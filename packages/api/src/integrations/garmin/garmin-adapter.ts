import type { GarminApiClient } from "./garmin-client";
import type { GarminMapper } from "./garmin-mapper";
import type { HealthDataProvider } from "../provider.types";

export class GarminHealthAdapter implements HealthDataProvider {
  public readonly provider = "garmin" as const;

  public constructor(
    private readonly client: GarminApiClient,
    private readonly mapper: GarminMapper
  ) {}

  public async pullAthleteMetrics(input: {
    providerAthleteId: string;
    credentialKey: string;
    cursor?: string | null;
  }) {
    const response = await this.client.getDailyMetrics(input);

    return {
      metrics: response.samples.map((sample) => this.mapper.toInternalMetric(sample)),
      nextCursor: response.nextCursor
    };
  }
}
