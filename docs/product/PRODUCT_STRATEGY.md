# Pulsi Product Strategy

This document defines the intended product shape for Pulsi so engineering, product, and architecture decisions stay aligned.

It is meant to answer:

- who Pulsi is for
- what problems it solves
- how different user types should experience the product
- what the next major product phases should be
- what architectural decisions should follow from that strategy

## 1. Product Positioning

Pulsi is a multi-tenant sports readiness platform for football organizations.

Its job is to turn wearable and training data into simple, actionable decisions for coaching and performance staff.

Pulsi is:

- coach-facing decision support
- athlete-aware
- organization-aware
- built around readiness, load context, and squad operations

Pulsi is not:

- a medical product
- a generic athlete social app
- a raw data dashboard with no decision layer

## 2. Core Product Thesis

Clubs do not need more dashboards. They need a system that answers:

- who is ready for full load?
- who needs caution or reduced volume?
- who is trending in the wrong direction?
- which squad needs attention today?
- what changed, and why?

Pulsi should differentiate by taking complex inputs and producing:

- simple decisions
- explainable rationale
- staff coordination workflows

## 3. Product Surfaces

Pulsi should evolve as three connected surfaces.

### A. Staff Operations

Primary product surface.

Users:

- club owner
- main coach
- performance staff
- analyst

Main jobs:

- view readiness by squad
- understand recovery + load context
- identify athletes needing follow-up
- manage squads and players
- manage integrations
- coordinate decisions

### B. Athlete Self-Service

Secondary product surface.

Users:

- athletes / players

Main jobs:

- connect Garmin themselves
- view personal trends
- understand their own recovery signals
- track progress against personal baseline
- set goals and habits

Important rule:

- athlete-facing experience should never mirror coach-facing language directly

### C. Organization Intelligence

Operational oversight surface.

Users:

- club owner
- leadership
- head of performance

Main jobs:

- view adoption and sync coverage
- compare squad-level trends
- identify missing data / weak compliance
- understand where attention is needed across the club

## 4. Actor Model

Pulsi should support two top-level actor types.

### Staff User

Authenticated with Better Auth.

Properties:

- belongs to exactly one organization
- has a staff role
- has organization-level access and potentially squad-scoped visibility

### Athlete User

Authenticated with Better Auth only if athlete self-service is enabled.

Properties:

- linked one-to-one with an athlete record
- can only access their own data
- never gets tenant-wide staff visibility

Important distinction:

- an athlete domain record can exist without an athlete Pulsi account
- athlete account support is a future expansion, not required for the coach product to function

## 5. Domain Model Direction

### Tenant

Represents one club or organization.

### Squad

Represents an internal organizational unit within a tenant.

Examples:

- Senior team
- U21
- U18
- Rehab group

### Athlete

Represents a player record inside a tenant.

Rules:

- belongs to exactly one tenant
- belongs to one active squad at a time
- can change squads over time

### Garmin Connection

Represents a wearable integration tied to an athlete.

Rules:

- Garmin is athlete-scoped, not staff-scoped
- staff may initiate or manage the connection
- athlete may later self-connect if athlete accounts are introduced

## 6. Access Model

Pulsi should separate:

- role
- scope

### Role = what a user can do

Recommended roles:

- `club_owner`
- `coach`
- `performance_staff`
- `analyst`
- later `athlete`

### Scope = which data a user can see

Recommended scopes:

- `all_squads`
- `assigned_squads`
- `self_only` for athlete users

This is better than creating many role variants like:

- `u18_coach`
- `senior_analyst`
- `academy_performance_staff`

Instead:

- role handles capability
- scope handles visibility

## 7. Recommended Permission Rules

### Club Owner

- full organization access
- manage staff
- manage squads
- manage players
- manage integrations
- view all squads

### Coach

- view assigned squads or all squads depending on scope
- view athlete readiness
- view training guidance
- manage player operational data if allowed

### Performance Staff

- view assigned squads or all squads depending on scope
- manage Garmin and performance integrations
- view readiness and recovery detail
- manage athlete monitoring workflows

### Analyst

- read-only or mostly read-only access
- view assigned squads or all squads depending on scope
- no staff management
- no organization-level destructive changes

### Athlete

- self-only visibility
- connect Garmin for own account
- view own trends
- no squad roster visibility
- only anonymous squad comparison if privacy thresholds are met

## 8. Product Principles

Pulsi should follow these product rules:

- keep coach recommendations simple
- keep athlete language supportive
- prefer personal baseline over crude population averages
- avoid medical framing
- every recommendation should be explainable
- privacy must be preserved in athlete comparisons
- squads are first-class, not a text filter

## 9. Staff Product Experience

Core staff workflows should be:

### Daily Readiness

