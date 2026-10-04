import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import {
  contracts,
  contractTenants,
  maintenanceRequests,
  properties,
  propertyMembers,
  rooms,
  tenants,
} from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MaintenanceCategory =
  | "electrical"
  | "plumbing"
  | "appliance"
  | "internet"
  | "structural"
  | "other";

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";

export type MaintenanceStatus = "pending" | "in_progress" | "resolved" | "cancelled";

export type MaintenanceRow = {
  id: string;
  roomId: string;
  roomNumber: string;
  propertyId: string;
  propertyName: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  title: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  status: MaintenanceStatus;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMaintenanceInput = {
  roomId: string;
  title: string;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  description: string;
};

export type UpdateMaintenanceStatusInput = {
  status: MaintenanceStatus;
  resolutionNotes?: string | null;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function listMaintenanceRequests(params: {
  userId: string;
  role: string;
  propertyId?: string;
  status?: MaintenanceStatus;
}): Promise<MaintenanceRow[]> {
  const db = getDatabase();

  const baseCols = {
    id: maintenanceRequests.id,
    roomId: maintenanceRequests.roomId,
    roomNumber: rooms.roomNumber,
    propertyId: maintenanceRequests.propertyId,
    propertyName: properties.name,
    tenantId: maintenanceRequests.tenantId,
    tenantName: tenants.fullName,
    tenantPhone: tenants.phone,
    title: maintenanceRequests.title,
    category: maintenanceRequests.category,
    priority: maintenanceRequests.priority,
    description: maintenanceRequests.description,
    status: maintenanceRequests.status,
    resolutionNotes: maintenanceRequests.resolutionNotes,
    resolvedAt: maintenanceRequests.resolvedAt,
    createdAt: maintenanceRequests.createdAt,
    updatedAt: maintenanceRequests.updatedAt,
  };

  if (params.role === "owner") {
    return db
      .select(baseCols)
      .from(maintenanceRequests)
      .innerJoin(rooms, eq(rooms.id, maintenanceRequests.roomId))
      .innerJoin(properties, eq(properties.id, maintenanceRequests.propertyId))
      .leftJoin(tenants, eq(tenants.id, maintenanceRequests.tenantId))
      .where(
        params.propertyId
          ? and(
              eq(properties.ownerId, params.userId),
              eq(maintenanceRequests.propertyId, params.propertyId),
              params.status ? eq(maintenanceRequests.status, params.status) : undefined,
            )
          : and(
              eq(properties.ownerId, params.userId),
              params.status ? eq(maintenanceRequests.status, params.status) : undefined,
            ),
      )
      .orderBy(desc(maintenanceRequests.createdAt));
  }

  if (params.role === "manager") {
    return db
      .select(baseCols)
      .from(maintenanceRequests)
      .innerJoin(rooms, eq(rooms.id, maintenanceRequests.roomId))
      .innerJoin(properties, eq(properties.id, maintenanceRequests.propertyId))
      .innerJoin(
        propertyMembers,
        and(
          eq(propertyMembers.propertyId, properties.id),
          eq(propertyMembers.userId, params.userId),
          eq(propertyMembers.status, "active"),
        ),
      )
      .leftJoin(tenants, eq(tenants.id, maintenanceRequests.tenantId))
      .where(
        params.propertyId
          ? and(
              eq(maintenanceRequests.propertyId, params.propertyId),
              params.status ? eq(maintenanceRequests.status, params.status) : undefined,
            )
          : params.status
          ? eq(maintenanceRequests.status, params.status)
          : undefined,
      )
      .orderBy(desc(maintenanceRequests.createdAt));
  }

  // Tenant role: return their own requests
  const [tenantRow] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.userId, params.userId))
    .limit(1);

  if (!tenantRow) return [];

  return db
    .select(baseCols)
    .from(maintenanceRequests)
    .innerJoin(rooms, eq(rooms.id, maintenanceRequests.roomId))
    .innerJoin(properties, eq(properties.id, maintenanceRequests.propertyId))
    .leftJoin(tenants, eq(tenants.id, maintenanceRequests.tenantId))
    .where(
      and(
        eq(maintenanceRequests.tenantId, tenantRow.id),
        params.status ? eq(maintenanceRequests.status, params.status) : undefined,
      ),
    )
    .orderBy(desc(maintenanceRequests.createdAt));
}

