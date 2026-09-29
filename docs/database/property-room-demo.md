# Property and room demo schema

Draft demo model: one property has many rooms. Each room has a property-local room number, nonnegative monthly rent, and one status: vacant, occupied, or maintenance. Deleting a property cascades to its rooms.

The PostgreSQL migration is `drizzle/0000_property_room_demo.sql`; the matching Drizzle definitions are in `src/lib/database/schema.ts`.

Tenants, contracts, meters, invoices, payments, and authentication are intentionally deferred until the team agrees on those requirements.
