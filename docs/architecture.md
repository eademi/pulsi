# Pulsi Architecture

## 1. Executive Summary

Pulsi is a multi-tenant sports readiness platform built as a pnpm monorepo with three packages:

- `@pulsi/shared` for shared contracts and schemas
- `@pulsi/api` for authentication, tenancy, persistence, Garmin integration, and readiness logic
- `@pulsi/client` for the coach-facing web application

The backend follows a pragmatic layered architecture:

- transport: Hono routes, Zod validation, and response envelopes
- application: service classes orchestrating use cases
- domain core: readiness scoring plus normalized wearable metrics
- infrastructure: Drizzle, PostgreSQL, Better Auth, Garmin HTTP client, and token storage

The key design choice is that vendor-specific behavior stays inside a provider module while Pulsi core only works with normalized data. That is what makes future providers straightforward to add without leaking Garmin concepts into the rest of the system.

## 2. System Architecture Overview

Dependency direction:

1. `routes` depend on `services` and shared contracts
2. `services` depend on repositories and provider-specific integration code
3. `repositories` depend on Drizzle schema and the database client
4. provider modules depend on external APIs and map vendor payloads into Pulsi’s normalized model
5. `@pulsi/shared` depends on no package-local application code

Current request shapes:

- authenticated tenant routes live under `/v1/tenants/:tenantSlug/*`
- public Garmin callback and webhook routes live under `/v1/*`
- Better Auth routes live under `/api/auth/*`

Garmin is intentionally modeled as:

- OAuth connection bootstrap
- server-to-server webhook delivery
- normalized metric ingestion
- coach-facing readiness derivation

It is not modeled as an on-demand pull sync because Garmin’s Health API docs explicitly disallow ad-hoc data retrieval.

## 3. Monorepo Structure

```text
.
├── docs/
│   ├── architecture.md
│   ├── architecture/
│   └── integrations/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── packages/
    ├── api/
    │   ├── .env.example
    │   ├── drizzle.config.ts
    │   └── src/
    │       ├── app.ts
    │       ├── auth/
    │       ├── context/
    │       ├── db/
    │       ├── http/
    │       ├── integrations/
    │       ├── repositories/
    │       ├── routes/
    │       ├── services/
    │       └── telemetry/
    ├── client/
    │   ├── .env.example
    │   └── src/
    │       ├── app/
    │       ├── components/
    │       ├── features/
    │       └── lib/
    └── shared/
        └── src/
            ├── contracts/
            └── utils/
```

Build boundaries:

- `@pulsi/shared` is the only shared dependency between API and client
- `@pulsi/api` and `@pulsi/client` do not import each other
- provider-specific code lives only in `@pulsi/api`
- shared contracts define request and response shapes once

## 4. Package Responsibilities

### `@pulsi/shared`

- API success and error envelopes
- auth, tenant, readiness, and integration schemas
- canonical Zod contracts used by both API and client

### `@pulsi/api`

- Better Auth integration
- tenant membership resolution
- Garmin PKCE flow and token lifecycle
- Garmin webhook ingestion
- normalized metric persistence
- readiness derivation and REST resources

### `@pulsi/client`

- React Router application shell
- TanStack Query data access
- Base UI primitives for the dashboard
- contract-safe parsing of API responses

## 5. Folder Structure By Package

### `@pulsi/api`

- `src/app.ts`: composition root
- `src/auth/`: Better Auth setup and role helpers
- `src/context/`: request context types
- `src/db/`: Drizzle schema and DB client
- `src/http/`: middleware, errors, and response helpers
- `src/integrations/garmin/`: Garmin contracts, PKCE, client, mapper, and token cipher
- `src/repositories/`: tenant-safe persistence access
- `src/routes/`: resource and webhook route builders
- `src/services/`: application services
- `src/telemetry/`: structured logging

### `@pulsi/client`

- `src/app/`: router, app providers, and styles
- `src/components/`: shared UI pieces
- `src/features/dashboard/`: readiness dashboard
- `src/lib/`: API client and query configuration

