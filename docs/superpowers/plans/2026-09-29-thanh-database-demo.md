# Thanh Database Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a minimal, testable Drizzle schema and PostgreSQL migration for properties and rooms on the existing `thanh` branch.

**Architecture:** Fast-forward `thanh` to the merged backend foundation, then define two PostgreSQL tables in Drizzle and an equivalent checked-in SQL migration. Keep this demo independent of a live database and document the ERD beside the migration.

**Tech Stack:** Next.js foundation, TypeScript, Drizzle ORM, PostgreSQL 17, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-thanh-hoang-demo.md`

## Global Constraints

- Work on existing branch `thanh`; do not create a replacement.
- Fast-forward from `origin/feature/quyet-backend` only after confirming it is a descendant.
- Include only `properties` and `rooms`; defer auth, tenants, contracts, meters, invoices, and payments.
- Do not connect to or mutate a real database during verification.
- Commit this branch's work separately.

## Review Focus

- A room cannot reference a missing property; test the Drizzle foreign key metadata.
- A property cannot contain duplicate room numbers; test the composite unique constraint.
- Negative rent is invalid; test the check constraint metadata.
- Room states must stay within the three demo values; test the enum values.
- Migration statements must match the schema and PostgreSQL 17 syntax; validate the expected DDL in a focused test without connecting to a database.

---

### Task 1: Add the property and room schema

**Files:**
- Create: `src/lib/database/schema.ts`
- Test: `src/lib/database/schema.test.ts`

**Interfaces:**
- Produces `properties`, `rooms`, and `roomStatus` exports for future backend modules.
- `properties`: UUID primary key, required name, optional address, creation timestamp.
- `rooms`: UUID primary key, property UUID foreign key with cascade delete, room number, nonnegative integer monthly rent, and `vacant | occupied | maintenance` status.
- Room numbers are unique within a property; property ID is indexed for room listing.

- [ ] Add focused Vitest assertions for table names, required columns, allowed room states, foreign key, unique constraint, rent check, and property index.
- [ ] Run `npm test -- src/lib/database/schema.test.ts`; confirm failure before implementation.
- [ ] Define the Drizzle tables and constraints in `src/lib/database/schema.ts`.
- [ ] Run the focused test, `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Commit with `feat: add property and room demo schema`.

### Task 2: Add the initial migration and ERD notes

**Files:**
- Create: `drizzle/0000_property_room_demo.sql`
- Create: `docs/database/property-room-demo.md`
- Test: `src/lib/database/schema.test.ts`

**Interfaces:**
- Migration creates the enum, tables, primary/foreign keys, rent check, composite uniqueness, and room property index from Task 1.
- Notes document the property-to-room one-to-many relationship and mark the model as a demo draft.

- [ ] Extend the schema test to assert required migration statements and constraint names are present.
- [ ] Run the focused test; confirm it fails before adding the migration.
- [ ] Add SQL matching `schema.ts`; do not add an ORM generator dependency or migration runner.
- [ ] Add concise ERD notes and clearly label unmodeled business entities as deferred.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Review the staged diff and commit with `feat: add property room demo migration`.
