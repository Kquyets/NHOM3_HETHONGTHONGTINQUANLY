# Core MVP PostgreSQL schema

This note replaces the earlier property/room-only demo description. Drizzle definitions live in `src/lib/database/schema.ts`, and the initial PostgreSQL DDL is `drizzle/0000_core_schema.sql`.

The schema covers accounts and hashed refresh tokens; owner properties and manager memberships; optional tenant login profiles; rooms; contracts with tenant links; utility-rate history and monthly meter readings; invoices with price snapshots; and multiple payments per invoice.

Room occupancy is derived from an effective contract. Room status records only `ready` or `maintenance`. Money is integer VND. National-ID/CCCD values must be encrypted by the application before persistence. Utility-rate periods are half-open (`[effective_from, effective_to)`) and cannot overlap for one property and utility type.

The schema decisions are documented in [`2026-09-29-thanh-core-database-design.md`](../superpowers/specs/2026-09-29-thanh-core-database-design.md). This migration is an initial, not-yet-integrated schema; this task does not run it against a real database. Authentication endpoints, invoice services, user interface, and payment gateways remain separate work.
