# Pulsi Developer Guide

This document is for the future developer who wants to understand the Pulsi codebase quickly enough to maintain it and extend it safely.

It focuses on:

- what each package does
- how requests move through the system
- how Garmin integration works
- how multi-tenancy works
- where to add new features
- how Ping, Pull, and Push fit together

## 1. High-Level Mental Model

Pulsi is a pnpm monorepo with three packages:

- `packages/shared`: shared schemas and API contracts
- `packages/api`: backend service
- `packages/client`: frontend app

The simplest mental model is:

1. `shared` defines the shape of data
2. `api` validates, processes, and stores data
3. `client` fetches and displays data

If you are ever lost, start from `packages/api/src/app.ts`.

## 2. Monorepo Overview

### `@pulsi/shared`

Main purpose:

- define Zod schemas
- export TypeScript types inferred from those schemas
- keep API request and response contracts consistent between backend and frontend

Typical files:

- `packages/shared/src/contracts/api.ts`
- `packages/shared/src/contracts/auth.ts`
- `packages/shared/src/contracts/integrations.ts`
- `packages/shared/src/contracts/readiness.ts`
- `packages/shared/src/contracts/tenant.ts`

### `@pulsi/api`

Main purpose:

- authenticate users
- resolve tenant context
- expose REST endpoints
- integrate with Garmin
- persist data in PostgreSQL
- compute readiness outputs

Key folders:

- `auth/`
- `context/`
- `db/`
- `http/`
- `integrations/`
- `repositories/`
- `routes/`
- `services/`
- `telemetry/`

### `@pulsi/client`

Main purpose:

- render the coach-facing UI
- call the API
- parse responses using shared contracts

Key folders:

- `app/`
- `features/`
- `components/`
- `lib/`

## 3. Backend Architecture

The backend uses a pragmatic layered structure:

- routes
- services
- repositories
- integrations

### Routes

Routes live in `packages/api/src/routes`.

They should:

- read request params/body/query
- validate input
- enforce auth/role checks
- call services
- return HTTP responses

Routes should not contain business logic.

### Services

Services live in `packages/api/src/services`.

They should:

- implement application use cases
- coordinate repositories
- coordinate integration clients
- keep business rules in one place

Examples:

- `GarminOAuthService`
- `GarminConnectionService`
- `MetricIngestionService`
- `ReadinessService`

### Repositories

Repositories live in `packages/api/src/repositories`.

They should:

- be the only layer that directly talks to Drizzle and PostgreSQL
- keep SQL and persistence concerns out of services
- always enforce tenant scoping where applicable

### Integrations

Integration code lives in `packages/api/src/integrations`.

For Garmin, this is where:

- Garmin payload schemas live
- Garmin OAuth helpers live
- Garmin HTTP client lives
- Garmin-specific mapping lives

The important rule is:

- Garmin-specific concepts should stop at the integration boundary
- Pulsi core should operate on normalized internal data

## 4. Request Lifecycle

The normal tenant-scoped request path is:

1. request enters Hono in `packages/api/src/app.ts`
2. `requestContextMiddleware` creates `requestId`, logger, and actor context
3. Better Auth session is resolved
4. `tenantScopeMiddleware` resolves `tenantSlug` to an active tenant membership
5. route validates input
6. route calls service
7. service calls repository and/or integration code
8. response is returned in a standard API envelope

Important files:

- `packages/api/src/app.ts`
- `packages/api/src/http/middleware.ts`
- `packages/api/src/auth/auth.ts`

## 5. Multi-Tenancy

Pulsi is multi-tenant. Each tenant is a club/organization.

The practical rule is:

- every tenant-owned record must be read and written in tenant context

How this is enforced:

- tenant routes live under `/v1/tenants/:tenantSlug/...`
- middleware resolves the user’s membership in that tenant
- the request context stores the active tenant
- repositories filter by `tenantId`

Main tables involved:

- `tenants`
- `tenant_memberships`
- `athletes`
- `athlete_device_connections`
- `wearable_daily_metrics`
- `readiness_snapshots`

Key file:

- `packages/api/src/db/schema.ts`

## 6. Core Domain Concepts

### Tenant

A club or organization.

### Athlete

A player belonging to one tenant.

