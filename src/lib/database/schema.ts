import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["owner", "manager", "tenant"]);
export const accountStatus = pgEnum("account_status", ["active", "disabled"]);
export const propertyMemberStatus = pgEnum("property_member_status", ["active", "revoked"]);
export const roomStatus = pgEnum("room_status", ["ready", "maintenance"]);
export const contractStatus = pgEnum("contract_status", ["draft", "active", "ended", "cancelled"]);
export const utilityType = pgEnum("utility_type", ["electricity", "water"]);
export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "cancelled",
]);
export const invoiceItemType = pgEnum("invoice_item_type", [
  "rent",
  "electricity",
  "water",
  "service",
  "adjustment",
]);
export const paymentMethod = pgEnum("payment_method", ["cash", "bank_transfer", "other"]);

export const maintenanceCategory = pgEnum("maintenance_category", [
  "electrical",
  "plumbing",
  "appliance",
  "internet",
  "structural",
  "other",
]);

export const maintenancePriority = pgEnum("maintenance_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const maintenanceStatus = pgEnum("maintenance_status", [
  "pending",
  "in_progress",
  "resolved",
  "cancelled",
]);

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
    unique("users_id_role_unique").on(table.id, table.role),
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
    ownerId: uuid("owner_id").notNull(),
    ownerRole: userRole("owner_role").default("owner").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    bankCode: text("bank_code"),
    bankAccount: text("bank_account"),
    accountHolder: text("account_holder"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ name: "properties_owner_role_fk", columns: [table.ownerId, table.ownerRole], foreignColumns: [users.id, users.role] }).onDelete("restrict"),
    check("properties_owner_role_check", sql`${table.ownerRole} = 'owner'`),
    index("properties_owner_id_idx").on(table.ownerId),
  ],
);

export const propertyMembers = pgTable(
  "property_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    managerRole: userRole("manager_role").default("manager").notNull(),
    status: propertyMemberStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ name: "property_members_manager_role_fk", columns: [table.userId, table.managerRole], foreignColumns: [users.id, users.role] }).onDelete("cascade"),
    check("property_members_manager_role_check", sql`${table.managerRole} = 'manager'`),
    unique("property_members_property_user_unique").on(table.propertyId, table.userId),
    index("property_members_user_id_idx").on(table.userId),
  ],
);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    linkedUserRole: userRole("linked_user_role").default("tenant").notNull(),
    fullName: text("full_name").notNull(),
    nationalIdEncrypted: text("national_id_encrypted"),
    phone: text("phone"),
    birthDate: date("birth_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ name: "tenants_linked_user_role_fk", columns: [table.userId, table.linkedUserRole], foreignColumns: [users.id, users.role] }).onDelete("restrict"),
    check("tenants_linked_user_role_check", sql`${table.linkedUserRole} = 'tenant'`),
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
    unique("rooms_id_property_id_unique").on(table.id, table.propertyId),
    check("rooms_monthly_rent_nonnegative", sql`${table.monthlyRent} >= 0`),
    check("rooms_area_positive", sql`${table.areaM2} IS NULL OR ${table.areaM2} > 0`),
    index("rooms_property_id_idx").on(table.propertyId),
  ],
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: contractStatus("status").default("draft").notNull(),
    monthlyRentSnapshot: integer("monthly_rent_snapshot").notNull(),
    depositSnapshot: integer("deposit_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "contracts_date_range_valid",
      sql`${table.endDate} IS NULL OR ${table.endDate} > ${table.startDate}`,
    ),
    check("contracts_monthly_rent_nonnegative", sql`${table.monthlyRentSnapshot} >= 0`),
    check("contracts_deposit_nonnegative", sql`${table.depositSnapshot} >= 0`),
    uniqueIndex("contracts_one_active_per_room_unique")
      .on(table.roomId)
      .where(sql`${table.status} = 'active'`),
    index("contracts_room_id_idx").on(table.roomId),
  ],
);

export const contractTenants = pgTable(
  "contract_tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("contract_tenants_contract_tenant_unique").on(table.contractId, table.tenantId),
    index("contract_tenants_tenant_id_idx").on(table.tenantId),
  ],
);

