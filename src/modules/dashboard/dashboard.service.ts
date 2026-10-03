import { and, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import {
  contracts,
  contractTenants,
  invoices,
  meterReadings,
  payments,
  properties,
  propertyMembers,
  rooms,
  tenants,
} from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";
import { listProperties } from "../properties/property.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DashboardFilter = {
  propertyId: string | null;
  month: number;
  year: number;
};

export type OccupancyStats = {
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  maintenanceRooms: number;
  occupancyRate: number; // 0 - 100, 1 decimal place
};

export type FinancialStats = {
  totalBilled: number;
  totalCollected: number;
  totalDebt: number;
  unpaidInvoiceCount: number;
  collectionRate: number; // 0 - 100, 1 decimal place
};

export type UtilityStats = {
  electricityKwh: number;
  waterM3: number;
};

export type ExpiringContractItem = {
  id: string;
  roomNumber: string;
  propertyName: string;
  tenantName: string;
  endDate: string;
  daysRemaining: number;
  isUrgent: boolean; // <= 7 days
};

export type UnpaidInvoiceItem = {
  id: string;
  roomNumber: string;
  propertyName: string;
  tenantName: string;
  billingPeriodStart: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isOverdue: boolean;
  daysOverdue: number;
};

export type PropertyOption = {
  id: string;
  name: string;
};

export type DashboardSummary = {
  filter: DashboardFilter;
  properties: PropertyOption[];
  occupancy: OccupancyStats;
  financials: FinancialStats;
  utilities: UtilityStats;
  expiringContracts: ExpiringContractItem[];
  unpaidInvoices: UnpaidInvoiceItem[];
};

