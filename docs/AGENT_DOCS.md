# Pulsi Agent Docs

This file is the documentation index optimized for AI agents and automation.

Use only these documents as the canonical markdown context for the repo:

- [PROJECT_CORE.md](/Users/ea/Desktop/projects/pulsi-app/docs/PROJECT_CORE.md)
  - smallest high-signal project map
  - actor model, Garmin model, route model, invariants
- [AUTH_AND_ACTOR_MODEL.md](/Users/ea/Desktop/projects/pulsi-app/docs/architecture/AUTH_AND_ACTOR_MODEL.md)
  - staff vs athlete identity model
  - account linkage rules
- [LIFECYCLE_STATE_MATRIX.md](/Users/ea/Desktop/projects/pulsi-app/docs/LIFECYCLE_STATE_MATRIX.md)
  - athlete, invite, account, and integration lifecycle rules
- [GARMIN_INTEGRATION.md](/Users/ea/Desktop/projects/pulsi-app/docs/integrations/GARMIN_INTEGRATION.md)
  - Garmin OAuth, webhook, backfill, and ingestion behavior
- [BASE_UI.md](/Users/ea/Desktop/projects/pulsi-app/docs/frontend/BASE_UI.md)
  - canonical Base UI usage reference for the client package
- [TESTING_STRATEGY.md](/Users/ea/Desktop/projects/pulsi-app/docs/TESTING_STRATEGY.md)
  - highest-priority test targets and expected test shapes
- [DEV_DATABASE.md](/Users/ea/Desktop/projects/pulsi-app/docs/DEV_DATABASE.md)
  - local DB setup, reset, wipe, and seed workflow

Guidelines:

- Prefer `PROJECT_CORE.md` first.
- Only open deeper docs when the task clearly needs them.
- Treat removed or older architecture/product narrative docs as non-canonical.
- Prefer runtime code over docs if they disagree.