### `@pulsi/shared`

- `src/contracts/api.ts`: envelopes
- `src/contracts/auth.ts`: session contracts
- `src/contracts/tenant.ts`: tenant contracts
- `src/contracts/readiness.ts`: athlete and readiness contracts
- `src/contracts/integrations.ts`: Garmin connection contracts

## 6. Domain Model

Core entities:

- `Tenant`: club or organization boundary
- `TenantMembership`: user access to a tenant with role and status
- `Athlete`: player identity scoped to a tenant
- `GarminOauthSession`: short-lived PKCE bootstrap record
- `AthleteDeviceConnection`: active provider connection for an athlete
- `ProviderCredential`: encrypted access and refresh tokens for a connection
- `ProviderWebhookEvent`: durable record of inbound provider notifications
- `WearableDailyMetric`: normalized daily wearable data
- `ReadinessSnapshot`: coach-facing recommendation for a day
- `IntegrationSyncJob`: reserved for future asynchronous provider workflows
- `AuditEvent`: immutable operational trail

Pulsi recommendation model:

- `readinessScore`: numeric score from normalized signals
- `readinessBand`: `ready`, `caution`, or `restricted`
- `recommendation`: operational training guidance
- `rationale`: human-readable explanation for coaches

Guardrail:

- readiness output is framed as coaching support, not diagnosis or treatment

## 7. Database Schema Design

Implemented in [schema.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/db/schema.ts).

Main tables:

- `tenants`
- `tenant_memberships`
- `athletes`
- `garmin_oauth_sessions`
- `athlete_device_connections`
- `provider_credentials`
- `provider_webhook_events`
- `wearable_daily_metrics`
- `readiness_snapshots`
- `integration_sync_jobs`
- `audit_events`

Important Garmin fields:

- `athlete_device_connections.provider_user_id`: Garmin API user ID
- `athlete_device_connections.granted_permissions`: last known Garmin permission set
- `athlete_device_connections.last_permissions_sync_at`: last successful permissions fetch
- `athlete_device_connections.last_permission_change_at`: timestamp from Garmin permission webhooks
- `provider_credentials.*`: encrypted token material and expiry metadata
- `provider_webhook_events`: raw webhook payload archive plus processing status

Schema principles:

- tenant-owned records carry `tenant_id`
- tenant-aware indexes exist on operationally hot paths
- normalized metrics stay separate from raw webhook event storage
- provider credentials are isolated from domain rows
- webhook events are durable so failures are observable and reprocessable

## 8. Multi-Tenancy Strategy

Tenant resolution:

- authenticated business endpoints are always tenant-scoped by URL
- middleware resolves `tenantSlug` to an active membership before route logic runs
- request context is enriched with `tenantId`, `tenantSlug`, and role

Isolation controls:

- repositories read and write with tenant filters
- request context carries tenant state through the service layer
- logs are rebound with tenant metadata after membership resolution
- Garmin connection bootstrap now verifies that the requested athlete belongs to the active tenant before an OAuth session is created
- webhook processing resolves active connections from Garmin `providerUserId` and writes metrics only through tenant-owned connections

Future hardening:

- add composite tenant ownership foreign keys for tenant-owned child tables
- add row-level security if non-API SQL consumers are introduced
- keep cache keys and job queues tenant-prefixed

## 9. API Design

Versioning:

- all domain endpoints are under `/v1`
- Better Auth stays under `/api/auth/*`

Success envelope:

```json
{
  "data": {},
  "meta": {
    "generatedAt": "2026-03-10T10:00:00.000Z"
  }
}
```

