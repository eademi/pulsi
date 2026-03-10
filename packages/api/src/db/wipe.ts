import { sql } from "drizzle-orm";

import { closeDatabase, db } from "./client";

const main = async () => {
  process.stdout.write("Wiping database schemas public and drizzle\n");

  // Drizzle stores migration state in its own `drizzle` schema by default for PostgreSQL.
  // Drop both schemas so a full wipe also resets applied migration history.
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO postgres`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  process.stdout.write("Wiped database schemas public and drizzle\n");
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
    process.stderr.write(`Database wipe failed.\n${message}\n`);
    await shutdown(1);
  });
