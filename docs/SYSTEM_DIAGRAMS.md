# Pulsi System Diagrams

This document is the fastest way to understand how the main parts of Pulsi fit together.

Use it together with:
- [architecture.md](/Users/ea/Desktop/projects/pulsi-app/docs/architecture.md)
- [AUTH_AND_ACTOR_MODEL.md](/Users/ea/Desktop/projects/pulsi-app/docs/architecture/AUTH_AND_ACTOR_MODEL.md)
- [GARMIN_INTEGRATION.md](/Users/ea/Desktop/projects/pulsi-app/docs/integrations/GARMIN_INTEGRATION.md)

## 1. Big Picture

```mermaid
flowchart LR
  Staff["Staff user<br/>club_owner / org_admin / coach / performance_staff / analyst"]
  AthleteUser["Athlete user<br/>optional Pulsi account"]
  Client["Pulsi client<br/>React Router + Base UI"]
  API["Pulsi API<br/>Hono + Better Auth"]
  DB["PostgreSQL<br/>Drizzle ORM"]
  Garmin["Garmin APIs<br/>OAuth + Health + Activity"]

  Staff --> Client
  AthleteUser --> Client
  Client --> API
  API --> DB
  API --> Garmin
```

## 2. Main Actor Model

Pulsi has two different authenticated actor types.

```mermaid
flowchart TD
  User["Better Auth user"]

  User --> StaffPath["Staff path"]
  User --> AthletePath["Athlete path"]

  StaffPath --> Membership["staff_memberships"]
  Membership --> StaffActor["actorType = staff"]
  StaffActor --> Role["role<br/>club_owner / org_admin / coach / performance_staff / analyst"]
  StaffActor --> Scope["scope<br/>all_squads / assigned_squads"]

  AthletePath --> AthleteLink["athlete_accounts"]
  AthleteLink --> AthleteActor["actorType = athlete"]
  AthleteActor --> AthleteProfile["single athlete profile only"]
```

## 3. Staff vs Athlete Access

```mermaid
flowchart LR
  Staff["Staff account"] --> Tenant["One tenant / organization"]
  Tenant --> Squads["Many squads"]
  Squads --> Athletes["Many athletes"]

  AthleteAccount["Athlete account"] --> AthleteProfile["Exactly one athlete profile"]
  AthleteProfile --> Tenant
  AthleteProfile --> CurrentSquad["Current squad assignment"]
```

Key rule:
- `staff_memberships` are for staff only
- `athlete_accounts` are for athlete logins only

## 4. Organization Structure

```mermaid
flowchart TD
  Tenant["tenant<br/>club / organization"]
  Squad1["squad<br/>Senior"]
  Squad2["squad<br/>U18"]
  Staff["staff_memberships<br/>staff users"]
  Athlete["athletes"]
  Assignment["athlete_squad_assignments"]
  SquadAccess["tenant_user_squad_access"]

  Tenant --> Squad1
  Tenant --> Squad2
  Tenant --> Staff
  Tenant --> Athlete

  Athlete --> Assignment
  Assignment --> Squad1
  Assignment --> Squad2

  Staff --> SquadAccess
  SquadAccess --> Squad1
  SquadAccess --> Squad2
```

## 5. Athlete Lifecycle

Creating an athlete profile does not create a Pulsi user account.

```mermaid
flowchart TD
  Admin["Staff user"] --> CreateAthlete["Create athlete profile"]
  CreateAthlete --> AthleteRecord["athletes row"]
  CreateAthlete --> SquadAssignment["active squad assignment"]

  AthleteRecord --> AthleteInvite["optional athlete_invites"]
  AthleteInvite --> Register["Athlete registers/signs in"]
  Register --> Claim["Claim profile"]
  Claim --> AthleteUserAccount["athlete_accounts row"]
```

Meaning:
- athlete profile first
- athlete login later
- those are intentionally separate steps

## 6. Garmin Connection Model

Garmin is connected to an athlete profile, not to a staff user.

```mermaid
flowchart LR
  Athlete["athlete profile"] --> GarminConnection["athlete_integrations"]
  GarminConnection --> Credentials["integration_credentials"]
  GarminConnection --> Webhooks["integration_webhook_events"]
  GarminConnection --> Metrics["wearable_daily_metrics / summaries"]
```

Important:
- staff can initiate Garmin connect for an athlete
- athlete users can also connect Garmin for themselves
- the saved Garmin connection still belongs to the athlete record

## 7. Garmin OAuth Flow

