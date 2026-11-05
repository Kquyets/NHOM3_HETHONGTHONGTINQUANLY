import { describe, expect, it } from "vitest";

import { propertyInputSchema, roomInputSchema, roomPatchSchema } from "./validation";
import { roomStatusForClient } from "./room-status";

describe("property and room request validation", () => {
  it("rejects negative rent and empty room updates", () => {
    expect(roomInputSchema.safeParse({ roomNumber: "A1", monthlyRent: -1 }).success).toBe(false);
    expect(roomPatchSchema.safeParse({}).success).toBe(false);
  });

  it("accepts only positive optional room areas and trims property names", () => {
    expect(propertyInputSchema.parse({ name: "  An Bình  " })).toEqual({ name: "An Bình" });
    expect(roomInputSchema.safeParse({ roomNumber: "A1", monthlyRent: 3000000, areaM2: 0 }).success).toBe(false);
  });
});

describe("dashboard room status", () => {
  it("derives occupancy from an active contract but preserves maintenance state", () => {
    expect(roomStatusForClient("ready", true)).toBe("occupied");
    expect(roomStatusForClient("ready", false)).toBe("vacant");
    expect(roomStatusForClient("maintenance", true)).toBe("maintenance");
  });
});
