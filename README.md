# Pulsi

Pulsi is a multi-tenant sports readiness platform for football clubs.

For the agent-optimized documentation index, start with [docs/AGENT_DOCS.md](/Users/ea/Desktop/projects/pulsi-app/docs/AGENT_DOCS.md).
For the smallest high-signal project overview, start with [docs/PROJECT_CORE.md](/Users/ea/Desktop/projects/pulsi-app/docs/PROJECT_CORE.md).

## Local database

Pulsi includes a local PostgreSQL dev environment with Docker Compose.

Quick start:

1. copy [packages/api/.env.example](/Users/ea/Desktop/projects/pulsi-app/packages/api/.env.example) to `packages/api/.env`
2. copy [packages/api/.env.local.example](/Users/ea/Desktop/projects/pulsi-app/packages/api/.env.local.example) to `packages/api/.env.local`
3. start Postgres with `pnpm db:up`
4. apply schema with `pnpm db:migrate:api`
5. start the API with `pnpm dev:api`
6. start the product client with `pnpm dev:client`
7. start the internal admin app with `pnpm dev:admin`

Useful commands:

- `pnpm db:up`: start PostgreSQL
- `pnpm db:up:tools`: start PostgreSQL and Adminer on `http://localhost:8080`
- `pnpm db:down`: stop containers
- `pnpm db:logs`: tail PostgreSQL logs
- `pnpm db:ps`: inspect container status
- `pnpm db:seed:demo`: populate the local database with the Pulsi demo club
- `pnpm db:reset-demo`: remove the demo club and demo accounts only
- `pnpm db:wipe`: wipe the whole local database schema; run `pnpm db:migrate:api` afterward

The default local database URL is already aligned with the API env example:

`postgres://postgres:postgres@localhost:5432/pulsi`

Garmin onboarding imports the last 30 days of Health data automatically after first connect.
