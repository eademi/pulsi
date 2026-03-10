import { and, desc, eq, gte, lte } from "drizzle-orm";

import type { ListAthleteActivitiesQuery } from "@pulsi/shared";

import type { Database } from "../db/client";
import { providerActivitySummaries } from "../db/schema";

export class ActivityRepository {
  public constructor(private readonly db: Database) {}

  public async listAthleteActivities(input: {
    tenantId: string;
    athleteId: string;
    query: ListAthleteActivitiesQuery;
  }) {
    return this.db
      .select()
      .from(providerActivitySummaries)
      .where(
        and(
          eq(providerActivitySummaries.tenantId, input.tenantId),
          eq(providerActivitySummaries.athleteId, input.athleteId),
          input.query.fromDate ? gte(providerActivitySummaries.activityDate, input.query.fromDate) : undefined,
          input.query.toDate ? lte(providerActivitySummaries.activityDate, input.query.toDate) : undefined
        )
      )
      .orderBy(
        desc(providerActivitySummaries.activityDate),
        desc(providerActivitySummaries.startTimeInSeconds),
        desc(providerActivitySummaries.ingestedAt)
      )
      .limit(input.query.limit);
  }
}
