# Thanh Core Database Design

## Goal

Replace the property/room-only database demo on `thanh` with a coherent PostgreSQL/Drizzle schema for the rental-management Core MVP. Include sign-in data for landlords, managers, and tenants. This is a design; it does not implement authentication, API routes, UI, or payment providers.

## Decisions

- PostgreSQL remains the source of truth; Drizzle is the schema/migration interface.
- Sign-in uses REST Bearer access and refresh tokens. Persist only a hash of each refresh token, plus expiry, revocation, and optional replacement-token linkage. Access tokens are not persisted.
- Global account roles are `owner`, `manager`, and `tenant`. A property has one owner; managers receive property-scoped access through membership rows. Tenant profiles may optionally link one-to-one to a user account.
- A room's operational status is `ready` or `maintenance`. Occupancy is derived from its effective contract, not stored independently.
- Store all currency as integer VND amounts.
- National ID/CCCD is sensitive: only persist application-encrypted ciphertext, never plaintext.
- Enforce relationships and invariants with PostgreSQL foreign keys, unique constraints, and checks.
- The existing demo migration is not integrated or applied to a real database. Replace it with the complete initial schema migration; do not run it against a real database in this task.

## Relational model

```text
users ──< refresh_tokens
  ├──< properties (owner)
  ├──< property_members >── properties (manager access)
  └──  tenants (optional one-to-one)

properties ──< rooms
properties ──< utility_rates
rooms ──< contracts ──< contract_tenants >── tenants
rooms ──< meter_readings >── utility_rates
contracts ──< invoices ──< invoice_items
                         └──< payments
```

### Accounts and property access

- `users`: UUID primary key; normalized unique email; password hash; role; active/disabled status; creation/update timestamps.
- `refresh_tokens`: user foreign key; unique token hash; expiry; revoked timestamp; optional replacement-token foreign key; creation timestamp. Revoked, expired, or replaced tokens cannot be used to refresh.
- `properties`: owner foreign key to `users`; name/address and timestamps.
- `property_members`: unique `(property_id, user_id)` membership, manager role, status, and timestamps. Only managers are assigned here; owners are represented by `properties.owner_id`.
- `tenants`: personal profile, encrypted national-ID value, phone and birth date; nullable unique `user_id` for optional tenant login.
- `rooms`: property foreign key; room number; optional area; monthly rent in VND; operational status. Unique `(property_id, room_number)`.

### Contracts and utilities

- `contracts`: room foreign key; start/end dates; lifecycle status; rent and deposit snapshots in VND; timestamps. A partial unique index permits at most one active contract per room. Contract occupancy takes effect within its date range and active lifecycle state.
- `contract_tenants`: many-to-many association with unique `(contract_id, tenant_id)`; allows several tenants on one contract.
- `utility_rates`: property, utility type (`electricity` or `water`), VND unit price, effective-from date, and optional effective-to date. Effective periods for the same property and utility must not overlap.
- `meter_readings`: room, utility type, monthly billing period, previous/current readings, and the applicable rate reference and price snapshot. Unique `(room_id, utility_type, billing_period)`; current reading must be at least previous reading. A reading is associated with the utility rate selected for that billing period.

### Billing and payments

- `invoices`: contract, billing-period start, issue/due dates, lifecycle status (`draft`, `issued`, `partially_paid`, `paid`, `cancelled`), total amount snapshot, and timestamps. Unique `(contract_id, billing_period_start)`. “Overdue” is derived from due date and unpaid balance rather than persisted as another status.
- `invoice_items`: invoice, item type (`rent`, `electricity`, `water`, `service`, `adjustment`), description, quantity, integer unit price, integer amount, and optional meter-reading reference. Issued item values are snapshots. A meter reading can be billed at most once.
- `payments`: invoice, positive integer amount, paid-at timestamp, method (`cash`, `bank_transfer`, `other`), optional reference/note, and creation timestamp. Multiple rows support partial payments; amount paid is derived from payment rows.
- No payment-provider, refund, notification, or gateway callback tables in Core MVP.

## Invariants and behavior

- Normalize email before persistence and enforce uniqueness in PostgreSQL.
- Passwords and national IDs never persist as plaintext. Password hashing and national-ID encryption happen in the application layer; keys stay outside the database.
- A room is occupied when it has an active contract whose date range includes the requested date. Do not store `occupied` on the room row.
- Rent/deposit and issued invoice-line prices are historical snapshots; later room/rate changes do not rewrite signed contracts or issued bills.
- Preserve billing history through foreign keys; use restrictive deletes for financial/contract history. Cascades are reserved for join rows and disposable authentication tokens.
- Checks reject negative rent, deposit, rate, invoice-item, or payment amounts; readings reject negative values and decreasing totals; date ranges must be valid.
- Keep CRUD, token rotation, invoice issue, and payment recording transactional at the service layer where multiple rows must change together.

## Migration and verification scope

- Replace the unintegrated property/room demo migration and matching Drizzle schema with one initial complete schema migration. There is no migration execution against a real database in this change.
- Tests must check Drizzle table metadata and ensure the SQL migration defines matching tables, keys, checks, indexes, and enums. Run the repository's required type/lint/build checks during implementation.
- Auth flows, token signing/rotation endpoints, business services, invoice calculation, UI, gateway integration, seed/demo credentials, and production database migration are outside this schema task.
