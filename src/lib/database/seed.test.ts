import { describe, expect, it } from "vitest";

import { DEMO_SEED_DATA, assertLocalSeedUrl } from "./seed";

describe("demo seed configuration", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("accepts loopback host %s for seeding", (host) => {
    expect(() => assertLocalSeedUrl(`postgres://demo:secret@${host}:5432/demo`)).not.toThrow();
  });

  it("rejects non-local database URLs before seeding", () => {
    expect(() => assertLocalSeedUrl("postgres://user:pass@remote-db.railway.app:5432/production")).toThrow(
      "Database seeding is restricted to localhost",
    );
  });

  it("defines deterministic demo properties and rooms matching dashboard expectations", () => {
    expect(DEMO_SEED_DATA.owner.email).toBe("owner.demo@example.com");
    expect(DEMO_SEED_DATA.properties).toHaveLength(2);

    const propertyNames = DEMO_SEED_DATA.properties.map((property) => property.name);
    expect(propertyNames).toEqual(["Nhà trọ An Bình", "Nhà trọ Bình Minh"]);

    const totalRooms = DEMO_SEED_DATA.rooms.length;
    expect(totalRooms).toBe(5);

    const roomNumbers = DEMO_SEED_DATA.rooms.map((room) => room.roomNumber);
    expect(roomNumbers).toEqual(["A01", "A02", "A03", "B01", "B02"]);

    // Contracts for occupied rooms
    expect(DEMO_SEED_DATA.contracts).toHaveLength(2);
    const contractedRoomNumbers = DEMO_SEED_DATA.contracts.map((c) => c.roomNumber);
    expect(contractedRoomNumbers).toContain("A01");
    expect(contractedRoomNumbers).toContain("A03");
  });
});
