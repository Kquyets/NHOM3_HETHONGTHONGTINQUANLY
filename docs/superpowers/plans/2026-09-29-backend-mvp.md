# Backend MVP implementation plan

The approved scope is steps 1–5: integrate Thanh’s Core schema, verify a local-only migration path, implement REST Bearer authentication and role/property authorization, add the Core rental APIs, then connect Hoàng’s dashboard demo.

## Order and checks

1. **Database integration:** keep Drizzle schema and SQL migration aligned; add a guarded migration/check command that refuses non-local hosts by default. Verify schema parity and run migration only against an explicitly configured disposable local PostgreSQL database.
2. **Authentication:** implement registration, login, refresh rotation, logout, password hashing, access-token verification, and owner/manager/tenant property scoping. Test token and authorization behavior, including revoked/expired refresh tokens.
3. **Core APIs:** implement the property/room, tenant/contract, meter/rate, invoice/item, and payment routes using thin handlers and service functions. Validate inputs and preserve multi-row invariants with transactions.
4. **Demo data:** seed deterministic synthetic records via explicit local-only configuration; do not commit passwords or real personal information.
5. **Frontend integration:** adapt the existing read-only property/room overview to use the API and show loading/error/empty states; retain a demo path when no backend URL is configured.

## Verification

- Add focused tests before each behavior change and confirm the new test fails before implementation.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` after the integrated changes.
- Run the migration and an end-to-end API/dashboard smoke check only if local PostgreSQL is available. Never point setup scripts at a remote database.
- Commit each completed implementation slice. Do not merge into `feature/quyet-backend` or deploy without explicit follow-up.
