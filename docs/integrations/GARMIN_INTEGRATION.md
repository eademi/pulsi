# Garmin Integration In Pulsi

## Purpose

This document explains two things:

1. how the Garmin Health API model works based on the approved Garmin documentation in this repository
2. how Pulsi implements that model in code

Primary source documents used for this implementation:

- `docs/Garmin Developer Program_Start_Guide_1.2.pdf`
- `docs/OAuth2PKCE_2.pdf`

## 1. Garmin Health API Model

Garmin’s Health API is a server-to-server integration. The critical implication is that Pulsi must not behave like a normal client-side REST integration where users manually fetch data on demand.

The Garmin docs in this repository define the integration model as:

- the partner application is approved ahead of time
- user consent is collected through Garmin OAuth 2.0 with PKCE
- after consent, Garmin identifies the user with a Garmin API user ID
- data access is permission-based
- data delivery is webhook-driven through PING and PUSH notifications
- ad-hoc data requests are not permitted
- the partner must support deregistration and user permission change callbacks
- the partner must call delete-registration when disconnecting a user

That is why Pulsi does not expose a generic "sync Garmin now" endpoint.

## 2. Garmin OAuth 2.0 PKCE Flow

The OAuth flow described in `OAuth2PKCE_2.pdf` is:

1. generate a `code_verifier`
2. generate a SHA-256 `code_challenge`
3. generate a random `state`
4. redirect the browser to Garmin consent with:
   - `response_type=code`
   - `client_id`
   - `code_challenge`
   - `code_challenge_method=S256`
   - `redirect_uri`
   - `state`
5. Garmin redirects back with `code` and `state`
6. the server exchanges the code for tokens at Garmin’s token endpoint
7. the server later refreshes the access token with the refresh token

The docs also require the partner to:

- fetch the Garmin API user ID after consent
- fetch the user’s granted permissions after consent
- refresh access tokens before they expire
- handle refresh token rotation

## 3. Garmin Data Delivery Model

The start guide states that Garmin delivers data using PING and PUSH mechanics.

Important consequences:

- Pulsi cannot assume a user-triggered pull workflow
- webhook endpoints are part of the core architecture, not an optional extension
- failures must be observable and retryable
- Pulsi needs to preserve raw incoming payloads for debugging and reprocessing

The docs in this repository also state:

- PING notifications are guaranteed for seven days
- the app must define endpoints for deregistration notifications
- the app must define endpoints for user permission change notifications

## 4. Garmin Lifecycle Events Pulsi Must Support

### Consent completion

After the OAuth code exchange, Pulsi must:

- store tokens securely
- call Garmin user ID endpoint
- call Garmin permissions endpoint
- create or update the athlete connection

### Permission changes

Garmin can notify Pulsi when a user changes granted permissions. Pulsi must:

- accept the webhook
- update the stored permission snapshot
- preserve the raw payload for auditing and operations

### Ping notifications

Garmin can notify Pulsi that new summary data is available through Ping notifications containing callback URLs. Pulsi must:

- acknowledge the ping quickly with HTTP `200`
- fetch the callback URLs asynchronously after acknowledging the request
- validate that callback URLs point back to Garmin Health API infrastructure
- process the callback payload through the same ingestion path used for Push

### Deregistration

Garmin can notify Pulsi that a user is deregistered. Pulsi must:

- accept the webhook
- revoke the active local connection
- stop treating the athlete as connected

### Local disconnect

If Pulsi or a tenant user disconnects an athlete, Pulsi must:

- obtain a valid access token
- call Garmin delete-registration endpoint
- revoke the local connection

## 5. Pulsi Implementation Overview

Pulsi implements Garmin across six layers:

### 5.1 Public HTTP Routes

Defined in `packages/api/src/routes/garmin.ts`.

Routes:

- `GET /v1/integrations/garmin/callback`
- `POST /v1/webhooks/garmin/:webhookToken/common/deregistrations`
- `POST /v1/webhooks/garmin/:webhookToken/common/user-permissions`
- `POST /v1/webhooks/garmin/:webhookToken/health/ping`
- `POST /v1/webhooks/garmin/:webhookToken/activity/ping`
- `POST /v1/webhooks/garmin/:webhookToken/health`
- `POST /v1/webhooks/garmin/:webhookToken/activity`

These routes are public because Garmin, not an authenticated browser session, is the caller.

### 5.2 Tenant-Protected HTTP Routes

Also defined in `packages/api/src/routes/garmin.ts`.

Routes:

- `POST /v1/tenants/:tenantSlug/integrations/garmin/connection-sessions`
- `DELETE /v1/tenants/:tenantSlug/integrations/garmin/connections/:athleteId`

These routes require:

- authentication through Better Auth
- active membership in the tenant
- role of `performance_staff` or higher

### 5.3 Garmin API Client

Defined in `packages/api/src/integrations/garmin/garmin-client.ts`.

Responsibilities:

