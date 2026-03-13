import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { adminProfiles } from "../db/schema";

export class AdminProfileRepository {
  public constructor(private readonly db: Database) {}

  public async findByUserId(userId: string) {
    const [record] = await this.db
      .select()
      .from(adminProfiles)
      .where(eq(adminProfiles.userId, userId))
      .limit(1);

    return record ?? null;
  }
}
