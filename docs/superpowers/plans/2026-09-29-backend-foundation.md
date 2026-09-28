# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a minimal, testable Next.js App Router backend foundation with PostgreSQL/Drizzle wiring and shared API error handling.

**Architecture:** Use Next.js App Router route handlers as the transport layer, with shared config, database, error, and utility modules under `src/`. Connect Drizzle through the standard `pg` driver without defining business tables; run PostgreSQL locally with Docker Compose using local environment values.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL, Drizzle ORM, node-postgres (`pg`), Vitest, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-29-backend-foundation-design.md`

## Global Constraints

- Do not define business tables or migrations until Quyết and Thanh agree on the schema.
- Keep API route handlers thin; do not put business SQL in route files.
- Commit only `.env.example`; ignore real local environment files.
- Use `{ success: true, data, meta? }` for success and `{ success: false, error: { code, message, details } }` for errors.
- Do not implement Auth.js, password flows, token issuance, or auth schema in this Foundation task.
- Keep MongoDB, AI, payment, notification, frontend UI, and deployment integrations out of scope.
- Node.js 20.9 or newer is required by current Next.js App Router docs; this machine has Node.js 24.21.0.

## Review Focus

- Missing `DATABASE_URL` must not break a build that does not access the database; database access must fail with a clear config error. Test in Task 2.
- Malformed database URLs must be rejected before opening a connection. Test in Task 2.
- Unknown errors must return a generic 500 response without leaking the original message or stack. Test in Task 3.
- Environment secrets must not be tracked; `.env.example` must contain names/placeholders only. Verify in Task 2.
- PostgreSQL unavailable during unit tests must not make pure API/config tests flaky. Keep unit tests independent from Docker; verify the container separately in Task 4.

---

### Task 1: Create the API-only Next.js App Router shell

**Files:**
- Create: `package.json`, `package-lock.json`
- Create: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `next-env.d.ts`
- Modify: `.gitignore`
- Create: `src/app/layout.tsx`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck`, and `test`; a minimal App Router root layout with no frontend page/UI.

- [ ] Create a minimal Next.js TypeScript package manifest and install the current stable Next.js, React, TypeScript, ESLint, and Vitest packages. Keep the package manager as npm.
- [ ] Add the App Router root layout only; do not add a frontend page or business API endpoint.
- [ ] Add scripts: `dev` → `next dev`, `build` → `next build`, `start` → `next start`, `lint` → `eslint .`, `typecheck` → `tsc --noEmit`, and `test` → `vitest run`.
- [ ] Ignore `.env*` and allowlist `.env.example`; preserve existing ignore rules.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Commit only these task files with `chore: scaffold Next.js API foundation`.

### Task 2: Add local PostgreSQL and lazy Drizzle connection configuration

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `src/config/env.ts`
- Create: `src/lib/database/client.ts`
- Create: `src/scripts/check-database.ts`
- Test: `src/config/env.test.ts`
- Modify: `package.json`, `package-lock.json`, `.gitignore`

**Interfaces:**
- Produces: `getDatabaseUrl(env = process.env): string`, which validates and returns `DATABASE_URL` or throws a non-secret configuration error.
- Produces: lazy `getDatabase()` in `src/lib/database/client.ts`, which creates/returns the Drizzle database using `pg.Pool` only when called; it does not connect during module import.
- Produces: npm script `db:check`, which runs a read-only `select 1` and closes the pool.

- [ ] Write Vitest cases for missing, malformed, and valid `DATABASE_URL` values; verify diagnostics never include credentials.
- [ ] Run `npm test -- src/config/env.test.ts` and confirm the new cases fail before implementing `getDatabaseUrl`.
- [ ] Implement `getDatabaseUrl` using the WHATWG URL parser and require the `postgres:` or `postgresql:` protocol plus a host and database path.
- [ ] Install `drizzle-orm`, `pg`, `tsx`, and development type package `@types/pg`; do not add `drizzle-kit` or a schema/migration file before schema agreement.
- [ ] Implement the lazy `getDatabase()` factory with one cached pool and Drizzle instance; export a pool shutdown helper for scripts/tests.
- [ ] Implement `src/scripts/check-database.ts` to execute `select 1` through `getDatabase()` and close the pool in `finally`; add npm script `db:check` using `tsx`.
- [ ] Add PostgreSQL service `postgres:17-alpine` to Compose with named volume, health check, and required `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` environment substitutions. Do not hard-code credentials.
- [ ] Add `.env.example` with empty placeholders for `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `DATABASE_URL`; do not create or stage `.env.local`.
- [ ] Verify `.env.example` contains placeholders only and `git check-ignore .env.local` reports the local env file as ignored.
- [ ] Run the focused config test, then `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Commit only task files with `feat: configure local PostgreSQL and Drizzle`.

### Task 3: Add the shared API response and error layer

**Files:**
- Create: `src/types/api.ts`
- Create: `src/errors/app-error.ts`
- Create: `src/utils/api-response.ts`
- Test: `src/utils/api-response.test.ts`

**Interfaces:**
- Produces: `successResponse<T>(data: T, options?: { status?: 200 | 201; meta?: Record<string, unknown> }): Response`.
- Produces: `AppError(code, message, details = [])` with codes `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_ERROR`, `DATABASE_ERROR`, and `INTERNAL_SERVER_ERROR`; HTTP status is mapped centrally from the code.
- Produces: `errorResponse(error: unknown, production = process.env.NODE_ENV === 'production'): Response`.

- [ ] Write tests for success response shape/status, known `AppError` mapping/details, and unknown error handling in production.
- [ ] Run `npm test -- src/utils/api-response.test.ts` and confirm the new tests fail before implementation.
- [ ] Implement response helpers with JSON content type and README-compatible envelopes; success defaults to status 200 and permits status 201 for created resources.
- [ ] Ensure production unknown errors return generic `INTERNAL_SERVER_ERROR` text and never include the original message or stack; keep detailed server-side logging out of response bodies.
- [ ] Run focused tests, then `npm run lint`, `npm run typecheck`, and `npm test`.
- [ ] Commit only task files with `feat: add shared API response and error handling`.

### Task 4: Document local setup and verify the foundation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents: npm setup/run/check commands, copying `.env.example` to `.env.local`, starting PostgreSQL with Compose using the local env file, and the fact that authentication/schema are separate follow-up tasks.

- [ ] Update the project run section with only verified commands and the current Foundation scope; do not replace unrelated README content.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Run `docker compose --env-file .env.local config` and `docker compose --env-file .env.local up -d postgres` when Docker CLI is available; wait for the PostgreSQL health check, then run `npm run db:check` to verify Drizzle can run `select 1` without creating schema.
- [ ] If Docker CLI remains unavailable, record that container/database connectivity could not be verified and do not claim it passed.
- [ ] Commit only README changes with `docs: document backend foundation setup`.

## References

- Next.js App Router installation and TypeScript: https://nextjs.org/docs/app/getting-started/installation
- Drizzle PostgreSQL drivers and node-postgres connection: https://orm.drizzle.team/docs/get-started-postgresql