### AthleteDeviceConnection

A connection between an athlete and an external provider such as Garmin.

### WearableDailyMetric

Pulsi’s normalized daily wearable record.

This is important: Garmin data is not shown to the rest of the app directly. It first becomes a normalized Pulsi record.

### ReadinessSnapshot

Pulsi’s output for coaches:

- readiness score
- readiness band
- training recommendation
- rationale

## 7. Garmin Architecture

Garmin code lives mainly in:

- `packages/api/src/integrations/garmin/`
- `packages/api/src/routes/garmin.ts`
- `packages/api/src/services/garmin-oauth-service.ts`
- `packages/api/src/services/garmin-connection-service.ts`
- `packages/api/src/services/garmin-token-service.ts`
- `packages/api/src/services/metric-ingestion-service.ts`

Garmin integration has 4 major responsibilities:

1. connect users with OAuth 2.0 PKCE
2. store and refresh tokens safely
3. receive Garmin notifications
4. map Garmin Health summaries into Pulsi readiness data and Garmin Activity summaries into coach session context

## 8. Garmin OAuth Flow

Pulsi starts Garmin connection from:

- `POST /v1/tenants/:tenantSlug/integrations/garmin/connection-sessions`

Flow:

1. user requests Garmin connection for an athlete
2. Pulsi checks that athlete belongs to the tenant
3. Pulsi creates a short-lived OAuth session
4. Pulsi generates PKCE values:
   - `state`
   - `code_verifier`
   - `code_challenge`
5. user is redirected to Garmin
6. Garmin redirects back to Pulsi callback
7. Pulsi exchanges code for tokens
8. Pulsi fetches Garmin user ID and permissions
9. Pulsi stores:
   - local connection record
   - encrypted access token
   - encrypted refresh token
10. Pulsi starts an asynchronous onboarding backfill for recent Garmin Health data

Key files:

- `packages/api/src/integrations/garmin/pkce.ts`
- `packages/api/src/services/garmin-oauth-service.ts`
- `packages/api/src/repositories/garmin-repository.ts`

## 9. Garmin Tokens

Garmin tokens are stored encrypted.

Important files:

- `packages/api/src/integrations/garmin/token-cipher.ts`
- `packages/api/src/services/garmin-token-service.ts`
- `packages/api/src/integrations/garmin/garmin-client.ts`

Behavior:

- Pulsi decrypts tokens only when needed
- Pulsi refreshes access tokens automatically
- Pulsi fails explicitly when refresh tokens are no longer usable

## 9.1 Onboarding Backfill

After Garmin OAuth completes, Pulsi starts a bounded Garmin Health backfill in the background.

This is implemented in:

- `packages/api/src/services/garmin-backfill-service.ts`

Why it exists:

- coaches should not land on an empty dashboard immediately after connect
- recent Garmin history can be imported without waiting for the next webhook delivery

The window is controlled by:

- a fixed 30-day onboarding import window

Current default:

- `30`

Backfill uses:

- Garmin Health backfill endpoints
- the same `GarminMapper` path used for webhook data
- the same `MetricIngestionService` path used for readiness derivation

## 10. Garmin Notification Models: Ping, Pull, Push

This is the most confusing part, so here is the plain-English version.

### Push

Push means:

- Garmin sends the actual data directly to your endpoint

Example:

Garmin POSTs a JSON body containing `dailies`, `sleeps`, or `hrv` records.

Pulsi endpoint:

- `POST /v1/webhooks/garmin/:webhookToken/health`

For Garmin Activity Summaries:

- `POST /v1/webhooks/garmin/:webhookToken/activity`

In Push mode, Pulsi does not need to make another request to Garmin for that specific notification because the data is already in the request body.

### Ping

Ping means:

- Garmin tells you that data is available
- Garmin does not include the full data
- instead Garmin includes a `callbackURL`

So Ping is basically:

- "new data exists, go fetch it here"

Pulsi endpoint:

- `POST /v1/webhooks/garmin/:webhookToken/health/ping`

For Garmin Activity Summaries:

- `POST /v1/webhooks/garmin/:webhookToken/activity/ping`

Important rule from Garmin:

- respond with HTTP `200` quickly
- do not keep the ping request open while fetching callback data

That is why Pulsi:

1. accepts the ping
2. returns success immediately
3. fetches the callback URL asynchronously
4. processes the callback response after the request is already closed

### Pull

Pull means:

- your system actively requests data from Garmin

There are two different meanings people often confuse:

1. generic "we pull data whenever we want"
2. Garmin’s Ping/Pull pattern where Garmin gives a callback URL and you pull only because Garmin told you to

For Garmin Health API:

- ad-hoc pull is not allowed
- pull is only valid when Garmin explicitly gives you a callback URL via Ping

So in Pulsi:

- manual pull is not supported
- ping-triggered callback fetching is supported

### Simple comparison

Push:

- Garmin sends full data immediately

Ping:

- Garmin sends a callback URL
- Pulsi fetches data from that URL

Pull:

- in Garmin Health API, this should only happen as a result of Ping callback URLs

## 11. How Ping Works In Pulsi

Flow:

1. Garmin sends Ping payload to Pulsi
2. Pulsi validates the payload
3. Pulsi stores a webhook event record
4. Pulsi immediately returns HTTP `200`
5. Pulsi fetches Garmin callback URLs in the background
6. Pulsi validates the callback response by summary type
7. Pulsi converts the callback result into the same shape as Push processing
8. Pulsi sends it into the normal ingestion path

Key files:

- `packages/api/src/routes/garmin.ts`
- `packages/api/src/integrations/garmin/garmin-client.ts`
- `packages/api/src/integrations/garmin/health-api.contracts.ts`
- `packages/api/src/services/garmin-connection-service.ts`

## 12. How Push Works In Pulsi

Flow:

1. Garmin sends summary data directly
2. Pulsi validates the payload
3. `GarminMapper` extracts normalized records
4. `MetricIngestionService` stores them
5. `ReadinessEngine` computes readiness output

## 13. How Garmin Data Becomes Readiness

This is the most important internal transformation.

Garmin summary -> Pulsi normalized metric -> Pulsi readiness snapshot

Current mapped Garmin summary types:

- `dailies`
- `sleeps`
- `hrv`

This mapping lives in:

- `packages/api/src/integrations/garmin/garmin-mapper.ts`

That mapper outputs Pulsi’s normalized record:

- `metricDate`
- `restingHeartRate`
- `hrvNightlyMs`
- `sleepDurationMinutes`
- `sleepScore`
- `bodyBatteryHigh`
- `bodyBatteryLow`
- `stressAverage`
- `trainingReadiness`
- `rawPayload`

Then:

- `MetricIngestionService` stores the normalized metric
- `ReadinessEngine` derives score/band/recommendation
- `IntegrationRepository` upserts the metric and snapshot

Key files:

- `packages/api/src/services/metric-ingestion-service.ts`
- `packages/api/src/services/readiness-engine.ts`
- `packages/api/src/repositories/integration-repository.ts`

## 14. Health API Contracts

Garmin Health API summary schemas live in:

- `packages/api/src/integrations/garmin/health-api.contracts.ts`

This file contains typed Zod schemas and TypeScript types for:

- dailies
- epochs
- sleeps
- body composition
- stress details
- user metrics
- pulse ox
- respiration
- health snapshot
- HRV
- blood pressure
- skin temperature
- ping payloads
- push payloads
- backfill query parameters

Important distinction:

- typed/validated does not mean fully used in the product
- some Garmin summary types are understood structurally, but not yet mapped into Pulsi readiness logic

## 15. What Is Persisted

Important tables:

### `garmin_oauth_sessions`

Temporary OAuth/PKCE state.

### `athlete_device_connections`

Provider connection for an athlete.

Important Garmin fields:

- `provider_user_id`
- `granted_permissions`
- `last_permissions_sync_at`
- `last_permission_change_at`

### `provider_credentials`

Encrypted provider access and refresh tokens.

### `provider_webhook_events`

Raw incoming Garmin events for:

- push
- ping
- deregistration
- permission changes

### `provider_activity_summaries`

Structured Garmin Activity Summary records for coach-facing recent session views.

### `wearable_daily_metrics`

Pulsi-normalized daily wearable record.

### `readiness_snapshots`

Coach-facing readiness output.

## 16. Why The Upsert Logic Matters

Garmin may send multiple summary types for the same athlete and same day.