Error envelope:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient tenant permissions",
    "requestId": "req_123"
  }
}
```

Implemented endpoint examples:

- `GET /v1/health`
- `GET /v1/session`
- `GET /v1/tenants`
- `POST /v1/tenants`
- `GET /v1/tenants/:tenantSlug/athletes`
- `GET /v1/tenants/:tenantSlug/readiness`
- `GET /v1/tenants/:tenantSlug/athletes/:athleteId/activities`
- `POST /v1/tenants/:tenantSlug/integrations/garmin/connection-sessions`
- `DELETE /v1/tenants/:tenantSlug/integrations/garmin/connections/:athleteId`
- `GET /v1/integrations/garmin/callback`
- `POST /v1/webhooks/garmin/:webhookToken/health/ping`
- `POST /v1/webhooks/garmin/:webhookToken/activity/ping`
- `POST /v1/webhooks/garmin/:webhookToken/common/deregistrations`
- `POST /v1/webhooks/garmin/:webhookToken/common/user-permissions`
- `POST /v1/webhooks/garmin/:webhookToken/health`
- `POST /v1/webhooks/garmin/:webhookToken/activity`

Design rules:

- collections use plural nouns
- provider bootstrap and disconnect actions live under the integration resource
- public provider callbacks stay outside tenant-scoped routing because the provider, not the user browser session, is the caller

## 10. Authentication And Authorization

Implemented in:

- [auth.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/auth/auth.ts)
- [authorization.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/auth/authorization.ts)

Approach:

- Better Auth manages identity, session cookies, and auth persistence
- Better Auth persistence lives in the `user`, `session`, `account`, and `verification` tables
- Pulsi manages tenant memberships and application roles
- tenant membership is linked through `tenant_memberships.user_id -> user.id`
- request context resolves the actor once, then tenant scope is applied on top

Roles:

- `club_owner`
- `coach`
- `performance_staff`
- `analyst`

Garmin permissions:

- only `performance_staff` and above can start or disconnect a Garmin connection
- webhook routes are public from an auth perspective but protected by a shared webhook token

## 11. External Provider Architecture

Pulsi’s future provider model is intentionally split into two layers:

Provider-specific layer:

- vendor HTTP client
- vendor contracts and payload validation
- auth or token lifecycle
- vendor-specific webhook handling
- mapping vendor payloads into normalized records

Provider-neutral core:

- `NormalizedWearableMetricRecord`
- `MetricIngestionService`
- `IntegrationRepository`
- `ReadinessEngine`
- shared response and request contracts

That boundary is the pattern to follow for another provider. A new provider should add its own module under `src/integrations/<provider>/` and should feed normalized records into `MetricIngestionService` instead of bypassing the core.

## 12. Garmin Integration Architecture

Implemented in:

- [garmin-client.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin-client.ts)
- [garmin.contracts.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin.contracts.ts)
- [pkce.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/pkce.ts)
- [token-cipher.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/token-cipher.ts)
- [garmin-mapper.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/integrations/garmin/garmin-mapper.ts)
- [garmin-oauth-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/garmin-oauth-service.ts)
- [garmin-token-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/garmin-token-service.ts)
- [garmin-connection-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/garmin-connection-service.ts)
- [metric-ingestion-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/metric-ingestion-service.ts)
- [garmin.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/routes/garmin.ts)

Runtime flow:

1. A tenant user creates a Garmin connection session for an athlete.
2. Pulsi generates PKCE material and stores a short-lived `garmin_oauth_sessions` record.
3. The browser is redirected to Garmin consent.
4. Garmin calls back with `code` and `state`.
5. Pulsi exchanges the code for tokens, fetches Garmin user ID, and fetches granted permissions.
6. Pulsi upserts the athlete connection and encrypted provider credentials.
7. Garmin later sends webhook notifications for health data, deregistration, or permission changes.
8. Garmin can also send Ping notifications containing callback URLs for typed summary retrieval.
9. Garmin webhook payloads are validated and archived in `provider_webhook_events`.
10. Push payloads and Ping callback payloads are normalized by `GarminMapper` and ingested through `MetricIngestionService`.
11. `ReadinessEngine` produces coach-facing readiness guidance from normalized metrics.

Key decisions:

- Garmin stays behind an anti-corruption layer
- the core readiness model never depends on Garmin field names
- token refresh happens automatically inside `GarminTokenService`
- disconnect explicitly calls Garmin delete-registration before revoking the local connection

## 13. Request Lifecycle

Example: `POST /v1/tenants/acme-fc/integrations/garmin/connection-sessions`

1. CORS middleware validates the origin.
2. request context middleware creates `requestId`, logger bindings, and actor state.
3. Better Auth resolves the session cookie.
4. tenant middleware resolves the active membership for `acme-fc`.
5. the route validates the request body with a shared Zod schema.
6. role authorization checks `performance_staff` or above.
7. `GarminOAuthService` verifies the athlete belongs to the current tenant.
8. an OAuth bootstrap session is persisted and the authorization URL is returned.
9. the response is serialized as a typed success envelope.

Example: `POST /v1/webhooks/garmin/:webhookToken/health`

1. the webhook token is validated
2. the JSON body is parsed
3. `GarminMapper` extracts normalized metrics where possible
4. Pulsi creates a durable webhook event record
5. normalized metrics are persisted and scored
6. webhook status is marked `processed`, `ignored`, or `failed`

## 14. Observability Strategy

Current foundation:

- structured JSON logs via Pino
- per-request `requestId`
- tenant-aware log bindings after membership resolution
- error normalization that includes the request ID
- durable webhook event status tracking in the database

Recommended production additions:

- OpenTelemetry traces around Garmin token exchange and webhook ingestion
- metrics for webhook throughput, failure count, token refresh count, and readiness ingestion latency
- alerting on repeated webhook failures, token refresh failures, or permission revocations
- dashboard slices by provider and tenant cohort

Useful log fields:

- `requestId`
- `userId`
- `tenantId`
- `tenantSlug`
- `provider`
- `providerUserId`
- `webhookEventId`

## 15. Testing Strategy

Unit tests:

- PKCE generation
- token encryption and decryption
- Garmin response validation
- Garmin mapper normalization
- readiness scoring rules
- role authorization thresholds

Integration tests:

- tenant-scoped route authorization
- Garmin connection session creation for valid and invalid athlete ownership
- OAuth callback completion with mocked Garmin endpoints
- disconnect flow calling Garmin delete-registration
- webhook processing for health, deregistration, and permission changes

Isolation tests:

- a user from tenant A cannot create a Garmin connection for an athlete in tenant B
- webhook processing only updates connections matching the Garmin `providerUserId`
- readiness queries only return athletes from the active tenant

Contract tests:

- API responses parsed with shared Zod schemas on the client
- fixed Garmin payload fixtures parsed by `garmin.contracts.ts`

## 16. Production-Quality Code Included

Key implementation files:

- API composition: [app.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/app.ts)
- server bootstrap: [index.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/index.ts)
- tenant-aware request context: [middleware.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/http/middleware.ts)
- Better Auth setup: [auth.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/auth/auth.ts)
- Drizzle schema: [schema.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/db/schema.ts)
- Garmin routes: [garmin.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/routes/garmin.ts)
- Garmin OAuth flow: [garmin-oauth-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/garmin-oauth-service.ts)
- token lifecycle: [garmin-token-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/garmin-token-service.ts)
- provider-neutral ingestion: [metric-ingestion-service.ts](/Users/ea/Desktop/projects/pulsi-app/packages/api/src/services/metric-ingestion-service.ts)
- client router: [router.tsx](/Users/ea/Desktop/projects/pulsi-app/packages/client/src/app/router.tsx)
- client API access: [api.ts](/Users/ea/Desktop/projects/pulsi-app/packages/client/src/lib/api.ts)

## 17. Future Scalability Considerations

Near-term:

- move webhook processing to a worker queue for higher throughput and safer retries
- add audit event writes for Garmin connect, disconnect, permission changes, and deregistrations
- add idempotency keys if Garmin payloads expose stable event identifiers

Mid-term:

- add another provider by copying the Garmin module shape, not by modifying core readiness logic
- split provider credentials into a dedicated secrets store or KMS-backed envelope encryption
- add background reconciliation jobs for providers that support polling or replay windows

Long-term:

- version readiness models
- partition large time-series tables
- move analytics workloads off the transactional database
- add stronger database-level tenant ownership constraints across all tenant-owned child tables
