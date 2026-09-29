# Thanh Core Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Thanh's property/room demo with the approved PostgreSQL/Drizzle rental Core MVP schema, including account and refresh-token persistence.

**Architecture:** Keep all Drizzle table definitions in the existing `src/lib/database/schema.ts`, with PostgreSQL constraints expressing domain invariants. Replace the unintegrated initial demo SQL migration with a matching complete initial migration; keep auth endpoints and business logic out of this database task.

**Tech Stack:** TypeScript, Drizzle ORM 0.45, PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-thanh-core-database-design.md`

## Global Constraints

- PostgreSQL remains the source of truth; Drizzle is the schema/migration interface.
- Sign-in uses REST Bearer access and refresh tokens. Persist only a hash of each refresh token; access tokens are not persisted.
- Global account roles are `owner`, `manager`, and `tenant`; manager access is per property.
- Room operational status is `ready` or `maintenance`; occupancy is derived from effective contracts.
- Store all currency as integer VND amounts.
- Persist national-ID/CCCD only as application-encrypted ciphertext.
- Enforce relationships and invariants with PostgreSQL foreign keys, unique constraints, and checks.
- Do not run a migration against a real database in this task.

## Review Focus

- Duplicate normalized emails or tenant links → tests assert unique constraints in Task 1.
- Refresh-token replacement or revocation linkage to a missing row → tests assert nullable self-FK and unique token hash in Task 1.
- Two effective contracts assigned to one room → tests assert partial active-contract uniqueness and valid date checks in Task 2.
- Overlapping utility-rate windows or decreasing meter readings → tests assert exclusion/index/check definitions in Task 3.
- Duplicate invoice period, duplicate meter billing, negative amounts, or partial payments → tests assert period/reference uniqueness and nonnegative/positive checks in Task 4.

---

### Task 1: Accounts, access, properties, and rooms

**Files:**
- Modify: `src/lib/database/schema.ts`
- Test: `src/lib/database/schema.test.ts`
- Replace: `drizzle/0000_property_room_demo.sql` with `drizzle/0000_core_schema.sql`

**Interfaces:**
- Produces Drizzle exports `users`, `refreshTokens`, `properties`, `propertyMembers`, `tenants`, `rooms`, and enums for `user_role` and `room_status`.
- Account roles are `owner | manager | tenant`; room operational states are `ready | maintenance`.

- [ ] Add schema metadata tests for account role/status enums, normalized unique email, password hash, refresh-token hash/expiry/revocation/replacement FK, one-to-one optional tenant link, owner FK, unique manager membership, property-local room number, and nonnegative room rent.
- [ ] Run the focused schema test and confirm it fails for the missing definitions/constraints.
- [ ] Define the listed tables and constraints in `schema.ts`; keep national ID as ciphertext-only field and refresh tokens hash-only.
- [ ] Add matching initial SQL DDL for this table group, replacing the old `room_status` demo enum with `ready` and `maintenance`.
- [ ] Run the focused test and confirm it passes; commit this task.

### Task 2: Contracts and tenants

**Files:**
- Modify: `src/lib/database/schema.ts`
- Test: `src/lib/database/schema.test.ts`
- Modify: `drizzle/0000_core_schema.sql`

**Interfaces:**
- Produces Drizzle exports `contracts` and `contractTenants`.
- Contracts refer to one room; `contract_tenants` allows multiple tenant profiles per contract.

- [ ] Add tests for contract lifecycle/status, rent/deposit snapshots, valid date bounds, unique tenant association, and at most one active contract per room.
- [ ] Run the focused tests and confirm the new cases fail before implementation.
- [ ] Add Drizzle tables and PostgreSQL DDL; use a PostgreSQL partial unique index for active contracts and a check for end date after start date.
- [ ] Run the focused schema tests; commit this task.

### Task 3: Utility rates and monthly readings

**Files:**
- Modify: `src/lib/database/schema.ts`
- Test: `src/lib/database/schema.test.ts`
- Modify: `drizzle/0000_core_schema.sql`

**Interfaces:**
- Produces Drizzle exports `utilityRates`, `meterReadings`, and enum `utility_type` (`electricity | water`).

- [ ] Add tests for utility rate effective dates/amount, non-overlapping property-and-utility rate windows, one room/type/month reading, nonnegative readings, monotonic current reading, rate FK, and rate-price snapshot.
- [ ] Run focused tests and confirm the new cases fail before implementation.
- [ ] Add Drizzle definitions and matching SQL. Enforce non-overlap with a PostgreSQL exclusion constraint on a date range per property and utility type; add any required PostgreSQL range support directly in the migration.
- [ ] Run focused schema tests; commit this task.

### Task 4: Invoices, line items, and payments

**Files:**
- Modify: `src/lib/database/schema.ts`
- Test: `src/lib/database/schema.test.ts`
- Modify: `drizzle/0000_core_schema.sql`

**Interfaces:**
- Produces Drizzle exports `invoices`, `invoiceItems`, `payments`, plus enums for invoice status, invoice item type, and payment method.
- Amounts are integer VND; invoice balance is derived from payment rows; overdue is derived from due date and balance.

- [ ] Add tests for one invoice per contract/period, invoice lifecycle, line-item snapshots and amounts, a meter reading billed at most once, and positive payment amounts with multiple payments per invoice.
- [ ] Run focused tests and confirm the new cases fail before implementation.
- [ ] Define billing/payment tables, foreign keys, uniqueness, amount/date checks, and matching SQL DDL. Do not add gateway/refund tables.
- [ ] Run focused schema tests; commit this task.

### Task 5: Migration parity, documentation, and repository verification

**Files:**
- Modify: `src/lib/database/schema.test.ts`
- Modify: `docs/database/property-room-demo.md`
- Verify: `src/lib/database/schema.ts`, `drizzle/0000_core_schema.sql`

**Interfaces:**
- Schema test verifies the initial SQL migration includes every modeled table and the schema's named enums, unique constraints, checks, indexes, and foreign-key policies.
- Database note points readers to the Core schema spec and states that the initial migration is not run against a real database here.

- [ ] Extend migration parity tests to cover all tables, named constraints, checks, indexes, and enum values from the Drizzle schema.
- [ ] Update the obsolete property/room-only database note to describe the full approved schema and link the spec.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`; fix any failures and rerun affected checks.
- [ ] Inspect the final diff to confirm no auth endpoints, UI, seed credentials, external payment integrations, environment secrets, or real DB changes were introduced; commit final parity/docs changes.