export async function createMaintenanceRequest(
  userId: string,
  role: string,
  input: CreateMaintenanceInput,
): Promise<MaintenanceRow> {
  const db = getDatabase();

  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    throw new AppError("VALIDATION_ERROR", "Tiêu đề yêu cầu sửa chữa không được để trống.", [
      { field: "title", message: "Tiêu đề không được để trống." },
    ]);
  }

  if (!description) {
    throw new AppError("VALIDATION_ERROR", "Mô tả sự cố không được để trống.", [
      { field: "description", message: "Vui lòng mô tả chi tiết sự cố gặp phải." },
    ]);
  }

  // Find room and property
  const [room] = await db
    .select({
      id: rooms.id,
      propertyId: rooms.propertyId,
      ownerId: properties.ownerId,
    })
    .from(rooms)
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(eq(rooms.id, input.roomId))
    .limit(1);

  if (!room) {
    throw new AppError("NOT_FOUND", "Không tìm thấy phòng tương ứng.", [
      { field: "roomId", message: "Phòng không tồn tại." },
    ]);
  }

  let tenantId: string | null = null;

  if (role === "tenant") {
    const [t] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.userId, userId))
      .limit(1);

    if (!t) {
      throw new AppError("FORBIDDEN", "Tài khoản của bạn chưa được liên kết thông tin khách thuê.", []);
    }
    tenantId = t.id;

    // Verify tenant belongs to an active contract for this room
    const [activeContract] = await db
      .select({ id: contracts.id })
      .from(contracts)
      .innerJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
      .where(
        and(
          eq(contracts.roomId, room.id),
          eq(contractTenants.tenantId, t.id),
          eq(contracts.status, "active"),
        ),
      )
      .limit(1);

    if (!activeContract) {
      throw new AppError("FORBIDDEN", "Bạn không có hợp đồng thuê hiệu lực tại phòng này.", []);
    }
  } else if (role === "owner") {
    if (room.ownerId !== userId) {
      throw new AppError("FORBIDDEN", "Bạn không có quyền quản lý phòng này.", []);
    }
  } else if (role === "manager") {
    const [membership] = await db
      .select({ id: propertyMembers.id })
      .from(propertyMembers)
      .where(
        and(
          eq(propertyMembers.propertyId, room.propertyId),
          eq(propertyMembers.userId, userId),
          eq(propertyMembers.status, "active"),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new AppError("FORBIDDEN", "Bạn không có quyền quản lý phòng này.", []);
    }
  }

  const [created] = await db
    .insert(maintenanceRequests)
    .values({
      roomId: room.id,
      propertyId: room.propertyId,
      tenantId,
      title,
      category: input.category ?? "other",
      priority: input.priority ?? "medium",
      description,
      status: "pending",
    })
    .returning();

  // Return full row
  const rows = await listMaintenanceRequests({
    userId,
    role,
    propertyId: room.propertyId,
  });

  const found = rows.find((r) => r.id === created.id);
  if (!found) {
    throw new AppError("INTERNAL_SERVER_ERROR", "Tạo sự cố thành công nhưng không lấy được bản ghi.", []);
  }

  return found;
}

export async function updateMaintenanceStatus(
  userId: string,
  role: string,
  requestId: string,
  input: UpdateMaintenanceStatusInput,
): Promise<MaintenanceRow> {
  if (role !== "owner" && role !== "manager") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà hoặc quản lý mới có quyền cập nhật trạng thái sửa chữa.", []);
  }

  const db = getDatabase();

  const [req] = await db
    .select({
      id: maintenanceRequests.id,
      propertyId: maintenanceRequests.propertyId,
      ownerId: properties.ownerId,
    })
    .from(maintenanceRequests)
    .innerJoin(properties, eq(properties.id, maintenanceRequests.propertyId))
    .where(eq(maintenanceRequests.id, requestId))
    .limit(1);

  if (!req) {
    throw new AppError("NOT_FOUND", "Không tìm thấy yêu cầu sửa chữa.", []);
  }

  if (role === "owner" && req.ownerId !== userId) {
    throw new AppError("FORBIDDEN", "Bạn không có quyền thao tác trên nhà trọ này.", []);
  }

  if (role === "manager") {
    const [m] = await db
      .select({ id: propertyMembers.id })
      .from(propertyMembers)
      .where(
        and(
          eq(propertyMembers.propertyId, req.propertyId),
          eq(propertyMembers.userId, userId),
          eq(propertyMembers.status, "active"),
        ),
      )
      .limit(1);

    if (!m) {
      throw new AppError("FORBIDDEN", "Bạn không quản lý nhà trọ này.", []);
    }
  }

  const resolvedAt = input.status === "resolved" ? new Date() : null;

  await db
    .update(maintenanceRequests)
    .set({
      status: input.status,
      resolutionNotes: input.resolutionNotes ? input.resolutionNotes.trim() : null,
      resolvedAt,
      updatedAt: new Date(),
    })
    .where(eq(maintenanceRequests.id, requestId));

  const rows = await listMaintenanceRequests({
    userId,
    role,
    propertyId: req.propertyId,
  });

  const updated = rows.find((r) => r.id === requestId);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Không tìm thấy sự cố sau khi cập nhật.", []);
  }

  return updated;
}