export const utilityRates = pgTable(
  "utility_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    utilityType: utilityType("utility_type").notNull(),
    unitPrice: integer("unit_price").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("utility_rates_id_property_type_unique").on(table.id, table.propertyId, table.utilityType),
    check("utility_rates_unit_price_nonnegative", sql`${table.unitPrice} >= 0`),
    check(
      "utility_rates_effective_range_valid",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
    index("utility_rates_property_utility_idx").on(table.propertyId, table.utilityType),
  ],
);

export const meterReadings = pgTable(
  "meter_readings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull(),
    propertyId: uuid("property_id").notNull(),
    utilityType: utilityType("utility_type").notNull(),
    billingPeriod: date("billing_period").notNull(),
    previousValue: numeric("previous_value", { precision: 12, scale: 3 }).notNull(),
    currentValue: numeric("current_value", { precision: 12, scale: 3 }).notNull(),
    utilityRateId: uuid("utility_rate_id").notNull(),
    unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({ name: "meter_readings_room_property_fk", columns: [table.roomId, table.propertyId], foreignColumns: [rooms.id, rooms.propertyId] }).onDelete("restrict"),
    foreignKey({ name: "meter_readings_rate_property_type_fk", columns: [table.utilityRateId, table.propertyId, table.utilityType], foreignColumns: [utilityRates.id, utilityRates.propertyId, utilityRates.utilityType] }).onDelete("restrict"),
    unique("meter_readings_room_utility_period_unique").on(
      table.roomId,
      table.utilityType,
      table.billingPeriod,
    ),
    check(
      "meter_readings_period_first_day",
      sql`EXTRACT(DAY FROM ${table.billingPeriod}) = 1`,
    ),
    check("meter_readings_previous_nonnegative", sql`${table.previousValue} >= 0`),
    check(
      "meter_readings_current_not_decreased",
      sql`${table.currentValue} >= ${table.previousValue}`,
    ),
    check("meter_readings_unit_price_nonnegative", sql`${table.unitPriceSnapshot} >= 0`),
    index("meter_readings_utility_rate_id_idx").on(table.utilityRateId),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contractId: uuid("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "restrict" }),
    billingPeriodStart: date("billing_period_start").notNull(),
    issueDate: date("issue_date"),
    dueDate: date("due_date"),
    status: invoiceStatus("status").default("draft").notNull(),
    totalAmount: integer("total_amount").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("invoices_contract_period_unique").on(table.contractId, table.billingPeriodStart),
    check(
      "invoices_period_first_day",
      sql`EXTRACT(DAY FROM ${table.billingPeriodStart}) = 1`,
    ),
    check("invoices_total_nonnegative", sql`${table.totalAmount} >= 0`),
    check(
      "invoices_due_date_valid",
      sql`${table.dueDate} IS NULL OR ${table.issueDate} IS NULL OR ${table.dueDate} >= ${table.issueDate}`,
    ),
    index("invoices_contract_id_idx").on(table.contractId),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    meterReadingId: uuid("meter_reading_id").references(() => meterReadings.id, {
      onDelete: "restrict",
    }),
    itemType: invoiceItemType("item_type").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("invoice_items_meter_reading_id_unique").on(table.meterReadingId),
    check("invoice_items_quantity_nonnegative", sql`${table.quantity} >= 0`),
    check("invoice_items_unit_price_nonnegative", sql`${table.unitPriceSnapshot} >= 0`),
    check("invoice_items_amount_nonnegative", sql`${table.amount} >= 0`),
    index("invoice_items_invoice_id_idx").on(table.invoiceId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("payments_amount_positive", sql`${table.amount} > 0`),
    index("payments_invoice_id_idx").on(table.invoiceId),
  ],
);

export const maintenanceRequests = pgTable(
  "maintenance_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    category: maintenanceCategory("category").default("other").notNull(),
    priority: maintenancePriority("priority").default("medium").notNull(),
    description: text("description").notNull(),
    status: maintenanceStatus("status").default("pending").notNull(),
    resolutionNotes: text("resolution_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("maintenance_requests_room_id_idx").on(table.roomId),
    index("maintenance_requests_property_id_idx").on(table.propertyId),
    index("maintenance_requests_status_idx").on(table.status),
  ],
);