- build the Garmin authorization URL
- exchange authorization code for tokens
- refresh access tokens
- call Garmin user ID endpoint
- call Garmin permissions endpoint
- call Garmin delete-registration endpoint
- fetch and validate Garmin health and activity ping callback URLs
- apply retry and backoff behavior for rate limits and transient failures

Pulsi uses:

- fixed Garmin OAuth domains for consent and token exchange
- `GARMIN_API_BASE_URL` for wellness and activity API endpoints

## 6. PKCE And OAuth Session Handling In Pulsi

PKCE generation lives in `packages/api/src/integrations/garmin/pkce.ts`.

Pulsi generates:

- `state`
- `code_verifier`
- `code_challenge`

Pulsi persists temporary OAuth bootstrap state in `garmin_oauth_sessions`.

Stored fields include:

- tenant ID
- athlete ID
- OAuth `state`
- `code_verifier`
- redirect URI
- expiry
- creating user
- status

Pulsi flow:

1. the tenant user requests a connection session
2. `GarminOAuthService.createAuthorizationSession()` verifies the athlete belongs to the active tenant
3. Pulsi stores the session and returns the Garmin authorization URL
4. Garmin redirects back with `code` and `state`
5. `GarminOAuthService.completeAuthorization()` loads the session by `state`
6. Pulsi exchanges the code for tokens
7. Pulsi fetches Garmin user ID
8. Pulsi fetches Garmin granted permissions
9. Pulsi upserts the local athlete connection
10. Pulsi encrypts and stores the token pair
11. Pulsi schedules an onboarding Health backfill job for the recent configured window

This implementation lives in:

- `packages/api/src/services/garmin-oauth-service.ts`
- `packages/api/src/repositories/garmin-repository.ts`
- `packages/api/src/services/garmin-backfill-service.ts`

## 7. Token Storage And Refresh

Garmin tokens are not stored in plain text.

Pulsi encrypts access and refresh tokens with AES-256-GCM in:

- `packages/api/src/integrations/garmin/token-cipher.ts`

Encrypted values are stored in:

- `integration_credentials`

Stored metadata includes:

- encrypted access token
- encrypted refresh token
- access token expiry
- refresh token expiry
- token type
- scope
- Garmin `jti` when present

Token lifecycle is managed by:

- `packages/api/src/services/garmin-token-service.ts`

Behavior:

- if the access token is still valid, Pulsi decrypts and uses it
- if the access token is near expiry, Pulsi refreshes it
- Pulsi refreshes with a 10-minute buffer, matching Garmin’s guidance to refresh ahead of expiry
- if the refresh token is expired, Pulsi fails explicitly instead of silently operating with stale credentials

## 7.1 Onboarding Backfill

Pulsi automatically starts a Garmin Health backfill after a successful connection.

Purpose:

- avoid an empty day-one dashboard
- populate recent readiness context immediately after onboarding
- reuse the same mapper and ingestion path used by live webhook data

Current behavior:

- always imports the last 30 days
- runs asynchronously after OAuth completion
- creates an `integration_sync_jobs` row
- fetches Garmin Health backfill endpoints for the supported summary families
- stores raw summaries and derives readiness from the mapped subset

Current default:

- last 30 days

## 8. Garmin User Identity And Permission State

Garmin documentation treats the Garmin API user ID as the canonical external user identifier.

Pulsi stores that identifier in:

- `athlete_device_connections.provider_user_id`

This is how Garmin webhook events are matched back to Pulsi athlete connections.

Pulsi also stores the current permission snapshot in:

- `athlete_device_connections.granted_permissions`

And tracks lifecycle timestamps:

- `last_permissions_sync_at`
- `last_permission_change_at`

This is necessary because Garmin permission changes can happen after the initial consent flow.

## 9. Webhook Handling In Pulsi

Pulsi persists raw webhook events in:

- `integration_webhook_events`

Each record captures:

- provider
- tenant ID when known
- connection ID when known
- provider user ID when known
- notification type
- delivery method
- raw payload
- processing status
- last error

This gives Pulsi:

- operational traceability
- failure visibility
- a reprocessing point for future background workers

### 9.1 Deregistration Webhooks

Validated by:

- `packages/api/src/integrations/garmin/garmin.contracts.ts`

Handled by:

- `GarminConnectionService.handleDeregistrations()`

Behavior:

- find active connections by Garmin `userId`
- archive the webhook event
- revoke those local connections
- mark the webhook event as processed or failed

### 9.2 User Permission Change Webhooks

Handled by:

- `GarminConnectionService.handlePermissionChanges()`

Behavior:

- find active connections by Garmin `userId`
- update stored permissions
- record `last_permission_change_at`
- archive the webhook event

### 9.3 Ping Webhooks

Handled by:

- `GarminConnectionService.handleHealthPing()`

Behavior:

