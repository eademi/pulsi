# Pulsi Project Core

This is the smallest high-signal reference for understanding Pulsi quickly.

Use this file when you need:

- a compact project mental model
- the important domain entities
- the auth and actor model
- the Garmin integration model
- the key invariants that should not be broken

## 1. Product In One Paragraph

Pulsi is a multi-tenant sports readiness platform for football clubs. Clubs use it to turn wearable and activity data into simple coaching decisions. The system is coach-facing first, but it also supports athlete self-service through separate athlete accounts.

## 2. Monorepo Shape

Pulsi is a pnpm monorepo with three packages:

- `packages/shared`
  - shared Zod schemas and TypeScript contracts
- `packages/api`
  - Hono API, Better Auth, Drizzle/Postgres, Garmin integration, business logic
- `packages/client`
  - React Router frontend, Base UI, Tailwind v4

The simplest mental model:

1. `shared` defines data contracts
2. `api` validates, processes, and stores data
3. `client` fetches and renders data

Typical dependency direction:

1. `client` depends on API contracts from `shared`
2. `api/routes` depend on `services` and `shared`
3. `services` depend on `repositories` and `integrations`
4. `repositories` depend on Drizzle schema and Postgres
5. `integrations` isolate Garmin-specific HTTP/contracts from the rest of the app

## 3. Core Domain

Main domain objects:

- `tenant`
  - a club / organization
- `squad`
  - a team inside a tenant, like Senior or U18
- `athlete`
  - a player record inside a tenant
- `staff_membership`
  - links a staff user to one tenant with a role and squad scope
- `athlete_account`
  - links an athlete user to exactly one athlete profile
- `athlete_invite`
  - invite/setup token used to activate an athlete account
- `athlete_integration`
  - external connection for an athlete, currently Garmin

## 4. Actor Model

Pulsi has two actor types:

- `staff`
- `athlete`

They are intentionally separate.

Staff auth path:

- `user -> staff_memberships`

Athlete auth path:

- `user -> athlete_accounts`

Important rule:

- staff memberships are staff-only
- athlete accounts are athlete-only
- these two access models should never be merged

## 5. Staff Roles

Current staff roles:

- `club_owner`
- `org_admin`
- `coach`
- `performance_staff`
- `analyst`

Capabilities are enforced separately from role names. Roles define what the user can do. Squad scope defines which squads they can do it for.

## 6. Athlete Account Model

Pulsi is moving toward a simpler rule:

- every athlete should end up with a Pulsi account

Operationally, that means:

1. staff creates athlete profile
2. staff sends athlete invite
3. athlete registers/signs in
4. athlete accepts invite
5. `athlete_accounts` link is created

Current athlete account states in product/read models:

- `unlinked`
- `invited`
- `linked`

Current athlete invite states:

- `pending`
- `accepted`
- `revoked`
- `expired`

## 7. Garmin Model

Garmin always belongs to the athlete profile, never to a staff user.

Main Garmin-related tables:

- `athlete_integrations`
- `integration_credentials`
- `integration_webhook_events`
- `integration_health_summaries`
- `integration_activity_summaries`

Important rule:

- Garmin ownership is athlete-scoped

Not:

- tenant-scoped
- staff-user scoped
- generic Better Auth user scoped

## 8. Garmin Flows

Pulsi supports three Garmin connection patterns:

1. Staff-assisted connect
   - staff initiates
   - athlete authenticates with Garmin
   - connection is stored on the athlete profile

2. Athlete self-service connect
   - linked athlete logs into Pulsi
   - athlete starts Garmin connect
   - connection is stored on their athlete profile

3. Public athlete consent flow
   - staff generates Garmin link
   - athlete completes Garmin auth without needing staff UI
   - callback remains public

Garmin data ingestion paths:

- `push`
  - Garmin sends data directly
- `ping`
  - Garmin tells Pulsi where to fetch data
- `backfill`
  - Pulsi requests historical data after onboarding

## 9. Data Pipeline

Pulsi does not present raw Garmin data as the product.

The real pipeline is:

1. Garmin raw payloads arrive or are fetched
2. raw summaries are stored
3. Garmin mapper converts payloads into Pulsi’s normalized metric shape
4. normalized metrics are stored
5. readiness snapshots are computed
6. staff and athlete UIs read Pulsi-native data

Key normalized tables:

- `wearable_daily_metrics`
- `readiness_snapshots`

## 10. Request Lifecycle

The normal staff request path is:

