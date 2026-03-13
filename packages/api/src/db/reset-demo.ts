import { eq, inArray } from "drizzle-orm";

import { closeDatabase, db } from "./client";
import {
  tenants,
  user
} from "./schema";

const DEMO_TENANT_SLUG = "pulsi-demo-fc";
const DEMO_USER_EMAILS = [
  "owner@pulsi.com",
  "admin@pulsi.com",
  "coach.senior@pulsi.com",
  "performance@pulsi.com",
  "analyst.u18@pulsi.com",
  "senior.01@pulsi.com",
  "senior.02@pulsi.com",
  "u18.01@pulsi.com",
  "u18.02@pulsi.com"
];

const main = async () => {
  process.stdout.write(`Resetting demo environment for ${DEMO_TENANT_SLUG}\n`);

  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, DEMO_TENANT_SLUG)).limit(1);

  if (tenant) {
    // Deleting the tenant removes the full demo graph through foreign-key cascades:
    // squads, athletes, Garmin links, athlete invites, readiness data, memberships, and scoped access rows.
    await db.delete(tenants).where(eq(tenants.id, tenant.id));
    process.stdout.write(`Deleted tenant ${DEMO_TENANT_SLUG}\n`);
  } else {
    process.stdout.write(`Tenant ${DEMO_TENANT_SLUG} does not exist, skipping tenant cleanup\n`);
  }

  const deletedUsers = await db.delete(user).where(inArray(user.email, DEMO_USER_EMAILS)).returning({ email: user.email });
  process.stdout.write(`Deleted ${deletedUsers.length} demo auth user(s)\n`);
};

const shutdown = async (exitCode: number) => {
  try {
    await closeDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Failed to close database client cleanly.\n${message}\n`);
    process.exit(exitCode === 0 ? 1 : exitCode);
  }

  process.exit(exitCode);
};

void main()
  .then(() => shutdown(0))
  .catch(async (error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`Demo reset failed.\n${message}\n`);
    await shutdown(1);
  });
