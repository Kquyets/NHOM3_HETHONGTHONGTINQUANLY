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
  });

  it("defines property and room tables with the expected columns", () => {
    expect(getTableConfig(properties).name).toBe("properties");
    expect(getTableConfig(rooms).name).toBe("rooms");
    expect(getTableConfig(properties).columns.map(({ name }) => name)).toEqual([
      "id",
      "owner_id",
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
    expect(propertyConfig.foreignKeys.some((key) => key.reference().foreignTable === users)).toBe(true);
    const membershipConfig = getTableConfig(propertyMembers);
    expect(membershipConfig.uniqueConstraints.map(({ columns }) => columns.map(({ name }) => name))).toContainEqual([
      "property_id",
      "user_id",
    ]);
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

  it("ships PostgreSQL DDL for account access and property-room schema", () => {
    const migration = readFileSync(
      new URL("../../../drizzle/0000_property_room_demo.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("CREATE TYPE user_role AS ENUM ('owner', 'manager', 'tenant')");
    expect(migration).toContain("CREATE TYPE room_status AS ENUM ('ready', 'maintenance')");
    expect(migration).toContain("CREATE TABLE users");
    expect(migration).toContain("CREATE TABLE refresh_tokens");
    expect(migration).toContain("CREATE TABLE property_members");
    expect(migration).toContain("CREATE TABLE tenants");
    expect(migration).toContain("CREATE TABLE properties");
    expect(migration).toContain("CREATE TABLE rooms");
    expect(migration).toContain("CREATE TYPE contract_status AS ENUM ('draft', 'active', 'ended', 'cancelled')");
    expect(migration).toContain("CREATE TABLE contracts");
    expect(migration).toContain("CREATE TABLE contract_tenants");
    expect(migration).toContain("contracts_one_active_per_room_unique");
    expect(migration).toContain("contracts_date_range_valid");
    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist");
    expect(migration).toContain("CREATE TABLE utility_rates");
    expect(migration).toContain("utility_rates_period_no_overlap EXCLUDE USING gist");
    expect(migration).toContain("daterange(effective_from, effective_to, '[)') WITH &&");
    expect(migration).toContain("CREATE TABLE meter_readings");
    expect(migration).toContain("meter_readings_current_not_decreased");
    expect(migration).toContain("CREATE TYPE invoice_status AS ENUM");
    expect(migration).toContain("CREATE TABLE invoices");
    expect(migration).toContain("CREATE TABLE invoice_items");
    expect(migration).toContain("CREATE TABLE payments");
    expect(migration).toContain("invoices_contract_period_unique");
    expect(migration).toContain("invoice_items_meter_reading_id_unique");
    expect(migration).toContain("payments_amount_positive");
    expect(migration).toContain("users_email_normalized");
    expect(migration).toContain("refresh_tokens_token_hash_unique");
    expect(migration).toContain("REFERENCES properties(id) ON DELETE CASCADE");
    expect(migration).toContain("rooms_property_room_number_unique");
    expect(migration).toContain("rooms_monthly_rent_nonnegative");
    expect(migration).toContain("rooms_property_id_idx");
  });
});
