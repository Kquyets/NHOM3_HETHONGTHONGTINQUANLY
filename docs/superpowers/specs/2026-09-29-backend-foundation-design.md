# Backend Foundation Design

## Goal

Prepare the repository for the Core MVP backend using the agreed Next.js App Router, PostgreSQL, Drizzle, and Auth.js direction. Keep the initial setup local-first and low-cost. Do not implement business modules or invent a database schema owned by the Database Developer.

## Agreed scope

- Scaffold a TypeScript Next.js App Router application in `src/`.
- Keep API route handlers thin and place module logic under `src/modules/` as modules are added.
- Add shared configuration, database, error, utility, type, and validation boundaries only where they have a concrete responsibility.
- Configure Drizzle to connect to PostgreSQL. Do not define business tables or migrations until Quyết and Thanh agree on the schema.
- Provide a local PostgreSQL Docker Compose service whose credentials come from local environment variables. Commit only `.env.example`; ignore real local environment files.
- Establish one API success/error response format following README.md, with centralized error conversion and no internal details in production responses.
- Keep MongoDB, AI, payment, notification, and deployment integrations out of this Foundation scope.

## Authentication boundary

Auth.js is the selected authentication library. Its integration is deferred from this setup because README.md and `promt.txt` require REST Bearer access/refresh tokens, while Auth.js primarily manages web sessions. The authentication task must define how Auth.js participates without changing the agreed API contract. No password flow, token issuance, or auth database schema is included here.

## Proposed layout

```text
src/
  app/api/                 # Next.js route handlers
  modules/                 # Business modules added in MVP order
  config/                  # Environment/config parsing
  lib/database/             # Drizzle client and PostgreSQL connection
  errors/                   # Shared application/API errors
  types/                    # Shared types
  utils/                    # Small shared helpers
```

The implementation should not create empty module directories or copy Express `app.ts`/`server.ts` patterns. Module-specific validators, handlers, services, and data access are added with the relevant module.

## API and error behavior

- Route handlers call shared parsing/validation and service functions; no business SQL in route files.
- Success responses use `{ success: true, data, meta? }` as defined in README.md.
- Errors use `{ success: false, error: { code, message, details } }`.
- Central handling covers the README/prompt minimum error codes and hides stack traces, credentials, and internal database details in production.

## Verification

- TypeScript type check and Next.js lint/build checks must pass.
- Add focused automated tests for shared response/error behavior and any config parsing introduced.
- Verify Docker Compose configuration and PostgreSQL connectivity when Docker CLI is available; do not claim container verification otherwise.
- Do not run database migrations or invent schema during this task.

## Explicit exclusions

No business schema, authentication implementation, refresh-token design, AI model, MongoDB collections, advanced integrations, frontend UI, or deployment setup.
