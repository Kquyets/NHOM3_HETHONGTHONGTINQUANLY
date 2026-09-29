# Thanh and Hoàng Demo Scope

## Goal

Deliver one small, reviewable demo on each existing member branch: a minimal property/room database foundation on `thanh`, and a read-only property/room overview using demo data on `hoang_branch`.

## Branch handling

- Use the existing GitHub branches `thanh` and `hoang_branch`; do not create replacement branches.
- Both branches currently share history with `origin/feature/quyet-backend` but point to an older commit. Fast-forward each local branch to `origin/feature/quyet-backend` before making its changes, after verifying the fast-forward is possible.
- Keep each member's work and commit on that member's branch.
- Preserve unrelated working-tree files and local commits.

## Thanh branch: database demo

- Add Drizzle schema for `properties` and `rooms`, using only fields needed for a property list and room occupancy overview.
- Add the initial SQL migration and concise ERD/schema notes.
- Keep foreign keys and basic constraints in PostgreSQL; do not add auth, tenant, contract, meter, invoice, or payment tables in this demo.
- Do not connect to or mutate a real database as part of verification.

## Hoàng branch: UI demo

- Add a simple, responsive property and room overview page using local demo data.
- Show room counts by occupancy state and a small room list so the UI can be reviewed without PostgreSQL or an API.
- Keep the screen read-only; do not add CRUD flows, authentication, charts, or API integration.
- Match the room/property concepts from the demo schema without coupling the UI to database internals.

## Verification

- On `thanh`, run lint, typecheck, and the existing test suite; confirm the migration/schema is present and consistent.
- On `hoang_branch`, run lint, typecheck, tests, and production build.
- Add or update focused checks only where the current project supports them without adding a new test framework.
- Commit each branch's changes separately using the repository's commit conventions.

## Deferred

Real API integration, authentication, full business schema, write flows, and production dashboard analytics remain follow-up work after the team agrees on contracts and requirements.
