import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({ getDatabase: () => mockDb }));
vi.mock("../notifications/notification.service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-mock" }),
}));
vi.mock("../../lib/database/schema", () => ({
  maintenanceRequests: {
    id: "id",
    roomId: "roomId",
    propertyId: "propertyId",
    tenantId: "tenantId",
    title: "title",
    category: "category",
    priority: "priority",
    description: "description",
    status: "status",
    resolutionNotes: "resolutionNotes",
    resolvedAt: "resolvedAt",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  rooms: { id: "id", roomNumber: "roomNumber", propertyId: "propertyId" },
  properties: { id: "id", ownerId: "ownerId", name: "name" },
  tenants: { id: "id", userId: "userId", fullName: "fullName", phone: "phone" },
  propertyMembers: { id: "id", propertyId: "propertyId", userId: "userId", status: "status" },
  contracts: { id: "id", roomId: "roomId", status: "status" },
  contractTenants: { id: "id", contractId: "contractId", tenantId: "tenantId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((col) => ({ type: "desc", col })),
  asc: vi.fn((col) => ({ type: "asc", col })),
}));

function chain(result: unknown[]) {
  const p = Promise.resolve(result);
  const obj: any = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
    set: vi.fn().mockReturnThis(),
    then: (resolve: any, reject: any) => p.then(resolve, reject),
  };
  return obj;
}

import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStatus,
} from "./maintenance.service";

describe("maintenance.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRequest = {
    id: "req-1",
    roomId: "r-1",
    roomNumber: "101",
    propertyId: "p-1",
    propertyName: "Nhà A",
    tenantId: "t-1",
    tenantName: "Nguyễn Văn A",
    tenantPhone: "0901234567",
    title: "Hỏng vòi nước",
    category: "plumbing" as const,
    priority: "high" as const,
    description: "Vòi nước bồn rửa mặt bị rò rỉ mạnh",
    status: "pending" as const,
    resolutionNotes: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("lists maintenance requests for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockRequest]));

    const list = await listMaintenanceRequests({
      userId: "u-owner",
      role: "owner",
    });

    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Hỏng vòi nước");
  });

  it("creates maintenance request successfully for tenant", async () => {
    // 1. find room
    mockDb.select.mockReturnValueOnce(chain([{ id: "r-1", propertyId: "p-1", ownerId: "u-owner" }]));
    // 2. find tenant
    mockDb.select.mockReturnValueOnce(chain([{ id: "t-1" }]));
    // 3. find active contract
    mockDb.select.mockReturnValueOnce(chain([{ id: "c-1" }]));
    // 4. insert
    mockDb.insert.mockReturnValueOnce(chain([{ id: "req-1" }]));
    // 5. list: find tenant
    mockDb.select.mockReturnValueOnce(chain([{ id: "t-1" }]));
    // 6. list: query requests
    mockDb.select.mockReturnValueOnce(chain([mockRequest]));

    const created = await createMaintenanceRequest("u-tenant", "tenant", {
      roomId: "r-1",
      title: "Hỏng vòi nước",
      category: "plumbing",
      priority: "high",
      description: "Vòi nước bồn rửa mặt bị rò rỉ mạnh",
    });

    expect(created.id).toBe("req-1");
    expect(created.status).toBe("pending");
  });

  it("validates empty title when creating request", async () => {
    await expect(
      createMaintenanceRequest("u-tenant", "tenant", {
        roomId: "r-1",
        title: "   ",
        description: "mô tả",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("updates maintenance request status and notes by owner", async () => {
    // 1. find request
    mockDb.select.mockReturnValueOnce(
      chain([{ id: "req-1", propertyId: "p-1", ownerId: "u-owner" }]),
    );
    // 2. update
    mockDb.update.mockReturnValueOnce(chain([]));
    // 3. reload list
    const updatedMock = { ...mockRequest, status: "resolved" as const, resolutionNotes: "Đã thay vòi mới" };
    mockDb.select.mockReturnValueOnce(chain([updatedMock]));

    const res = await updateMaintenanceStatus("u-owner", "owner", "req-1", {
      status: "resolved",
      resolutionNotes: "Đã thay vòi mới",
    });

    expect(res.status).toBe("resolved");
    expect(res.resolutionNotes).toBe("Đã thay vòi mới");
  });
});
