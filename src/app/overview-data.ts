import { demoProperties, demoRooms, getRoomCounts, type DemoProperty, type DemoRoom, type RoomStatus } from "./demo-data";

export type PropertyWithRooms = {
  property: DemoProperty;
  rooms: DemoRoom[];
  roomCount: number;
  occupiedCount: number;
};

export type DashboardViewData = {
  source: "demo" | "api";
  propertyCount: number;
  roomCount: number;
  counts: {
    vacant: number;
    occupied: number;
    maintenance: number;
    total: number;
  };
  properties: PropertyWithRooms[];
};

export function getDemoViewData(): DashboardViewData {
  const counts = getRoomCounts(demoRooms);
  const propertiesWithRooms: PropertyWithRooms[] = demoProperties.map((prop) => {
    const rooms = demoRooms.filter((room) => room.propertyId === prop.id);
    return {
      property: prop,
      rooms,
      roomCount: rooms.length,
      occupiedCount: rooms.filter((room) => room.status === "occupied").length,
    };
  });

  return {
    source: "demo",
    propertyCount: demoProperties.length,
    roomCount: demoRooms.length,
    counts,
    properties: propertiesWithRooms,
  };
}

type ApiOverviewProperty = {
  property: {
    id: string;
    name: string;
    address?: string | null;
  };
  rooms: Array<{
    id: string;
    propertyId: string;
    roomNumber: string;
    monthlyRent: number;
    status: RoomStatus;
  }>;
  roomCount: number;
  occupiedCount: number;
};

type ApiOverviewPayload = {
  success: boolean;
  data?: {
    propertyCount: number;
    roomCount: number;
    occupiedCount: number;
    properties: ApiOverviewProperty[];
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export function parseOverviewApiResponse(payload: unknown): DashboardViewData {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("success" in payload) ||
    (payload as ApiOverviewPayload).success !== true ||
    !(payload as ApiOverviewPayload).data
  ) {
    throw new Error("Dữ liệu phản hồi từ máy chủ không hợp lệ.");
  }

  const data = (payload as ApiOverviewPayload).data!;
  const allRooms: DemoRoom[] = [];

  const properties: PropertyWithRooms[] = (data.properties || []).map((item) => {
    const propertyRooms: DemoRoom[] = (item.rooms || []).map((room) => ({
      id: room.id,
      propertyId: room.propertyId || item.property.id,
      roomNumber: room.roomNumber,
      monthlyRent: room.monthlyRent,
      status: room.status,
    }));

    allRooms.push(...propertyRooms);

    return {
      property: {
        id: item.property.id,
        name: item.property.name,
        address: item.property.address || "Chưa cập nhật địa chỉ",
      },
      rooms: propertyRooms,
      roomCount: item.roomCount ?? propertyRooms.length,
      occupiedCount: item.occupiedCount ?? propertyRooms.filter((r) => r.status === "occupied").length,
    };
  });

  const counts = getRoomCounts(allRooms);

  return {
    source: "api",
    propertyCount: data.propertyCount ?? properties.length,
    roomCount: data.roomCount ?? allRooms.length,
    counts,
    properties,
  };
}

export async function fetchDashboardOverview(
  fetchFn: typeof fetch,
  options?: { apiUrl?: string; token?: string },
): Promise<DashboardViewData> {
  const apiUrl = options?.apiUrl?.trim();
  if (!apiUrl) {
    return getDemoViewData();
  }

  const endpoint = apiUrl.endsWith("/api/dashboard/overview")
    ? apiUrl
    : `${apiUrl.replace(/\/$/, "")}/api/dashboard/overview`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetchFn(endpoint, { headers });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiOverviewPayload | null;
    const message = errorBody?.error?.message || `Máy chủ phản hồi mã lỗi ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  return parseOverviewApiResponse(payload);
}
