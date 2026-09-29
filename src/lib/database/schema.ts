import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const roomStatus = pgEnum("room_status", ["vacant", "occupied", "maintenance"]);

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomNumber: text("room_number").notNull(),
    monthlyRent: integer("monthly_rent").notNull(),
    status: roomStatus("status").default("vacant").notNull(),
  },
  (table) => [
    unique("rooms_property_room_number_unique").on(table.propertyId, table.roomNumber),
    check("rooms_monthly_rent_nonnegative", sql`${table.monthlyRent} >= 0`),
    index("rooms_property_id_idx").on(table.propertyId),
  ],
);

