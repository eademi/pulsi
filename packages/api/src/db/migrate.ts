import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "./client";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(currentDirectory, "../../drizzle");

await migrate(db, { migrationsFolder });

process.stdout.write(`Applied migrations from ${migrationsFolder}\n`);
