import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  accountStatus,
  properties,
  propertyMembers,
  refreshTokens,
  roomStatus,
  rooms,
  tenants,
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
    expect(migration).toContain("users_email_normalized");
    expect(migration).toContain("refresh_tokens_token_hash_unique");
    expect(migration).toContain("REFERENCES properties(id) ON DELETE CASCADE");
    expect(migration).toContain("rooms_property_room_number_unique");
    expect(migration).toContain("rooms_monthly_rent_nonnegative");
    expect(migration).toContain("rooms_property_id_idx");
  });
});
