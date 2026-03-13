import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { platformAdmins } from "../db/schema";

export class PlatformAdminRepository {
  public constructor(private readonly db: Database) {}

  public async isPlatformAdmin(userId: string) {
    const [record] = await this.db
      .select({ userId: platformAdmins.userId })
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, userId))
      .limit(1);

    return Boolean(record);
  }
}
