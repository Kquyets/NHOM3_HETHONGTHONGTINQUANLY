export type ClientRoomStatus = "vacant" | "occupied" | "maintenance";

export function roomStatusForClient(
  operationalStatus: "ready" | "maintenance",
  hasActiveContract: boolean,
): ClientRoomStatus {
  if (operationalStatus === "maintenance") return "maintenance";
  return hasActiveContract ? "occupied" : "vacant";
}
