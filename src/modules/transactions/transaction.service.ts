import { desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import {
  contracts,
  invoices,
  maintenanceRequests,
  payments,
  properties,
  rooms,
} from "../../lib/database/schema";
import { listProperties } from "../properties/property.service";

export type TransactionItem = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  propertyId: string;
  propertyName: string;
  roomId?: string | null;
  roomNumber?: string | null;
  category: string;
  method: string;
  reference?: string | null;
  note?: string | null;
};

export type TransactionStats = {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  transactionCount: number;
};

export type ListTransactionsFilter = {
  propertyId?: string;
  type?: "all" | "income" | "expense";
  month?: number;
  year?: number;
};

export type ListTransactionsResult = {
  transactions: TransactionItem[];
  stats: TransactionStats;
};

export async function listTransactions(
  userId: string,
  role: string,
  filters: ListTransactionsFilter = {},
): Promise<ListTransactionsResult> {
  const userProperties = await listProperties(userId, role);
  if (userProperties.length === 0) {
    return {
      transactions: [],
      stats: {
        totalIncome: 0,
        totalExpense: 0,
        netCashflow: 0,
        transactionCount: 0,
      },
    };
  }

  const allowedPropertyIds = new Set(userProperties.map((p) => p.id));
  const targetPropertyIds =
    filters.propertyId && filters.propertyId !== "all" && allowedPropertyIds.has(filters.propertyId)
      ? [filters.propertyId]
      : Array.from(allowedPropertyIds);

  const db = getDatabase();

  // 1. Fetch Income transactions from Payments
  const incomeRows = await db
    .select({
      paymentId: payments.id,
      amount: payments.amount,
      paidAt: payments.paidAt,
      method: payments.method,
      reference: payments.reference,
      note: payments.note,
      propertyId: properties.id,
      propertyName: properties.name,
      roomId: rooms.id,
      roomNumber: rooms.roomNumber,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(inArray(properties.id, targetPropertyIds));

  const items: TransactionItem[] = [];

  for (const row of incomeRows) {
    items.push({
      id: row.paymentId,
      type: "income",
      amount: row.amount,
      date: row.paidAt.toISOString(),
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      roomId: row.roomId,
      roomNumber: row.roomNumber,
      category: "Thu tiền phòng & dịch vụ",
      method: row.method === "bank_transfer" ? "Chuyển khoản (VietQR)" : row.method === "cash" ? "Tiền mặt" : "Khác",
      reference: row.reference ?? undefined,
      note: row.note ?? undefined,
    });
  }

  // 2. Fetch Expense transactions from Maintenance Requests with cost > 0
  const expenseRows = await db
    .select({
      id: maintenanceRequests.id,
      cost: maintenanceRequests.cost,
      payer: maintenanceRequests.payer,
      category: maintenanceRequests.category,
      title: maintenanceRequests.title,
      contractorName: maintenanceRequests.contractorName,
      resolvedAt: maintenanceRequests.resolvedAt,
      createdAt: maintenanceRequests.createdAt,
      propertyId: properties.id,
      propertyName: properties.name,
      roomId: rooms.id,
      roomNumber: rooms.roomNumber,
    })
    .from(maintenanceRequests)
    .innerJoin(properties, eq(properties.id, maintenanceRequests.propertyId))
    .leftJoin(rooms, eq(rooms.id, maintenanceRequests.roomId))
    .where(inArray(maintenanceRequests.propertyId, targetPropertyIds));

  for (const row of expenseRows) {
    if (!row.cost || row.cost <= 0) continue;
    // Only count expenses paid by owner / landlord
    if (row.payer && row.payer !== "owner") continue;

    const dateVal = row.resolvedAt ?? row.createdAt;
    items.push({
      id: row.id,
      type: "expense",
      amount: row.cost,
      date: dateVal.toISOString(),
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      roomId: row.roomId,
      roomNumber: row.roomNumber,
      category: `Chi bảo trì (${row.category})`,
      method: "Tiền mặt / Chuyển khoản",
      reference: row.contractorName ?? undefined,
      note: row.title,
    });
  }

  // 3. Filter by type (income / expense)
  let filtered = items;
  if (filters.type && filters.type !== "all") {
    filtered = filtered.filter((i) => i.type === filters.type);
  }

  // 4. Filter by month/year if provided
  if (filters.month || filters.year) {
    filtered = filtered.filter((i) => {
      const d = new Date(i.date);
      if (filters.year && d.getFullYear() !== filters.year) return false;
      if (filters.month && d.getMonth() + 1 !== filters.month) return false;
      return true;
    });
  }

  // 5. Sort by date descending
  filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 6. Calculate stats
  const totalIncome = filtered
    .filter((i) => i.type === "income")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalExpense = filtered
    .filter((i) => i.type === "expense")
    .reduce((sum, i) => sum + i.amount, 0);

  return {
    transactions: filtered,
    stats: {
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      transactionCount: filtered.length,
    },
  };
}
