import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "../db/client";
import { readinessSnapshots, wearableDailyMetrics } from "../db/schema";

export class ReadinessRepository {
  public constructor(private readonly db: Database) {}

  public async listSnapshotsForAthletes(input: {
    tenantId: string;
    athleteIds: string[];
    onDate?: string;
  }) {
    if (input.athleteIds.length === 0) {
      return [];
    }

    return this.db
      .select({
        snapshot: readinessSnapshots,
        metric: wearableDailyMetrics
      })
      .from(readinessSnapshots)
      .leftJoin(wearableDailyMetrics, eq(readinessSnapshots.sourceMetricId, wearableDailyMetrics.id))
      .where(
        and(
          eq(readinessSnapshots.tenantId, input.tenantId),
          inArray(readinessSnapshots.athleteId, input.athleteIds),
          input.onDate ? eq(readinessSnapshots.snapshotDate, input.onDate) : undefined
        )
      )
      .orderBy(desc(readinessSnapshots.snapshotDate));
  }
}
