import { and, desc, eq, gte, lte } from "drizzle-orm";

import type { ListAthleteActivitiesQuery } from "@pulsi/shared";

import type { Database } from "../db/client";
import { integrationActivitySummaries } from "../db/schema";

export class ActivityRepository {
  public constructor(private readonly db: Database) {}

  public async listAthleteActivities(input: {
    tenantId: string;
    athleteId: string;
    query: ListAthleteActivitiesQuery;
  }) {
    return this.db
      .select()
      .from(integrationActivitySummaries)
      .where(
        and(
          eq(integrationActivitySummaries.tenantId, input.tenantId),
          eq(integrationActivitySummaries.athleteId, input.athleteId),
          input.query.fromDate ? gte(integrationActivitySummaries.activityDate, input.query.fromDate) : undefined,
          input.query.toDate ? lte(integrationActivitySummaries.activityDate, input.query.toDate) : undefined
        )
      )
      .orderBy(
        desc(integrationActivitySummaries.activityDate),
        desc(integrationActivitySummaries.startTimeInSeconds),
        desc(integrationActivitySummaries.ingestedAt)
      )
      .limit(input.query.limit);
  }
}
