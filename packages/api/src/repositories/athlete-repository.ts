import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { athletes } from "../db/schema";

export class AthleteRepository {
  public constructor(private readonly db: Database) {}

  public async findByIdForTenant(tenantId: string, athleteId: string) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(and(eq(athletes.tenantId, tenantId), eq(athletes.id, athleteId)))
      .limit(1);

    return athlete ?? null;
  }

  public async listByTenant(tenantId: string, filters: { squad?: string }) {
    return this.db
      .select()
      .from(athletes)
      .where(
        and(
          eq(athletes.tenantId, tenantId),
          eq(athletes.status, "active"),
          filters.squad ? eq(athletes.squad, filters.squad) : undefined
        )
      );
  }
}
