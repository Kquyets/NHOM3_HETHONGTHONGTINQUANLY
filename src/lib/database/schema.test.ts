import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { properties, roomStatus, rooms } from "./schema";

describe("property and room demo schema", () => {
  it("defines property and room tables with the expected columns", () => {
    expect(getTableConfig(properties).name).toBe("properties");
    expect(getTableConfig(rooms).name).toBe("rooms");
    expect(getTableConfig(properties).columns.map(({ name }) => name)).toEqual([
      "id",
      "name",
      "address",
      "created_at",
    ]);
    expect(getTableConfig(rooms).columns.map(({ name }) => name)).toEqual([
      "id",
      "property_id",
      "room_number",
      "monthly_rent",
      "status",
    ]);
  });

  it("restricts room status and links rooms to properties", () => {
    expect(roomStatus.enumValues).toEqual(["vacant", "occupied", "maintenance"]);
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

  it("ships PostgreSQL DDL matching the demo schema", () => {
    const migration = readFileSync(
      new URL("../../../drizzle/0000_property_room_demo.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toContain("CREATE TYPE room_status AS ENUM ('vacant', 'occupied', 'maintenance')");
    expect(migration).toContain("CREATE TABLE properties");
    expect(migration).toContain("CREATE TABLE rooms");
    expect(migration).toContain("REFERENCES properties(id) ON DELETE CASCADE");
    expect(migration).toContain("rooms_property_room_number_unique");
    expect(migration).toContain("rooms_monthly_rent_nonnegative");
    expect(migration).toContain("rooms_property_id_idx");
  });
});
