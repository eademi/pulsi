# Pulsi Architecture

## 1. Executive Summary

Pulsi is implemented as a pnpm monorepo with three workspace packages:

- `@pulsi/shared` defines the domain vocabulary, API contracts, and validation schemas.
- `@pulsi/api` owns authentication, tenant resolution, persistence, wearable ingestion, and REST APIs.
- `@pulsi/client` consumes the shared contracts and renders coach-facing readiness workflows.

The backend architecture is deliberately simple:

- Transport layer: Hono routes, validation, and HTTP error contracts.
- Application layer: service classes coordinating use cases.
- Domain model: tenant, athlete, readiness, and integration concepts.
- Infrastructure layer: Drizzle repositories, Better Auth, PostgreSQL, and provider adapters.

Tenant isolation is enforced by design:

- every tenant-owned table carries `tenant_id`
- every tenant-scoped route resolves tenant access before service execution
- repositories always query with `tenant_id`
- request context carries `tenant`, `requestId`, and authenticated actor state
- logs and sync jobs include tenant identity

Wearable integrations sit behind an anti-corruption layer so provider payload changes do not leak into the core domain model.

## 2. System Architecture Overview

Dependency direction:

1. `routes` depend on `services` and shared schemas.
2. `services` depend on `repositories` and integration ports.
3. `repositories` depend on Drizzle schema and the database client.
4. `integrations` depends on external HTTP APIs and maps provider payloads into internal records.
5. `shared` depends on no package-local app code.

Request path:

1. HTTP request enters Hono.
2. CORS and request context middleware run.
3. Better Auth session is resolved.
4. Tenant middleware resolves active membership from `tenantSlug`.
5. Route validates input using Zod schemas from `@pulsi/shared`.
6. Service executes tenant-safe business logic.
7. Repository performs tenant-scoped database access.
8. Response is serialized using shared response contracts.
9. Errors are normalized into a predictable error envelope.

## 3. Monorepo Structure

```text
.
├── docs/
│   └── architecture.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── api/
│   │   ├── .env.example
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── app.ts
│   │       ├── auth/
│   │       ├── context/
│   │       ├── db/
│   │       ├── http/
│   │       ├── integrations/
│   │       ├── repositories/
│   │       ├── routes/
│   │       ├── services/
│   │       └── telemetry/
│   ├── client/
│   │   ├── .env.example
│   │   ├── index.html
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       └── lib/
│   └── shared/
│       └── src/
│           ├── contracts/
│           └── utils/
```

Build boundaries:

- `@pulsi/shared` is imported by both API and client.
- `@pulsi/api` and `@pulsi/client` do not import each other.
- infrastructure code never crosses into `@pulsi/shared`.
- API response schemas are defined once in `@pulsi/shared` and parsed on both sides.

## 4. Package Responsibilities

### `@pulsi/shared`

- Canonical Zod schemas for auth, tenants, readiness, and integrations
- Shared API envelope definitions
- Shared tenant utilities such as cache key construction

### `@pulsi/api`

- Better Auth session handling
- tenant provisioning and membership resolution
- REST API surface
- PostgreSQL persistence with Drizzle
- provider registry, anti-corruption adapters, and sync orchestration
- request-scoped logging and error normalization

### `@pulsi/client`

- route-driven dashboard shell
- TanStack Query data access
- contract-safe parsing of API responses
- coach-facing readiness dashboard composition

## 5. Folder Structure By Package

### `@pulsi/api`

- `src/app.ts`: composition root
- `src/auth/`: Better Auth setup and role authorization helpers
- `src/context/`: request context types
- `src/db/`: Drizzle schema and database client
- `src/http/`: middleware, response helpers, and error types
- `src/integrations/`: provider contracts, registry, and provider-specific adapters
- `src/repositories/`: tenant-safe persistence access
- `src/routes/`: REST resource handlers
- `src/services/`: application use cases
- `src/telemetry/`: logger and metrics interface

### `@pulsi/client`

- `src/app/`: providers, router, styles
- `src/components/`: shared shell components
- `src/features/auth/`: session hooks
- `src/features/tenants/`: active tenant helpers
- `src/features/dashboard/`: readiness dashboard components
- `src/lib/`: API client and QueryClient

### `@pulsi/shared`

- `src/contracts/api.ts`: success and error envelopes
- `src/contracts/auth.ts`: actor session and role schemas
- `src/contracts/tenant.ts`: tenant schemas
- `src/contracts/readiness.ts`: athlete and readiness contracts
- `src/contracts/integrations.ts`: provider connection and sync contracts

## 6. Domain Model

Core entities:

- `Tenant`: a club or organization boundary
- `TenantMembership`: user access to a tenant with role and status
- `Athlete`: player identity scoped to a tenant
- `AthleteDeviceConnection`: provider-specific wearable connection for an athlete
- `WearableDailyMetric`: normalized daily wearable measurements
- `ReadinessSnapshot`: Pulsi’s coach-facing recommendation for a day
- `IntegrationSyncJob`: durable record of pull attempts and retries
- `AuditEvent`: immutable record of sensitive operational actions

Pulsi recommendation model:

- `readinessScore` is a 0-100 score derived from Garmin metrics
- `readinessBand` is `ready`, `caution`, or `restricted`
- `recommendation` is operational guidance such as `full_load` or `recovery_focus`
- `rationale` is an explainability list for coaches

Guardrail:

- recommendations are framed as training guidance only, not diagnosis or treatment

## 7. Database Schema Design

Implemented domain tables live in [schema.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/db/schema.ts).

Tables:

- `tenants`
- `tenant_memberships`
- `athletes`
- `athlete_device_connections`
- `wearable_daily_metrics`
- `readiness_snapshots`
- `integration_sync_jobs`
- `audit_events`

Schema principles:

- all tenant-owned records carry `tenant_id`
- composite uniqueness is tenant-aware
- time-series data is indexed by `tenant_id` plus date
- sync state is durable and queryable for retries
- Garmin credentials are referenced by `credential_key` instead of storing raw tokens in the domain database

Better Auth:

- Better Auth should manage its own auth tables and migrations alongside this schema
- Pulsi domain tables only reference auth users by `user_id` string to keep auth concerns isolated

Recommended migration sequence:

1. generate Better Auth auth tables
2. apply Pulsi domain migrations
3. seed initial tenant and owner membership in non-production environments

## 8. Multi-Tenancy Strategy

Tenant resolution:

- all tenant business endpoints live under `/v1/tenants/:tenantSlug/...`
- middleware resolves `tenantSlug` to an active membership
- request context is updated with `tenant.id`, `tenant.slug`, and role

Data isolation:

- repositories query by `tenantId` for every tenant-owned read and write
- tenant membership lookup is the only path from auth identity to tenant context
- cache keys should include `tenantId`
- logs include `tenantId` and `tenantSlug`
- sync jobs and webhook processing are stored with tenant ownership

Future hardening:

- add PostgreSQL row-level security if Pulsi later introduces SQL consumers outside the API
- use separate Redis namespaces or prefixes per tenant if distributed caching is added

## 9. API Design

Versioning:

- all business endpoints are versioned under `/v1`
- Better Auth endpoints remain under `/api/auth/*`

Response contract:

```json
{
  "data": {},
  "meta": {
    "generatedAt": "2026-03-10T10:00:00.000Z"
  }
}
```

