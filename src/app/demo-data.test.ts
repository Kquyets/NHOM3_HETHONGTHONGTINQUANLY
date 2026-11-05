import { describe, expect, it } from "vitest";

import { getRoomCounts, type DemoRoom } from "./demo-data";

const rooms: DemoRoom[] = [
  { id: "1", propertyId: "p1", roomNumber: "A01", monthlyRent: 3_000_000, status: "vacant" },
  { id: "2", propertyId: "p1", roomNumber: "A02", monthlyRent: 3_500_000, status: "occupied" },
  { id: "3", propertyId: "p1", roomNumber: "A03", monthlyRent: 0, status: "maintenance" },
  { id: "4", propertyId: "p2", roomNumber: "B01", monthlyRent: 4_000_000, status: "occupied" },
];

describe("getRoomCounts", () => {
  it("counts each status and total rooms", () => {
    const counts = getRoomCounts(rooms);

    expect(counts).toEqual({ vacant: 1, occupied: 2, maintenance: 1, total: 4 });
    expect(counts.total).toBe(counts.vacant + counts.occupied + counts.maintenance);
  });

  it("returns zero counts for an empty room list", () => {
    expect(getRoomCounts([])).toEqual({ vacant: 0, occupied: 0, maintenance: 0, total: 0 });
  });
});
