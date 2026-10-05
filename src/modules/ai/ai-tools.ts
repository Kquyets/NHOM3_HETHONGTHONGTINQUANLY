import { listProperties } from "../properties/property.service";
import { listRooms } from "../rooms/room.service";
import { listContracts } from "../contracts/contract.service";
import { listInvoices } from "../invoices/invoice.service";
import { listMaintenanceRequests, type MaintenanceStatus } from "../maintenance/maintenance.service";
import { listTenants } from "../tenants/tenant.service";
import { getDashboardSummary } from "../dashboard/dashboard.service";

export type AuthContext = {
  userId: string;
  role: string;
};

// ---------------------------------------------------------------------------
// 1. Overview Financial & Occupancy Statistics
// ---------------------------------------------------------------------------
export async function toolGetOverviewStats(
  ctx: AuthContext,
  params?: { propertyId?: string; month?: number; year?: number },
) {
  const summary = await getDashboardSummary({
    userId: ctx.userId,
    role: ctx.role,
    propertyId: params?.propertyId,
    month: params?.month,
    year: params?.year,
  });

  return {
    occupancy: {
      totalRooms: summary.occupancy.totalRooms,
      occupiedRooms: summary.occupancy.occupiedRooms,
      vacantRooms: summary.occupancy.vacantRooms,
      maintenanceRooms: summary.occupancy.maintenanceRooms,
      occupancyRate: `${summary.occupancy.occupancyRate}%`,
    },
    financial: {
      totalBilled: summary.financials.totalBilled,
      totalCollected: summary.financials.totalCollected,
      totalDebt: summary.financials.totalDebt,
      unpaidInvoiceCount: summary.financials.unpaidInvoiceCount,
      collectionRate: `${summary.financials.collectionRate}%`,
    },
    utility: summary.utilities,
    expiringContractsCount: summary.expiringContracts.length,
    urgentExpiringContracts: summary.expiringContracts.filter((c) => c.isUrgent),
    unpaidInvoices: summary.unpaidInvoices.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// 2. Room Lookup with active tenant details
// ---------------------------------------------------------------------------
export async function toolLookupRooms(
  ctx: AuthContext,
  params?: { roomNumber?: string; status?: "ready" | "maintenance"; propertyId?: string },
) {
  const [properties, allContracts] = await Promise.all([
    listProperties(ctx.userId, ctx.role),
    listContracts(ctx.userId, ctx.role),
  ]);

  const targetProperties = params?.propertyId
    ? properties.filter((p) => p.id === params.propertyId)
    : properties;

  const activeContracts = allContracts.filter((c) => c.status === "active");

  const results: Array<{
    propertyId: string;
    propertyName: string;
    roomId: string;
    roomNumber: string;
    monthlyRent: number;
    areaM2: string | null;
    status: "ready" | "maintenance";
    isOccupied: boolean;
    tenantName: string | null;
    tenantPhone: string | null;
    contractEndDate: string | null;
  }> = [];

  for (const prop of targetProperties) {
    const rooms = await listRooms(ctx.userId, ctx.role, prop.id);

    for (const r of rooms) {
      if (params?.roomNumber && !r.roomNumber.toLowerCase().includes(params.roomNumber.toLowerCase())) {
        continue;
      }
      if (params?.status && r.status !== params.status) {
        continue;
      }

      const activeContract = activeContracts.find((c) => c.roomId === r.id);
      const mainTenant = activeContract?.tenants[0];

      results.push({
        propertyId: prop.id,
        propertyName: prop.name,
        roomId: r.id,
        roomNumber: r.roomNumber,
        monthlyRent: r.monthlyRent,
        areaM2: r.areaM2,
        status: r.status,
        isOccupied: Boolean(activeContract),
        tenantName: mainTenant?.fullName || null,
        tenantPhone: mainTenant?.phone || null,
        contractEndDate: activeContract?.endDate || null,
      });
    }
  }

  return {
    totalMatched: results.length,
    rooms: results,
  };
}

// ---------------------------------------------------------------------------
// 3. Contract Lookup with expiration calculation
// ---------------------------------------------------------------------------
export async function toolLookupContracts(
  ctx: AuthContext,
  params?: { roomNumber?: string; tenantName?: string; expiringWithinDays?: number; propertyId?: string },
) {
  const allContracts = await listContracts(ctx.userId, ctx.role);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const matchedContracts: Array<{
    contractId: string;
    propertyName: string;
    roomNumber: string;
    status: string;
    startDate: string;
    endDate: string | null;
    daysRemaining: number | null;
    monthlyRent: number;
    deposit: number;
    primaryTenant: string;
    tenantPhone: string | null;
    roommates: string[];
  }> = [];

  for (const c of allContracts) {
    if (params?.roomNumber && !c.roomNumber.toLowerCase().includes(params.roomNumber.toLowerCase())) {
      continue;
    }

    const tenantMatch = !params?.tenantName || c.tenants.some((t) =>
      t.fullName.toLowerCase().includes(params.tenantName!.toLowerCase())
    );
    if (!tenantMatch) {
      continue;
    }

    let daysRemaining: number | null = null;
    if (c.endDate) {
      const end = new Date(c.endDate);
      daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (params?.expiringWithinDays !== undefined) {
      if (daysRemaining === null || daysRemaining < 0 || daysRemaining > params.expiringWithinDays) {
        continue;
      }
    }

    const primary = c.tenants[0]?.fullName || "Chưa gán khách";
    const phone = c.tenants[0]?.phone || null;
    const roommates = c.tenants.slice(1).map((t) => t.fullName);

    matchedContracts.push({
      contractId: c.id,
      propertyName: c.propertyName,
      roomNumber: c.roomNumber,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      daysRemaining,
      monthlyRent: c.monthlyRentSnapshot,
      deposit: c.depositSnapshot,
      primaryTenant: primary,
      tenantPhone: phone,
      roommates,
    });
  }

  return {
    totalMatched: matchedContracts.length,
    contracts: matchedContracts,
  };
}

// ---------------------------------------------------------------------------
// 4. Unpaid Invoices Lookup
// ---------------------------------------------------------------------------
export async function toolLookupUnpaidInvoices(
  ctx: AuthContext,
  params?: { roomNumber?: string; propertyId?: string },
) {
  const allInvoices = await listInvoices(ctx.userId, ctx.role);

  const unpaidList: Array<{
    invoiceId: string;
    propertyName: string;
    roomNumber: string;
    tenantName: string | null;
    tenantPhone: string | null;
    billingPeriod: string;
    dueDate: string | null;
    status: string;
    totalAmount: number;
    paidAmount: number;
    remainingDebt: number;
  }> = [];

  let grandTotalDebt = 0;

  for (const inv of allInvoices) {
    if (inv.status === "paid" || inv.status === "cancelled") {
      continue;
    }

    if (params?.roomNumber && !inv.roomNumber.toLowerCase().includes(params.roomNumber.toLowerCase())) {
      continue;
    }

    const paid = inv.paidAmount || 0;
    const remaining = Math.max(0, inv.totalAmount - paid);
    grandTotalDebt += remaining;

    unpaidList.push({
      invoiceId: inv.id,
      propertyName: inv.propertyName,
      roomNumber: inv.roomNumber,
      tenantName: inv.tenantName || null,
      tenantPhone: inv.tenantPhone || null,
      billingPeriod: inv.billingPeriodStart,
      dueDate: inv.dueDate,
      status: inv.status,
      totalAmount: inv.totalAmount,
      paidAmount: paid,
      remainingDebt: remaining,
    });
  }

  return {
    totalUnpaidInvoices: unpaidList.length,
    totalDebtAmount: grandTotalDebt,
    invoices: unpaidList,
  };
}

// ---------------------------------------------------------------------------
// 5. Maintenance Requests Lookup
// ---------------------------------------------------------------------------
export async function toolLookupMaintenanceRequests(
  ctx: AuthContext,
  params?: { status?: string; propertyId?: string },
) {
  const requests = await listMaintenanceRequests({
    userId: ctx.userId,
    role: ctx.role,
    propertyId: params?.propertyId,
    status: params?.status as MaintenanceStatus | undefined,
  });

  const items = requests.map((r) => ({
    id: r.id,
    propertyName: r.propertyName,
    roomNumber: r.roomNumber,
    tenantName: r.tenantName,
    tenantPhone: r.tenantPhone,
    title: r.title,
    category: r.category,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return {
    totalMatched: items.length,
    requests: items,
  };
}

// ---------------------------------------------------------------------------
// 6. Tenant Lookup
// ---------------------------------------------------------------------------
export async function toolLookupTenants(
  ctx: AuthContext,
  params?: { search?: string; phone?: string },
) {
  const [allTenants, allContracts] = await Promise.all([
    listTenants(ctx.userId, ctx.role),
    listContracts(ctx.userId, ctx.role),
  ]);

  // Map tenant to current room via active contracts
  const tenantRoomMap = new Map<string, { roomNumber: string; propertyName: string }>();

  for (const c of allContracts) {
    if (c.status === "active") {
      for (const t of c.tenants) {
        tenantRoomMap.set(t.id, { roomNumber: c.roomNumber, propertyName: c.propertyName });
      }
    }
  }

  const results = allTenants
    .filter((t) => {
      if (params?.phone && (!t.phone || !t.phone.includes(params.phone))) {
        return false;
      }
      if (params?.search) {
        const query = params.search.toLowerCase();
        const nameMatch = t.fullName.toLowerCase().includes(query);
        const phoneMatch = t.phone ? t.phone.includes(query) : false;
        if (!nameMatch && !phoneMatch) return false;
      }
      return true;
    })
    .map((t) => {
      const roomInfo = tenantRoomMap.get(t.id);
      return {
        id: t.id,
        fullName: t.fullName,
        phone: t.phone,
        birthDate: t.birthDate,
        currentRoom: roomInfo?.roomNumber || "Chưa vào phòng",
        propertyName: roomInfo?.propertyName || null,
      };
    });

  return {
    totalMatched: results.length,
    tenants: results,
  };
}
