# Pulsi Testing Strategy

Pulsi currently needs targeted tests around business-critical behavior more than broad coverage.

The near-term goal is to lock down the failure-prone areas:

- authentication and session redirect behavior
- tenant isolation and role authorization
- invitation acceptance and membership assignment
- Garmin payload validation and mapping
- readiness score derivation from normalized metrics

## Priority 1

These should always have tests before significant refactors:

- `packages/api/src/auth/authorization.ts`
- `packages/api/src/services/tenant-service.ts`
- `packages/api/src/http/middleware.ts`
- `packages/api/src/integrations/garmin/garmin-mapper.ts`
- `packages/api/src/services/metric-ingestion-service.ts`
- `packages/client/src/lib/session.ts`

## Priority 2

These should be added next as integration-style tests:

- tenant-scoped API route tests for `403` / `404` access boundaries
- Garmin webhook route tests for push and ping payload validation
- Better Auth session route tests
- invitation and tenant creation UI flows

## Suggested Test Types

Use unit tests for:

- pure helpers
- role checks
- mapping logic
- invitation business rules

Use integration tests for:

- route + service + repository flows
- tenant isolation guarantees
- webhook ingestion paths
- database persistence rules

## Current Baseline

The first test pass now covers:

- role authorization
- tenant invitation business rules
- client session redirect helpers

Run them with:

- `pnpm test`
- `pnpm test:api`
- `pnpm test:client`