- validate the incoming ping payload by summary type
- create a durable ping event record
- return HTTP `200` immediately from the route
- fetch the callback URL asynchronously
- validate that the callback URL is an HTTPS Garmin wellness endpoint
- transform the callback result into the same summary payload shape used by Push
- send the callback result through the standard health ingestion path

### 9.4 Health Data Webhooks

Handled by:

- `GarminConnectionService.handleHealthPush()`

Behavior:

- validate the payload against typed Garmin summary contracts
- let `GarminMapper` extract normalized daily metrics where possible
- store raw webhook events
- ingest normalized metrics through Pulsi core services
- mark the webhook event `processed`, `ignored`, or `failed`

## 10. Metric Normalization And Core Ingestion

Garmin-specific mapping lives in:

- `packages/api/src/integrations/garmin/garmin-mapper.ts`

This mapper translates Garmin payload shapes into Pulsi’s normalized record:

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

Current typed ingestion coverage:

- `dailies`
- `sleeps`
- `hrv`

Other documented Garmin Health API summary types are validated and available as TypeScript/Zod contracts, but are not yet mapped into Pulsi readiness metrics.

After mapping, Pulsi does not stay inside Garmin code.

Provider-neutral ingestion lives in:

- `packages/api/src/services/metric-ingestion-service.ts`

That service is responsible for:

- upserting normalized daily metrics
- deriving readiness using `ReadinessEngine`
- upserting readiness snapshots
- marking the connection as successfully ingested

This split is one of the main architectural decisions that makes future providers easier to add.

## 11. Security Model

Pulsi’s Garmin implementation has the following security controls:

### OAuth security

- PKCE is required
- random `state` is stored and validated
- OAuth sessions are short-lived
- the callback only completes against an existing pending session

### Token security

- tokens are encrypted at rest
- token logic is isolated from route handlers
- only server-side services decrypt or refresh tokens

### Webhook security

- webhook routes require a secret token in the URL path
- invalid webhook tokens are rejected with `403`
- webhook bodies are validated before processing

### Tenant security

- tenant users must be authenticated and authorized for connect/disconnect actions
- the Garmin connection bootstrap validates athlete ownership inside the active tenant
- webhook processing reaches tenant data only through already-existing athlete connections

## 12. Data Model Used By The Garmin Integration

Main Garmin-related tables:

### `garmin_oauth_sessions`

Purpose:

- temporary PKCE bootstrap state between connection start and callback completion

### `athlete_integrations`

Purpose:

- active Garmin connection for an athlete

Important fields:

- provider
- provider user ID
- connection status
- granted permissions
- last permission timestamps
- credential key

### `integration_credentials`

Purpose:

- encrypted token material and token metadata for the connection

### `integration_webhook_events`

Purpose:

- raw webhook archive and processing status store

### `wearable_daily_metrics`

Purpose:

- normalized, provider-independent daily data

### `integration_health_summaries`

Purpose:

- structured storage for every Garmin Health summary type Pulsi receives

Important note:

- this table is broader than the readiness model
- not every stored Garmin summary is currently used in readiness scoring

### `readiness_snapshots`

Purpose:

- Pulsi’s coach-facing readiness output derived from normalized data

## 13. Operational Behavior

### Retries and rate limits

`GarminApiClient` retries transient Garmin failures and honors `retry-after` headers when Garmin returns `429`.

### Failure isolation

Webhook failures are recorded per event instead of being silently swallowed. Token failures and delete-registration failures are surfaced as external service errors.

### Observability

Pulsi logs with request IDs and tenant context. Garmin webhook payloads are also stored in the database with processing status, which provides an operational audit trail even before a separate metrics stack is introduced.

## 14. Current Limitations And Assumptions

There is one explicit limitation in the current implementation:

- the two Garmin PDFs in this repository define the lifecycle, consent, and notification model, but they do not fully enumerate all possible health payload shapes for every Garmin data pillar

As a result:

- Pulsi persists every incoming Garmin webhook event as raw JSON
- `GarminMapper` normalizes common daily-summary style payloads when recognizable
- additional Garmin-approved payload schemas can be added incrementally inside `garmin.contracts.ts` and `garmin-mapper.ts` without changing Pulsi core services

This is intentional. It keeps Pulsi correct on the transport and lifecycle side now, while leaving payload expansion isolated to the Garmin module.

## 15. Why This Design Makes Another Provider Easier To Add

The reusable pattern is:

1. create a provider-specific module under `packages/api/src/integrations/<provider>/`
2. keep all vendor contracts, auth, tokens, and webhook parsing inside that module
3. map vendor payloads into Pulsi’s normalized record shape
4. ingest normalized records through `MetricIngestionService`
5. keep readiness logic and tenant-aware persistence unchanged

In practice, a future provider should copy the Garmin split:

- provider client
- provider contracts
- provider mapper
- provider OAuth or credential service
- provider connection/webhook service
- provider route builder

The important rule is that new providers should extend the anti-corruption boundary, not leak vendor-specific payloads into Pulsi core.