export type GetDashboardParams = {
  userId: string;
  role: string;
  propertyId?: string | null;
  month?: number;
  year?: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertStaff(role: string): void {
  if (role !== "owner" && role !== "manager") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà và quản lý mới có quyền truy cập bảng tổng quan.", []);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getDashboardSummary({
  userId,
  role,
  propertyId = null,
  month,
  year,
}: GetDashboardParams): Promise<DashboardSummary> {
  assertStaff(role);
  const db = getDatabase();

  const now = new Date();
  const targetMonth = month && month >= 1 && month <= 12 ? Math.floor(month) : now.getMonth() + 1;
  const targetYear = year && year >= 2000 && year <= 2100 ? Math.floor(year) : now.getFullYear();
  const periodPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  // 1. Get accessible properties
  const accessibleProps = await listProperties(userId, role);
  const propertyOptions: PropertyOption[] = accessibleProps.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const emptySummary: DashboardSummary = {
    filter: { propertyId: propertyId ?? null, month: targetMonth, year: targetYear },
    properties: propertyOptions,
    occupancy: {
      totalRooms: 0,
      occupiedRooms: 0,
      vacantRooms: 0,
      maintenanceRooms: 0,
      occupancyRate: 0,
    },
    financials: {
      totalBilled: 0,
      totalCollected: 0,
      totalDebt: 0,
      unpaidInvoiceCount: 0,
      collectionRate: 100,
    },
    utilities: {
      electricityKwh: 0,
      waterM3: 0,
    },
    expiringContracts: [],
    unpaidInvoices: [],
  };

  if (accessibleProps.length === 0) {
    return emptySummary;
  }

  // 2. Validate propertyId if passed
  let targetPropertyIds: string[] = [];
  if (propertyId) {
    const hasAccess = accessibleProps.some((p) => p.id === propertyId);
    if (!hasAccess) {
      throw new AppError("FORBIDDEN", "Bạn không có quyền truy cập nhà trọ này.", []);
    }
    targetPropertyIds = [propertyId];
  } else {
    targetPropertyIds = accessibleProps.map((p) => p.id);
  }

  // 3. Fetch all rooms in target properties
  const allRooms = await db
    .select({
      id: rooms.id,
      propertyId: rooms.propertyId,
      roomNumber: rooms.roomNumber,
      status: rooms.status,
      monthlyRent: rooms.monthlyRent,
    })
    .from(rooms)
    .where(inArray(rooms.propertyId, targetPropertyIds));

  const totalRooms = allRooms.length;
  const maintenanceRooms = allRooms.filter((r) => r.status === "maintenance").length;
  const roomIds = allRooms.map((r) => r.id);

  if (totalRooms === 0) {
    return emptySummary;
  }

  // 4. Fetch contracts in these rooms
  const contractRows = await db
    .select({
      id: contracts.id,
      roomId: contracts.roomId,
      roomNumber: rooms.roomNumber,
      propertyId: rooms.propertyId,
      propertyName: properties.name,
      status: contracts.status,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
    })
    .from(contracts)
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(inArray(contracts.roomId, roomIds));

  const activeContracts = contractRows.filter((c) => c.status === "active");
  const occupiedRoomIds = new Set(activeContracts.map((c) => c.roomId));
  const occupiedRooms = occupiedRoomIds.size;
  const vacantRooms = Math.max(0, totalRooms - occupiedRooms - maintenanceRooms);
  const occupancyRate =
    totalRooms > 0 ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1)) : 0;

  // 5. Fetch tenants for active contracts to identify tenant names
  const activeContractIds = activeContracts.map((c) => c.id);
  const tenantMap = new Map<string, string>(); // contractId -> tenantName

  if (activeContractIds.length > 0) {
    const ctRows = await db
      .select({
        contractId: contractTenants.contractId,
        fullName: tenants.fullName,
      })
      .from(contractTenants)
      .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
      .where(inArray(contractTenants.contractId, activeContractIds));

    for (const row of ctRows) {
      if (!tenantMap.has(row.contractId)) {
        tenantMap.set(row.contractId, row.fullName);
      }
    }
  }

  // 6. Expiring contracts within next 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  const expiringContracts: ExpiringContractItem[] = [];
  for (const c of activeContracts) {
    if (c.endDate) {
      const end = new Date(c.endDate);
      end.setHours(0, 0, 0, 0);
      if (end >= today && end <= in30Days) {
        const diffMs = end.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        expiringContracts.push({
          id: c.id,
          roomNumber: c.roomNumber,
          propertyName: c.propertyName,
          tenantName: tenantMap.get(c.id) ?? "Chưa gán",
          endDate: c.endDate,
          daysRemaining,
          isUrgent: daysRemaining <= 7,
        });
      }
    }
  }
  expiringContracts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 7. Invoices & Payments for target properties
  const allInvoices = await db
    .select({
      id: invoices.id,
      contractId: invoices.contractId,
      roomNumber: rooms.roomNumber,
      propertyName: properties.name,
      billingPeriodStart: invoices.billingPeriodStart,
      dueDate: invoices.dueDate,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
    })
    .from(invoices)
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(inArray(rooms.propertyId, targetPropertyIds))
    .orderBy(desc(invoices.billingPeriodStart));

  // Get payments for all retrieved invoices
  const invoiceIds = allInvoices.map((inv) => inv.id);
  const paymentsMap = new Map<string, number>(); // invoiceId -> sum of payments

  if (invoiceIds.length > 0) {
    const paymentRows = await db
      .select({
        invoiceId: payments.invoiceId,
        amount: payments.amount,
      })
      .from(payments)
      .where(inArray(payments.invoiceId, invoiceIds));

    for (const p of paymentRows) {
      const current = paymentsMap.get(p.invoiceId) ?? 0;
      paymentsMap.set(p.invoiceId, current + p.amount);
    }
  }

  // 8. Financial Stats for Target Period
  const periodInvoices = allInvoices.filter(
    (inv) => inv.billingPeriodStart.startsWith(periodPrefix) && inv.status !== "cancelled",
  );
  const totalBilled = periodInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollectedInPeriod = periodInvoices.reduce((sum, inv) => {
    return sum + (paymentsMap.get(inv.id) ?? 0);
  }, 0);
  const collectionRate =
    totalBilled > 0 ? Number(((totalCollectedInPeriod / totalBilled) * 100).toFixed(1)) : 100;

  // 9. Outstanding Debt and Unpaid Invoices across all periods
  const activeUnpaidInvoices = allInvoices.filter(
    (inv) =>
      inv.status === "issued" || inv.status === "partially_paid" || inv.status === "draft",
  );

  let totalDebt = 0;
  const unpaidItems: UnpaidInvoiceItem[] = [];

  for (const inv of activeUnpaidInvoices) {
    const paid = paymentsMap.get(inv.id) ?? 0;
    const remaining = Math.max(0, inv.totalAmount - paid);
    if (remaining > 0) {
      totalDebt += remaining;

      let isOverdue = false;
      let daysOverdue = 0;
      if (inv.dueDate) {
        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due < today) {
          isOverdue = true;
          daysOverdue = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      unpaidItems.push({
        id: inv.id,
        roomNumber: inv.roomNumber,
        propertyName: inv.propertyName,
        tenantName: tenantMap.get(inv.contractId) ?? "Khách thuê",
        billingPeriodStart: inv.billingPeriodStart,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        paidAmount: paid,
        remainingAmount: remaining,
        isOverdue,
        daysOverdue,
      });
    }
  }

  // Sort unpaid invoices: overdue first, then by highest remaining debt
  unpaidItems.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return b.remainingAmount - a.remainingAmount;
  });

  // 10. Utility consumption for Target Period
  let electricityKwh = 0;
  let waterM3 = 0;

  const readingRows = await db
    .select({
      utilityType: meterReadings.utilityType,
      billingPeriod: meterReadings.billingPeriod,
      previousValue: meterReadings.previousValue,
      currentValue: meterReadings.currentValue,
    })
    .from(meterReadings)
    .where(inArray(meterReadings.propertyId, targetPropertyIds));

  const periodReadings = readingRows.filter((r) => r.billingPeriod.startsWith(periodPrefix));
  for (const r of periodReadings) {
    const consumed = Math.max(0, Number(r.currentValue) - Number(r.previousValue));
    if (r.utilityType === "electricity") {
      electricityKwh += consumed;
    } else if (r.utilityType === "water") {
      waterM3 += consumed;
    }
  }

  return {
    filter: {
      propertyId: propertyId ?? null,
      month: targetMonth,
      year: targetYear,
    },
    properties: propertyOptions,
    occupancy: {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms,
      occupancyRate,
    },
    financials: {
      totalBilled,
      totalCollected: totalCollectedInPeriod,
      totalDebt,
      unpaidInvoiceCount: unpaidItems.length,
      collectionRate,
    },
    utilities: {
      electricityKwh: Math.round(electricityKwh * 10) / 10,
      waterM3: Math.round(waterM3 * 10) / 10,
    },
    expiringContracts,
    unpaidInvoices: unpaidItems.slice(0, 10), // Top 10 urgent unpaid invoices
  };
}