Example:

- `dailies` arrives first
- `sleeps` arrives later
- `hrv` arrives later

If Pulsi simply overwrote the row each time, earlier fields would be lost.

So the DB upsert logic merges non-null fields into the existing metric row.

This logic lives in:

- `packages/api/src/repositories/integration-repository.ts`

## 17. Frontend Mental Model

The frontend is intentionally simple.

Flow:

1. router determines active tenant
2. TanStack Query fetches API data
3. responses are parsed against shared schemas
4. Base UI components render the result

Good starting files:

- `packages/client/src/app/router.tsx`
- `packages/client/src/lib/api.ts`
- `packages/client/src/features/dashboard/dashboard-page.tsx`

## 18. How To Add New Product Features

For normal REST features:

1. add schema in `packages/shared/src/contracts`
2. add route in `packages/api/src/routes`
3. add service in `packages/api/src/services`
4. add repository methods if DB access is needed
5. add client API call
6. add UI

## 19. How To Add Support For Another Garmin Summary Type

Example: support `stressDetails`.

Typical path:

1. confirm schema already exists in `health-api.contracts.ts`
2. decide whether it maps into existing `wearable_daily_metrics` fields or needs a new table
3. add mapping in `garmin-mapper.ts`
4. update ingestion path if needed
5. update readiness logic if the new metric should affect recommendations
6. expose it in API/client if you want it visible in UI

## 20. How To Add Another Provider

The pattern to follow is:

1. create `packages/api/src/integrations/<provider>/`
2. put provider-specific auth/client/contracts there
3. map provider payloads into Pulsi normalized records
4. reuse `MetricIngestionService`
5. avoid leaking provider-specific field names into core services

## 21. Database Migrations

Pulsi uses Drizzle SQL migrations stored in `packages/api/drizzle`.

Normal workflow:

1. change the schema in `packages/api/src/db/schema.ts`
2. generate SQL with `pnpm db:generate:api`
3. review the generated SQL in `packages/api/drizzle/*.sql`
4. apply migrations with `pnpm db:migrate:api`

The migration runner is `packages/api/src/db/migrate.ts`. Use that script as the standard way to apply migrations in local, staging, and production environments.

## 22. Environment Files

For the API package:

- `packages/api/.env`: shared local defaults
- `packages/api/.env.local`: local-only secrets and overrides

The load order is:

1. `.env`
2. `.env.local`

That means `.env.local` wins if the same variable is defined in both files.

Recommended split:

- `.env`: port, URLs, local database URL, log level
- `.env.local`: Better Auth secret, Garmin client credentials, Garmin webhook secret, token encryption key

## 23. Recommended Reading Order

If you want to understand the system fast, read in this order:

1. `docs/architecture.md`
2. `GARMIN_INTEGRATION.md`
3. `packages/api/src/app.ts`
4. `packages/api/src/http/middleware.ts`
5. `packages/api/src/db/schema.ts`
6. `packages/api/src/routes/garmin.ts`
7. `packages/api/src/services/garmin-connection-service.ts`
8. `packages/api/src/integrations/garmin/garmin-client.ts`
9. `packages/api/src/integrations/garmin/garmin-mapper.ts`
10. `packages/api/src/services/metric-ingestion-service.ts`

## 24. Common Mistakes To Avoid

- putting business logic directly into routes
- forgetting tenant scoping in repository queries
- storing provider-specific fields in the core domain without normalization
- treating Garmin Ping as if it were Push
- trying to do ad-hoc Garmin pulls outside Ping callback URLs
- overwriting metric rows instead of merging partial day data
- assuming that typed Garmin summary support means product support

## 25. Short Glossary

### PKCE

OAuth security mechanism using `code_verifier` and `code_challenge`.

### Garmin user ID

Garmin’s canonical external identifier for the connected account.

### Push

Garmin sends full data directly.

### Ping

Garmin sends a callback URL that Pulsi must fetch.

### Pull

Fetching data from Garmin. In this integration, Pull is only valid when triggered by Garmin Ping callback URLs.

### Normalized metric

Pulsi’s internal wearable record, independent of Garmin-specific naming.

### Readiness snapshot

Pulsi’s coach-facing recommendation derived from normalized data.