- readiness board by squad
- attention queue
- “why this athlete is flagged”

### Load Context

- combine Garmin Health API and Activity API
- show poor recovery after high load
- show extra sessions outside planned work

### Squad Operations

- create squads
- assign athletes to squads
- move athletes between squads
- filter all views by squad

### Integration Operations

- connect/disconnect athlete Garmin accounts
- self-service athlete consent link
- integration status and sync health

### Staff Coordination

- notes
- decision log
- follow-up flags

## 10. Athlete Product Experience

Athlete-facing Pulsi should not show:

- “restricted”
- “train less because coach says so”
- raw comparative teammate rankings

Athlete-facing Pulsi should show:

- your recovery trend
- your sleep consistency
- your own HRV / recovery pattern vs baseline
- your progress over time
- goals and habits
- Garmin connection and sync status

Good athlete product language:

- stable
- improving
- below your normal range
- consistency improved this week
- recovery trend dipped after high load

## 11. Anonymous Benchmarking Rules

Athlete comparison can be useful, but only with strict controls.

Recommended rules:

- no named peer comparison
- no direct teammate values
- only aggregate or percentile-style feedback
- minimum group size threshold before showing comparison
- default to self-baseline if group is too small

Good examples:

- your sleep consistency is above squad median
- your 4-week recovery trend improved vs your own prior baseline
- your weekly consistency is in the upper third of your squad

Bad examples:

- you ranked 9th out of 11 players
- player X sleeps better than you
- here is the exact HRV of each teammate

## 12. Garmin Strategy

Garmin should remain athlete-scoped.

Pulsi should support two practical connection flows:

### Staff-Assisted Connect

- staff selects athlete
- athlete signs into Garmin on the current device
- Pulsi stores tokens on the athlete connection

### Athlete Consent Link

- staff generates secure authorization link
- athlete opens the link remotely
- athlete authenticates with Garmin
- Pulsi stores tokens on the athlete connection

Later, if athlete Pulsi accounts exist:

- athlete can manage their own Garmin connection directly

## 13. Squad Strategy

Squads should become a first-class operational boundary.

Recommended future tables:

- `squads`
- `athlete_squad_assignments`
- `tenant_user_access_scopes`
- `tenant_user_squad_access`

This allows:

- one organization with many squads
- one athlete with one active squad at a time
- one staff user with scoped access to one or more squads

## 14. Recommended Routes

### Staff Routes

- `/:tenantSlug/dashboard`
- `/:tenantSlug/squads`
- `/:tenantSlug/players`
- `/:tenantSlug/integrations/garmin`
- `/:tenantSlug/settings`

### Athlete Routes

- `/me`
- `/me/recovery`
- `/me/progress`
- `/me/goals`
- `/me/integrations/garmin`

These should be separate surfaces, not mixed into the same navigation.

## 15. Product Roadmap

### Phase 1: Organization Operations

- squads as first-class model
- player management
- squad assignment
- staff role + squad scope
- Garmin integration route for athletes
- improved readiness + activity context

### Phase 2: Athlete Self-Service

- athlete account model
- athlete self-service Garmin connect
- personal dashboard
- personal trend and goal tracking

### Phase 3: Coordination and Intelligence

- notes
- flags
- return-to-play tracking
- organization adoption metrics
- missing data / sync quality insights

### Phase 4: Advanced Decision Support

- predictive insights
- training load planning support
- proactive intervention suggestions

## 16. Architectural Implications

If this strategy is adopted, the codebase should evolve in this order:

1. add squads and athlete-squad assignment model
2. add staff scope model for squads
3. filter all tenant data access by squad scope
4. improve athlete management flows
5. add athlete account linkage model
6. add athlete self-service routes

Do not do athlete accounts first.

Reason:

- squad structure and staff visibility are foundational
- athlete self-service should sit on top of a stable organization model

## 17. Success Metrics

Good product signals:

- Garmin connection completion rate
- percentage of active athletes syncing data
- daily staff usage on readiness workflows
- time from athlete onboarding to first usable insight
- squad coverage completeness
- athlete return rate on self-service dashboard

## 18. Open Strategic Questions

These should be answered before major implementation:

- will athlete self-service be part of the next roadmap or later?
- should athletes ever be able to see anonymous squad comparisons from day one?
- can coaches edit athlete metadata, or should that be restricted?
- should analysts be read-only everywhere?
- should performance staff be able to connect Garmin for all squads or only assigned squads?

## 19. Recommended Next Step

The next product and engineering step should be:

- finalize squads + players + role/scope model

Specifically:

1. define squad entity
2. define athlete-to-squad assignment rules
3. define staff scope model
4. decide which roles can manage players, squads, and Garmin
5. only then implement the schema and routes