```mermaid
sequenceDiagram
  participant StaffOrAthlete as Staff or athlete user
  participant Client as Pulsi client
  participant API as Pulsi API
  participant Garmin as Garmin OAuth
  participant DB as PostgreSQL

  StaffOrAthlete->>Client: Click connect Garmin
  Client->>API: Create Garmin connection session
  API->>DB: Store garmin_oauth_session
  API-->>Client: Garmin authorization URL
  Client->>Garmin: Redirect user to Garmin
  Garmin->>API: Callback with code + state
  API->>Garmin: Exchange code for tokens
  API->>Garmin: Fetch Garmin user id + permissions
  API->>DB: Upsert athlete_integration
  API->>DB: Store encrypted integration_credentials
  API-->>Client: Redirect back to staff or athlete surface
```

## 8. Garmin Data Ingestion Flow

```mermaid
flowchart TD
  Garmin["Garmin Health / Activity"]
  Webhook["Pulsi webhook routes"]
  ConnectionService["GarminConnectionService"]
  Mapper["Garmin mapper"]
  RawStore["integration_health_summaries / integration_activity_summaries / webhook events"]
  Normalized["wearable_daily_metrics"]
  Readiness["readiness_snapshots"]

  Garmin --> Webhook
  Webhook --> ConnectionService
  ConnectionService --> Mapper
  Mapper --> RawStore
  Mapper --> Normalized
  Normalized --> Readiness
```

Think of this as:
- Garmin sends raw vendor data
- Pulsi stores it
- Pulsi normalizes it
- Pulsi derives coach-facing readiness

## 9. Request Context Resolution

This is what happens on every authenticated request.

```mermaid
flowchart TD
  Request["Incoming request"] --> Session["Better Auth session"]
  Session --> ResolveActor["actor resolution"]

  ResolveActor -->|has tenant_membership| Staff["staff actor"]
  ResolveActor -->|has athlete_user_account| Athlete["athlete actor"]
  ResolveActor -->|both or neither invalid| Error["reject or redirect"]

  Staff --> TenantContext["tenant context<br/>role + squad scope"]
  Athlete --> AthleteContext["athlete context<br/>own profile only"]
```

## 10. What A Coach Sees vs What An Athlete Sees

```mermaid
flowchart LR
  StaffActor["staff actor"] --> StaffRoutes["tenant routes<br/>dashboard / squads / players / garmin / settings"]
  AthleteActor["athlete actor"] --> AthleteRoutes["athlete routes<br/>/athlete"]

  StaffRoutes --> StaffData["many athletes<br/>filtered by squad scope"]
  AthleteRoutes --> AthleteData["one athlete only"]
```

## 11. Database Identity Rules

```mermaid
erDiagram
  USER ||--o{ TENANT_MEMBERSHIP : "staff membership"
  USER ||--o| ATHLETE_USER_ACCOUNT : "athlete login link"
  TENANT ||--o{ SQUAD : contains
  TENANT ||--o{ ATHLETE : contains
  ATHLETE ||--o{ ATHLETE_SQUAD_ASSIGNMENT : assigned_to
  ATHLETE ||--o| ATHLETE_DEVICE_CONNECTION : "garmin connection"
  ATHLETE ||--o{ ATHLETE_INVITE : "invite flow"
```

Read this carefully:
- a staff user belongs to one tenant through `staff_memberships`
- an athlete login links to one athlete through `athlete_accounts`
- an athlete belongs to one tenant and one active squad at a time
- Garmin links to the athlete, not directly to the user

## 12. Mental Model Summary

If you remember only six things, remember these:

1. `user` is the authentication identity for both staff and athletes.
2. `staff_memberships` are only for staff.
3. `athletes` are domain records, created independently of user accounts.
4. `athlete_accounts` connect a Better Auth user to exactly one athlete profile.
5. Garmin connections are saved on the athlete profile.
6. Staff see organization data; athlete users only see their own data.

## 13. Current Product Flows

### Staff flow

```mermaid
flowchart LR
  Register["Register staff account"] --> Tenant["Create or join tenant"]
  Tenant --> Role["Get role + squad scope"]
  Role --> Manage["Manage squads, players, Garmin, readiness"]
```

### Athlete flow

```mermaid
flowchart LR
  AthleteCreated["Staff creates athlete profile"] --> Invite["Send athlete invite"]
  Invite --> AthleteLogin["Athlete registers / signs in"]
  AthleteLogin --> Claim["Claim athlete profile"]
  Claim --> AthletePortal["Athlete portal + Garmin self-connect"]
```

## 14. Why This Feels Complex

The complexity mostly comes from Pulsi having:
- two actor types
- one shared auth system
- one tenant model for staff
- one athlete domain model for players
- one external identity system for Garmin

That means a single real person can participate in multiple layers:
- Pulsi auth identity
- staff membership or athlete link
- athlete domain profile
- Garmin external account

The diagrams above separate those layers on purpose.
