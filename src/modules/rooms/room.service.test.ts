import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB
// ---------------------------------------------------------------------------

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({ getDatabase: () => mockDb }));
vi.mock("../../lib/database/schema", () => ({
  properties: { id: "id", ownerId: "ownerId" },
  propertyMembers: { id: "id", propertyId: "propertyId", userId: "userId", status: "status" },
  rooms: {
    id: "id", propertyId: "propertyId", roomNumber: "roomNumber",
    areaM2: "areaM2", monthlyRent: "monthlyRent", status: "status",
    createdAt: "createdAt", updatedAt: "updatedAt", $inferInsert: {},
  },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
}));

function chain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

import {
  listRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
} from "./room.service";

const OWNER = { userId: "owner-1", role: "owner" as const };
const MANAGER = { userId: "mgr-1", role: "manager" as const };
const PROP_ID = "prop-123";
const ROOM_ID = "room-456";

const mockRoom = {
  id: ROOM_ID,
  propertyId: PROP_ID,
  roomNumber: "101",
  areaM2: "20.00",
  monthlyRent: 2000000,
  status: "ready" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// listRooms
// ---------------------------------------------------------------------------
describe("listRooms", () => {
  it("returns rooms when owner has access", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // assertPropertyAccess
    mockDb.select.mockReturnValueOnce(chain([mockRoom]));         // listRooms query
    const result = await listRooms(OWNER.userId, OWNER.role, PROP_ID);
    expect(result).toHaveLength(1);
    expect(result[0].roomNumber).toBe("101");
  });

  it("throws FORBIDDEN when owner doesn't own property", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(listRooms("other", "owner", PROP_ID)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(listRooms("tenant-1", "tenant", PROP_ID)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ---------------------------------------------------------------------------
// getRoom
// ---------------------------------------------------------------------------
describe("getRoom", () => {
  it("returns room when found", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // access check
    mockDb.select.mockReturnValueOnce(chain([mockRoom]));
    const result = await getRoom(OWNER.userId, OWNER.role, PROP_ID, ROOM_ID);
    expect(result.id).toBe(ROOM_ID);
  });

  it("throws NOT_FOUND for missing room", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }]));
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getRoom(OWNER.userId, OWNER.role, PROP_ID, ROOM_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------
describe("createRoom", () => {
  it("creates room with valid input", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // access check
    mockDb.select.mockReturnValueOnce(chain([]));                  // duplicate check
    mockDb.insert.mockReturnValueOnce(chain([mockRoom]));
    const result = await createRoom(OWNER.userId, OWNER.role, PROP_ID, {
      roomNumber: "101",
      monthlyRent: 2000000,
      areaM2: 20,
    });
    expect(result.roomNumber).toBe("101");
  });

  it("throws VALIDATION_ERROR for empty roomNumber", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }]));
    await expect(
      createRoom(OWNER.userId, OWNER.role, PROP_ID, { roomNumber: "  ", monthlyRent: 1000000 }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR for negative monthlyRent", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }]));
    await expect(
      createRoom(OWNER.userId, OWNER.role, PROP_ID, { roomNumber: "102", monthlyRent: -1 }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws CONFLICT for duplicate room number", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // access check
    mockDb.select.mockReturnValueOnce(chain([{ id: ROOM_ID }])); // duplicate found
    await expect(
      createRoom(OWNER.userId, OWNER.role, PROP_ID, { roomNumber: "101", monthlyRent: 1000000 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

// ---------------------------------------------------------------------------
// updateRoom
// ---------------------------------------------------------------------------
describe("updateRoom", () => {
  it("updates room status", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // access check
    mockDb.update.mockReturnValueOnce(chain([{ ...mockRoom, status: "maintenance" }]));
    const result = await updateRoom(OWNER.userId, OWNER.role, PROP_ID, ROOM_ID, { status: "maintenance" });
    expect(result.status).toBe("maintenance");
  });

  it("throws VALIDATION_ERROR for negative monthlyRent", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }]));
    await expect(
      updateRoom(OWNER.userId, OWNER.role, PROP_ID, ROOM_ID, { monthlyRent: -500 }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// deleteRoom
// ---------------------------------------------------------------------------
describe("deleteRoom", () => {
  it("deletes room for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }]));
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteRoom(OWNER.userId, OWNER.role, PROP_ID, ROOM_ID)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(deleteRoom(MANAGER.userId, MANAGER.role, PROP_ID, ROOM_ID)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
