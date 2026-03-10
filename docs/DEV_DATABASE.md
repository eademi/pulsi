# Pulsi Local Database

This document defines the recommended local database setup for Pulsi development.

## Why this setup

The goal is:

- one-command local startup
- persistent data between restarts
- no dependency on a hosted database
- compatibility with the current Drizzle schema and migration workflow

Pulsi uses PostgreSQL in Docker via [docker-compose.yml](/Users/ea/Desktop/projects/pulsi-app/docker-compose.yml).

## Services

### PostgreSQL

- image: `postgres:17-alpine`
- host port: `5432`
- database: `pulsi`
- username: `postgres`
- password: `postgres`
- persistent volume: `pulsi_postgres_data`

### Adminer (optional)

Adminer is available behind the `tools` profile for quick inspection of tables during development.

- URL: `http://localhost:8080`
- server: `postgres`
- username: `postgres`
- password: `postgres`
- database: `pulsi`

Start it with:

```bash
pnpm db:up:tools
```

## Important extension

Pulsi’s schema uses `gen_random_uuid()`, which requires the PostgreSQL `pgcrypto` extension.

This is enabled in two places:

- container init script: [docker/postgres/init/001-pgcrypto.sql](/Users/ea/Desktop/projects/pulsi-app/docker/postgres/init/001-pgcrypto.sql)
- migration baseline: [packages/api/drizzle/0000_needy_rick_jones.sql](/Users/ea/Desktop/projects/pulsi-app/packages/api/drizzle/0000_needy_rick_jones.sql)

That makes fresh local environments predictable and keeps migrations self-contained.

## Standard workflow

1. Copy [packages/api/.env.example](/Users/ea/Desktop/projects/pulsi-app/packages/api/.env.example) to `packages/api/.env`
2. Copy [packages/api/.env.local.example](/Users/ea/Desktop/projects/pulsi-app/packages/api/.env.local.example) to `packages/api/.env.local`
3. Start PostgreSQL:

```bash
pnpm db:up
```

4. Apply migrations:

```bash
pnpm db:migrate:api
```

5. Start the API:

```bash
pnpm dev:api
```

## Connection string

Use this in `packages/api/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pulsi
```

Use this in `packages/api/.env.local` for local-only secrets:

```env
BETTER_AUTH_SECRET=replace-with-a-32-character-secret
GARMIN_CLIENT_ID=replace-with-garmin-client-id
GARMIN_CLIENT_SECRET=replace-with-garmin-client-secret
GARMIN_TOKEN_ENCRYPTION_KEY=replace-with-a-32-character-encryption-key
GARMIN_WEBHOOK_SECRET=replace-with-a-webhook-secret
```

## Operational commands

Start database:

```bash
pnpm db:up
```

Start database and Adminer:

```bash
pnpm db:up:tools
```

Stop services:

```bash
pnpm db:down
```

View logs:

```bash
pnpm db:logs
```

Show status:

```bash
pnpm db:ps
```

Reset only the seeded Pulsi demo organization and demo auth users:

```bash
pnpm db:reset-demo
```

Wipe the entire local database schema:

```bash
pnpm db:wipe
pnpm db:migrate:api
```

## Notes

- `docker compose down` stops containers but keeps the named volume, so data persists.
- if you want a clean reset later, you can remove the volume manually with Docker Desktop or `docker compose down -v`
- do not use the local `postgres/postgres` credentials outside development
- `.env` is for shared local defaults, `.env.local` is for machine-specific or secret overrides
