import type { IntegrationProvider } from "@pulsi/shared";

import { AppError } from "../http/errors";
import type { HealthDataProvider } from "./provider.types";

export class HealthProviderRegistry {
  private readonly providers: Map<IntegrationProvider, HealthDataProvider>;

  public constructor(providers: HealthDataProvider[]) {
    this.providers = new Map(providers.map((provider) => [provider.provider, provider]));
  }

  public get(provider: IntegrationProvider): HealthDataProvider {
    const adapter = this.providers.get(provider);

    if (!adapter) {
      throw new AppError(501, "EXTERNAL_SERVICE_FAILURE", `Provider ${provider} is not configured`);
    }

    return adapter;
  }
}
