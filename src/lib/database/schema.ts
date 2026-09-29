import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["owner", "manager", "tenant"]);
export const accountStatus = pgEnum("account_status", ["active", "disabled"]);
export const propertyMemberStatus = pgEnum("property_member_status", ["active", "revoked"]);
export const roomStatus = pgEnum("room_status", ["ready", "maintenance"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    status: accountStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("users_email_unique").on(table.email),
    check("users_email_normalized", sql`${table.email} = lower(btrim(${table.email}))`),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id").references((): AnyPgColumn => refreshTokens.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("refresh_tokens_token_hash_unique").on(table.tokenHash),
    check("refresh_tokens_expiry_after_creation", sql`${table.expiresAt} > ${table.createdAt}`),
    index("refresh_tokens_user_id_idx").on(table.userId),
  ],
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("properties_owner_id_idx").on(table.ownerId)],
);

export const propertyMembers = pgTable(
  "property_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: propertyMemberStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("property_members_property_user_unique").on(table.propertyId, table.userId),
    index("property_members_user_id_idx").on(table.userId),
  ],
);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    nationalIdEncrypted: text("national_id_encrypted"),
    phone: text("phone"),
    birthDate: date("birth_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("tenants_user_id_unique").on(table.userId),
    index("tenants_full_name_idx").on(table.fullName),
  ],
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomNumber: text("room_number").notNull(),
    areaM2: numeric("area_m2", { precision: 8, scale: 2 }),
    monthlyRent: integer("monthly_rent").notNull(),
    status: roomStatus("status").default("ready").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("rooms_property_room_number_unique").on(table.propertyId, table.roomNumber),
    check("rooms_monthly_rent_nonnegative", sql`${table.monthlyRent} >= 0`),
    check("rooms_area_positive", sql`${table.areaM2} IS NULL OR ${table.areaM2} > 0`),
    index("rooms_property_id_idx").on(table.propertyId),
  ],
);
