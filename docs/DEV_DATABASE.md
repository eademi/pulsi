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
2. Start PostgreSQL:

```bash
pnpm db:up
```

3. Apply migrations:

```bash
pnpm db:migrate:api
```

4. Start the API:

```bash
pnpm dev:api
```

## Connection string

Use this in `packages/api/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/pulsi
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

## Notes

- `docker compose down` stops containers but keeps the named volume, so data persists.
- if you want a clean reset later, you can remove the volume manually with Docker Desktop or `docker compose down -v`
- do not use the local `postgres/postgres` credentials outside development
