export type RoomStatus = "vacant" | "occupied" | "maintenance";

export type DemoProperty = {
  id: string;
  name: string;
  address: string;
};

export type DemoRoom = {
  id: string;
  propertyId: string;
  roomNumber: string;
  monthlyRent: number;
  status: RoomStatus;
};

export const demoProperties: DemoProperty[] = [
  { id: "p1", name: "Nhà trọ An Bình", address: "12 Nguyễn Văn Cừ, Quận 5" },
  { id: "p2", name: "Nhà trọ Bình Minh", address: "48 Lê Văn Sỹ, Quận 3" },
];

export const demoRooms: DemoRoom[] = [
  { id: "r1", propertyId: "p1", roomNumber: "A01", monthlyRent: 3_000_000, status: "occupied" },
  { id: "r2", propertyId: "p1", roomNumber: "A02", monthlyRent: 3_200_000, status: "vacant" },
  { id: "r3", propertyId: "p1", roomNumber: "A03", monthlyRent: 3_500_000, status: "occupied" },
  { id: "r4", propertyId: "p2", roomNumber: "B01", monthlyRent: 4_000_000, status: "maintenance" },
  { id: "r5", propertyId: "p2", roomNumber: "B02", monthlyRent: 4_000_000, status: "vacant" },
];

export function getRoomCounts(rooms: DemoRoom[]) {
  const counts = { vacant: 0, occupied: 0, maintenance: 0, total: rooms.length };
  for (const room of rooms) counts[room.status] += 1;
  return counts;
}