Error contract:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient tenant permissions",
    "requestId": "req_123"
  }
}
```

Example endpoints:

- `GET /v1/health`
- `GET /v1/session`
- `GET /v1/tenants`
- `POST /v1/tenants`
- `GET /v1/tenants/:tenantSlug/athletes`
- `GET /v1/tenants/:tenantSlug/readiness?onDate=2026-03-10&limit=25`
- `POST /v1/tenants/:tenantSlug/integrations/:provider/sync`

Resource naming rules:

- plural nouns for collections
- no verbs in core resource paths
- sync is modeled as an integration action because it initiates a job

## 10. Authentication And Authorization

Implemented in:

- [auth.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/auth/auth.ts)
- [authorization.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/auth/authorization.ts)

Approach:

- Better Auth handles authentication, sessions, cookies, and account lifecycle
- Pulsi owns tenant memberships and role authorization in domain tables
- request middleware resolves the actor session and memberships once per request

Roles:

- `club_owner`: tenant administration and provisioning
- `coach`: training decisions and squad access
- `performance_staff`: readiness operations and provider sync execution
- `analyst`: read-only performance visibility

Permission model:

- authentication gates any non-public route
- tenant membership gates any tenant-scoped route
- minimum role checks happen inside routes or services before execution

## 11. Integration Architecture

Implemented in:

- [provider.types.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/provider.types.ts)
- [provider-registry.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/provider-registry.ts)
- [garmin-client.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin-client.ts)
- [garmin-mapper.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin-mapper.ts)
- [garmin-adapter.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin-adapter.ts)
- [integration-sync-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/integration-sync-service.ts)
- [readiness-engine.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/readiness-engine.ts)

Flow:

1. Pulsi stores an athlete’s provider connection and a secret reference key.
2. `HealthProviderRegistry` resolves the correct adapter for the requested provider.
3. The provider client performs authenticated HTTP requests with retry and backoff.
4. The provider mapper converts vendor payloads into Pulsi’s normalized wearable metric shape.
5. `ReadinessEngine` derives coach-facing guidance from normalized metrics.
6. `IntegrationSyncService` persists normalized metrics, snapshots, and sync job state.

Resilience:

- retryable rate limit handling
- durable sync job records
- explicit connection cursor tracking
- clear split between raw provider payloads and internal readiness logic

Adding a new provider:

1. create `src/integrations/<provider>/` with a client, mapper, and adapter implementing `HealthDataProvider`
2. normalize the provider payload into `NormalizedWearableMetricRecord`
3. register the adapter in [app.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/app.ts)
4. add the provider to `integrationProviderSchema` and the PostgreSQL enum
5. reuse the existing generic sync route and `IntegrationSyncService`

Important note:

- the Garmin adapter path and payload fields in this repository are intentionally illustrative because Garmin feed shapes vary by approved application scope
- the anti-corruption layer is the place to align the final request paths and payload contracts with the exact Garmin Health API specification assigned to Pulsi

## 12. Request Lifecycle

Example: `GET /v1/tenants/acme-fc/readiness`

1. CORS middleware accepts the configured client origin.
2. request context middleware creates `requestId`, logger, and actor state.
3. Better Auth session is resolved from cookies.
4. tenant middleware resolves `acme-fc` membership.
5. query parameters are parsed with `listReadinessQuerySchema`.
6. `ReadinessService` loads athletes and latest snapshots.
7. response is returned as a typed success envelope.
8. any failure is normalized with the request ID for support and tracing.

## 13. Observability Strategy

Current foundation:

- structured JSON logging via Pino
- request IDs on every response
- tenant-aware logger bindings after tenant resolution
- redaction for auth and credential fields

Recommended production additions:

- OpenTelemetry traces around provider API calls and database transactions
- metrics for sync job counts, latency, and failure rates
- error reporting integration for uncaught exceptions and repeated external failures
- dashboarding split by environment and tenant cohort

Log field conventions:

- `requestId`
- `userId`
- `tenantId`
- `tenantSlug`
- `provider`
- `jobId`

## 14. Testing Strategy

Unit tests:

- readiness scoring and recommendation derivation
- role authorization thresholds
- request validation and error mapping
- provider mapper normalization

Integration tests:

- tenant-scoped route access with seeded memberships
- Drizzle repository behavior against a test PostgreSQL database
- Better Auth session resolution and protected route enforcement
- generic integration sync service with mocked provider API responses

Isolation tests:

- ensure one tenant cannot query another tenant’s athletes or readiness snapshots
- ensure sync jobs cannot be triggered for athletes outside the active tenant
- ensure log records and cache keys always carry tenant identity

Contract tests:

- API responses parsed with shared schemas on the client
- provider adapter fixtures pinned to Pulsi’s approved vendor payload examples

## 15. Production-Quality Code Included

Key implementation files:

- API server setup: [app.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/app.ts), [index.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/index.ts)
- tenant-aware request context: [middleware.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/http/middleware.ts)
- Better Auth integration: [auth.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/auth/auth.ts)
- Drizzle schema: [schema.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/db/schema.ts)
- service layer: [readiness-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/readiness-service.ts), [integration-sync-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/integration-sync-service.ts), [readiness-engine.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/readiness-engine.ts)
- provider adapter example: [garmin-adapter.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin-adapter.ts)
- client architecture: [router.tsx](/Users/ea/Desktop/projects/pulsi-app/packages/client/src/app/router.tsx), [api.ts](/Users/ea/Desktop/projects/pulsi-app/packages/client/src/lib/api.ts)

## 16. Example Client Architecture

Client structure is intentionally thin:

- React Router defines tenant-scoped routes
- TanStack Query owns server-state fetching and caching
- shared Zod contracts parse API responses before UI consumption
- tenant slug lives in the route, not global mutable state
- dashboard components are read-only and composition-friendly

Why this shape:

- routing is the natural source of truth for active tenant selection
- query keys become tenant-safe automatically
- shared contracts reduce drift between API and UI

## 17. Future Scalability Considerations

Near-term:

- move provider sync execution to a background worker consuming `integration_sync_jobs`
- add invitation flows and membership management APIs
- expose readiness trend endpoints for weekly planning views
- introduce audit event writes for tenant creation, membership changes, and sync triggers

Mid-term:

- add Redis for idempotency keys, request throttling, and short-lived caches
- partition time-series tables such as `wearable_daily_metrics` by month if volume grows
- support additional wearable providers behind the same integration port
- add webhook ingestion for provider push events and map them into the same sync job flow

Long-term:

- add model versioning for readiness scoring
- split analytics workloads from transactional storage
- consider per-tenant encryption keys for especially sensitive data domains
