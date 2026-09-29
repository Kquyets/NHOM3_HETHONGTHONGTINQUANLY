import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  accountStatus,
  contractTenants,
  contractStatus,
  contracts,
  invoiceItemType,
  invoiceItems,
  invoiceStatus,
  invoices,
  paymentMethod,
  payments,
  properties,
  propertyMembers,
  refreshTokens,
  roomStatus,
  rooms,
  tenants,
  utilityRates,
  utilityType,
  meterReadings,
  userRole,
  users,
} from "./schema";

describe("core database schema", () => {
  it("defines normalized unique user emails, password hashes, roles, and account status", () => {
    expect(userRole.enumValues).toEqual(["owner", "manager", "tenant"]);
    expect(accountStatus.enumValues).toEqual(["active", "disabled"]);
    const userConfig = getTableConfig(users);
    expect(userConfig.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual(["id", "role"]);
    expect(userConfig.columns.map(({ name }) => name)).toContain("password_hash");
    expect(userConfig.checks.map(({ name }) => name)).toContain("users_email_normalized");
    expect(userConfig.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "email",
    ]);
  });

  it("stores only refresh token hashes and supports expiry, revocation, and rotation linkage", () => {
    const config = getTableConfig(refreshTokens);
    expect(config.columns.map(({ name }) => name)).toEqual([
      "id",
      "user_id",
      "token_hash",
      "expires_at",
      "revoked_at",
      "replaced_by_token_id",
      "created_at",
    ]);
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "token_hash",
    ]);
    expect(config.foreignKeys.map((key) => key.reference().foreignTable)).toContain(users);
    expect(config.foreignKeys.map((key) => key.reference().foreignTable)).toContain(refreshTokens);
  });

  it("links tenants optionally and uniquely to user accounts", () => {
    const config = getTableConfig(tenants);
    expect(config.columns.map(({ name }) => name)).toContain("national_id_encrypted");
    expect(config.columns.map(({ name }) => name)).toContain("user_id");
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "user_id",
    ]);
    expect(config.foreignKeys.some((key) => key.reference().foreignTable === users)).toBe(true);
    expect(config.foreignKeys.some((key) => key.reference().columns.map(({ name }) => name).join(",") === "user_id,linked_user_role")).toBe(true);
  });

  it("defines property and room tables with the expected columns", () => {
    expect(getTableConfig(properties).name).toBe("properties");
    expect(getTableConfig(rooms).name).toBe("rooms");
    expect(getTableConfig(properties).columns.map(({ name }) => name)).toEqual([
      "id",
      "owner_id",
      "owner_role",
      "name",
      "address",
      "created_at",
      "updated_at",
    ]);
    expect(getTableConfig(rooms).columns.map(({ name }) => name)).toEqual([
      "id",
      "property_id",
      "room_number",
      "area_m2",
      "monthly_rent",
      "status",
      "created_at",
      "updated_at",
    ]);
  });

  it("restricts room status and links rooms to properties", () => {
    expect(roomStatus.enumValues).toEqual(["ready", "maintenance"]);
    const config = getTableConfig(rooms);
    expect(config.foreignKeys).toHaveLength(1);
    expect(config.foreignKeys[0].reference().foreignTable).toBe(properties);
    expect(config.foreignKeys[0].onDelete).toBe("cascade");
  });

  it("enforces unique room numbers, nonnegative rent, and property lookup index", () => {
    const config = getTableConfig(rooms);
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "property_id",
      "room_number",
    ]);
    expect(config.checks.map(({ name }) => name)).toContain("rooms_monthly_rent_nonnegative");
    expect(
      config.indexes.map(({ config: index }) =>
        index.columns.map((column) => ("name" in column ? column.name : undefined)),
      ),
    ).toContainEqual(["property_id"]);
  });

  it("assigns each property to an owner and supports unique manager memberships", () => {
    const propertyConfig = getTableConfig(properties);
    expect(propertyConfig.columns.map(({ name }) => name)).toContain("owner_id");
    expect(propertyConfig.foreignKeys.some((key) => key.reference().columns.map(({ name }) => name).join(",") === "owner_id,owner_role")).toBe(true);
    const membershipConfig = getTableConfig(propertyMembers);
    expect(membershipConfig.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "property_id",
      "user_id",
    ]);
    expect(membershipConfig.foreignKeys.some((key) => key.reference().columns.map(({ name }) => name).join(",") === "user_id,manager_role")).toBe(true);
  });

  it("keeps contract rent and deposit snapshots and permits only one active contract per room", () => {
    expect(contractStatus.enumValues).toEqual(["draft", "active", "ended", "cancelled"]);
    const config = getTableConfig(contracts);
    expect(config.columns.map(({ name }) => name)).toEqual([
      "id",
      "room_id",
      "start_date",
      "end_date",
      "status",
      "monthly_rent_snapshot",
      "deposit_snapshot",
      "created_at",
      "updated_at",
    ]);
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "contracts_date_range_valid",
        "contracts_monthly_rent_nonnegative",
        "contracts_deposit_nonnegative",
      ]),
    );
    const activeContractIndex = config.indexes.find(
      ({ config: index }) => index.name === "contracts_one_active_per_room_unique",
    );
    expect(activeContractIndex?.config.unique).toBe(true);
    expect(activeContractIndex?.config.where).toBeDefined();
  });

  it("allows multiple tenants per contract while preventing duplicate links", () => {
    const config = getTableConfig(contractTenants);
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "contract_id",
      "tenant_id",
    ]);
    expect(config.foreignKeys).toHaveLength(2);
  });

  it("keeps utility prices in effective date ranges and rejects overlapping rates", () => {
    expect(utilityType.enumValues).toEqual(["electricity", "water"]);
    const config = getTableConfig(utilityRates);
    expect(config.columns.map(({ name }) => name)).toEqual([
      "id",
      "property_id",
      "utility_type",
      "unit_price",
      "effective_from",
      "effective_to",
      "created_at",
    ]);
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual(["id", "property_id", "utility_type"]);
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "utility_rates_unit_price_nonnegative",
        "utility_rates_effective_range_valid",
      ]),
    );
  });

  it("stores one nondecreasing monthly reading per room and utility with its rate snapshot", () => {
    const config = getTableConfig(meterReadings);
    expect(config.columns.map(({ name }) => name)).toEqual([
      "id",
      "room_id",
      "property_id",
      "utility_type",
      "billing_period",
      "previous_value",
      "current_value",
      "utility_rate_id",
      "unit_price_snapshot",
      "created_at",
    ]);
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "meter_readings_period_first_day",
        "meter_readings_previous_nonnegative",
        "meter_readings_current_not_decreased",
        "meter_readings_unit_price_nonnegative",
      ]),
    );
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "room_id",
      "utility_type",
      "billing_period",
    ]);
    expect(config.foreignKeys.some((key) => key.reference().columns.map(({ name }) => name).join(",") === "room_id,property_id")).toBe(true);
    expect(config.foreignKeys.some((key) => key.reference().columns.map(({ name }) => name).join(",") === "utility_rate_id,property_id,utility_type")).toBe(true);
  });

  it("creates one invoice per contract and period with explicit lifecycle and total snapshot", () => {
    expect(invoiceStatus.enumValues).toEqual([
      "draft",
      "issued",
      "partially_paid",
      "paid",
      "cancelled",
    ]);
    const config = getTableConfig(invoices);
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "contract_id",
      "billing_period_start",
    ]);
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "invoices_period_first_day",
        "invoices_total_nonnegative",
        "invoices_due_date_valid",
      ]),
    );
  });

  it("stores invoice line-item snapshots and bills each meter reading at most once", () => {
    expect(invoiceItemType.enumValues).toEqual([
      "rent",
      "electricity",
      "water",
      "service",
      "adjustment",
    ]);
    const config = getTableConfig(invoiceItems);
    expect(config.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["invoice_id", "meter_reading_id", "unit_price_snapshot", "amount"]),
    );
    expect(config.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "meter_reading_id",
    ]);
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "invoice_items_quantity_nonnegative",
        "invoice_items_unit_price_nonnegative",
        "invoice_items_amount_nonnegative",
      ]),
    );
  });

  it("supports multiple positive VND payments per invoice", () => {
    expect(paymentMethod.enumValues).toEqual(["cash", "bank_transfer", "other"]);
    const config = getTableConfig(payments);
    expect(config.columns.map(({ name }) => name)).toContain("amount");
    expect(config.checks.map(({ name }) => name)).toContain("payments_amount_positive");
    expect(config.uniqueConstraints.some(({ columns }) => columns.some(({ name }) => name === "invoice_id"))).toBe(
      false,
    );
  });

  it("ships PostgreSQL DDL for the full Core schema with matching named objects", () => {
    const migration = readFileSync(
      new URL("../../../drizzle/0000_core_schema.sql", import.meta.url),
      "utf8",
    );
    const tableNames = [
      "users",
      "refresh_tokens",
      "properties",
      "property_members",
      "tenants",
      "rooms",
      "contracts",
      "contract_tenants",
      "utility_rates",
      "meter_readings",
      "invoices",
      "invoice_items",
      "payments",
    ];
    const enumDefinitions = [
      "CREATE TYPE user_role AS ENUM ('owner', 'manager', 'tenant')",
      "CREATE TYPE account_status AS ENUM ('active', 'disabled')",
      "CREATE TYPE property_member_status AS ENUM ('active', 'revoked')",
      "CREATE TYPE room_status AS ENUM ('ready', 'maintenance')",
      "CREATE TYPE contract_status AS ENUM ('draft', 'active', 'ended', 'cancelled')",
      "CREATE TYPE utility_type AS ENUM ('electricity', 'water')",
      "CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled')",
      "CREATE TYPE invoice_item_type AS ENUM ('rent', 'electricity', 'water', 'service', 'adjustment')",
      "CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'other')",
    ];
    const constraintsAndIndexes = [
      "users_email_unique",
      "users_email_normalized",
      "refresh_tokens_user_id_users_id_fk",
      "refresh_tokens_replaced_by_token_id_refresh_tokens_id_fk",
      "refresh_tokens_token_hash_unique",
      "refresh_tokens_expiry_after_creation",
      "refresh_tokens_user_id_idx",
      "users_id_role_unique",
      "properties_owner_role_fk",
      "properties_owner_role_check",
      "properties_owner_id_idx",
      "property_members_property_id_properties_id_fk",
      "property_members_manager_role_fk",
      "property_members_manager_role_check",
      "property_members_property_user_unique",
      "property_members_user_id_idx",
      "tenants_linked_user_role_fk",
      "tenants_linked_user_role_check",
      "tenants_user_id_unique",
      "tenants_full_name_idx",
      "rooms_property_id_properties_id_fk",
      "rooms_property_room_number_unique",
      "rooms_id_property_id_unique",
      "rooms_monthly_rent_nonnegative",
      "rooms_area_positive",
      "contracts_room_id_rooms_id_fk",
      "contracts_date_range_valid",
      "contracts_monthly_rent_nonnegative",
      "contracts_deposit_nonnegative",
      "contracts_one_active_per_room_unique",
      "contracts_room_id_idx",
      "contract_tenants_contract_id_contracts_id_fk",
      "contract_tenants_tenant_id_tenants_id_fk",
      "contract_tenants_contract_tenant_unique",
      "contract_tenants_tenant_id_idx",
      "utility_rates_property_id_properties_id_fk",
      "utility_rates_unit_price_nonnegative",
      "utility_rates_id_property_type_unique",
      "utility_rates_effective_range_valid",
      "utility_rates_period_no_overlap",
      "utility_rates_property_utility_idx",
      "meter_readings_room_property_fk",
      "meter_readings_rate_property_type_fk",
      "meter_readings_room_utility_period_unique",
      "meter_readings_period_first_day",
      "meter_readings_previous_nonnegative",
      "meter_readings_current_not_decreased",
      "meter_readings_unit_price_nonnegative",
      "meter_readings_utility_rate_id_idx",
      "invoices_contract_id_contracts_id_fk",
      "invoices_contract_period_unique",
      "invoices_period_first_day",
      "invoices_total_nonnegative",
      "invoices_due_date_valid",
      "invoices_contract_id_idx",
      "invoice_items_invoice_id_invoices_id_fk",
      "invoice_items_meter_reading_id_meter_readings_id_fk",
      "invoice_items_meter_reading_id_unique",
      "invoice_items_quantity_nonnegative",
      "invoice_items_unit_price_nonnegative",
      "invoice_items_amount_nonnegative",
      "invoice_items_invoice_id_idx",
      "payments_invoice_id_invoices_id_fk",
      "payments_amount_positive",
      "payments_invoice_id_idx",
      "rooms_property_id_idx",
    ];
    for (const table of tableNames) {
      expect(migration).toContain(`CREATE TABLE ${table} (`);
    }
    for (const enumDefinition of enumDefinitions) {
      expect(migration).toContain(enumDefinition);
    }
    for (const objectName of constraintsAndIndexes) {
      expect(migration).toContain(objectName);
    }
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist");
    expect(migration).toContain("daterange(effective_from, effective_to, '[)') WITH &&");
    expect(migration).toContain("REFERENCES properties(id) ON DELETE CASCADE");
    expect(migration).toContain("REFERENCES invoices(id) ON DELETE RESTRICT");
    expect(migration).toContain("CREATE FUNCTION validate_meter_reading_rate()");
    expect(migration).toContain("CREATE FUNCTION validate_invoice_meter_item()");
  });
});
