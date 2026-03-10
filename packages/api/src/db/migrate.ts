import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDatabase, db } from "./client";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDirectory, "../../drizzle");

const main = async () => {
  process.stdout.write(`Applying migrations from ${migrationsFolder}\n`);
  await migrate(db, { migrationsFolder });
  process.stdout.write(`Applied migrations from ${migrationsFolder}\n`);
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
    process.stderr.write(`Database migration failed.\n${message}\n`);
    await shutdown(1);
  });