1. request enters Hono in `packages/api/src/app.ts`
2. request context middleware creates `requestId`, logger, and session context
3. auth resolves the Better Auth user
4. actor resolution decides whether the user is `staff` or `athlete`
5. tenant middleware resolves `:tenantSlug` for staff routes
6. route validates input and checks permissions
7. service coordinates repositories and integrations
8. repository persists or reads tenant-scoped data
9. response is returned in a shared API envelope

Short rule:

- route = transport and validation
- service = business logic
- repository = persistence
- integration = external API boundary

## 11. Main Tables To Remember

These are the tables that matter most day to day:

- `user`
  - Better Auth identity for both staff and athletes
- `staff_memberships`
  - staff-to-tenant access with role and squad scope
- `staff_invitations`
  - pending staff access before acceptance
- `squads`
  - team units inside a tenant
- `athletes`
  - player records
- `athlete_accounts`
  - athlete-user-to-athlete-profile link
- `athlete_invites`
  - athlete setup invites
- `athlete_integrations`
  - Garmin and future provider connections for athletes
- `integration_credentials`
  - encrypted tokens for integrations
- `integration_webhook_events`
  - raw provider event archive
- `integration_health_summaries`
  - raw Garmin Health summaries
- `integration_activity_summaries`
  - raw Garmin Activity summaries
- `wearable_daily_metrics`
  - Pulsi-normalized daily wearable signals
- `readiness_snapshots`
  - coach-facing daily readiness outputs

## 12. Route Model

High-level route groups:

- staff product routes
  - `/v1/tenants/:tenantSlug/...`
- athlete routes
  - `/athlete`
  - `/athlete/setup/:token`
  - `/v1/me/athlete/...`
- internal admin routes
  - `/admin/garmin`
  - `/v1/admin/...`
- auth routes
  - `/api/auth/*`
- public Garmin routes
  - `/v1/integrations/garmin/callback`
  - `/v1/webhooks/garmin/...`

Important separation:

- tenant routes are club product routes
- admin routes are Pulsi operator routes

## 13. UI Surfaces

Main frontend surfaces today:

- staff app
  - tenant dashboard
  - squads
  - players
  - Garmin integration
  - organization settings
- athlete app
  - athlete home
  - athlete setup
- internal admin
  - Garmin admin/debug surface

Short rule:

- staff UI is organization-aware
- athlete UI is self-only
- admin UI is Pulsi-operator-only

## 14. Internal Admin

The first internal admin surface is:

- `/admin/garmin`

It is for Pulsi operator/debug use, not tenant use.

Current purpose:

- inspect Garmin config state
- inspect OAuth sessions
- inspect Garmin connections
- inspect webhook events
- inspect sync/backfill jobs
- trigger manual onboarding backfill reruns

## 15. Critical Invariants

These should stay true:

- one user can be either a staff actor or an athlete actor in a given access path
- one active staff user belongs to one tenant
- one athlete belongs to one tenant
- one athlete has at most one active squad assignment
- one athlete has at most one linked athlete account
- one athlete integration belongs to one athlete
- staff data access is tenant-scoped first, squad-scoped second
- athlete data access is self-only

## 16. Naming Rules

Preferred product/runtime language:

- `invite`, not `claim`
- `accepted`, not `claimed` for invite lifecycle
- `linked`, not `claimed` for athlete-account linkage

This naming rule should be used in:

- services
- repositories
- contracts
- UI labels
- docs

## 17. Before Extending Features

Ask these questions first:

1. Is this for staff, athletes, or internal admin?
2. Is this tenant-scoped, athlete-scoped, or platform-scoped?
3. Is this raw integration data, normalized Pulsi data, or a product decision/output?
4. Is this current access state or historical state?

If you answer those four clearly, the correct layer and table choice is usually obvious.

## 18. Where To Start In Code

If you are lost, start here:

- `packages/api/src/app.ts`
- `packages/api/src/db/schema.ts`
- `packages/api/src/http/middleware.ts`
- `packages/api/src/routes/garmin.ts`
- `packages/api/src/services/athlete-account-service.ts`
- `packages/api/src/services/garmin-oauth-service.ts`
- `packages/client/src/routes/players.tsx`
- `packages/client/src/routes/garmin-integration.tsx`
- `packages/client/src/routes/admin-garmin.tsx`

## 19. Closest Companion Docs

Read these next if you need more depth:

- `docs/AGENT_DOCS.md`
- `docs/architecture/AUTH_AND_ACTOR_MODEL.md`
- `docs/LIFECYCLE_STATE_MATRIX.md`
- `docs/DEV_DATABASE.md`
- `docs/TESTING_STRATEGY.md`
- `docs/SYSTEM_DIAGRAMS.md`
- `docs/integrations/GARMIN_INTEGRATION.md`
- `docs/frontend/BASE_UI.md`
