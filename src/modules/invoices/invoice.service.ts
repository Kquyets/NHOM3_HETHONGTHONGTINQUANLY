import { and, asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import {
  contracts,
  contractTenants,
  invoiceItems,
  invoices,
  payments,
  properties,
  propertyMembers,
  rooms,
  tenants,
} from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";
import { createNotification } from "../notifications/notification.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type InvoiceItemType = "rent" | "electricity" | "water" | "service" | "adjustment";
export type PaymentMethod = "cash" | "bank_transfer" | "other";

export type InvoiceRow = {
  id: string;
  contractId: string;
  roomNumber: string;
  propertyName: string;
  propertyAddress?: string | null;
  tenantName?: string | null;
  tenantPhone?: string | null;
  bankCode?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
  billingPeriodStart: string;
  issueDate: string | null;
  dueDate: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceItemRow = {
  id: string;
  invoiceId: string;
  meterReadingId: string | null;
  itemType: InvoiceItemType;
  description: string;
  quantity: string;
  unitPriceSnapshot: number;
  amount: number;
  createdAt: Date;
};

export type PaymentRow = {
  id: string;
  invoiceId: string;
  amount: number;
  paidAt: Date;
  method: PaymentMethod;
  reference: string | null;
  note: string | null;
  createdAt: Date;
};

export type InvoiceDetail = InvoiceRow & {
  items: InvoiceItemRow[];
  payments: PaymentRow[];
};

export type CreateInvoiceItemInput = {
  meterReadingId?: string | null;
  itemType: InvoiceItemType;
  description: string;
  quantity: number;
  unitPriceSnapshot: number;
  amount: number;
};

export type CreateInvoiceInput = {
  contractId: string;
  billingPeriodStart: string;
  issueDate?: string | null;
  dueDate?: string | null;
  totalAmount: number;
  items: CreateInvoiceItemInput[];
};

export type AddPaymentInput = {
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  note?: string | null;
};

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

function assertStaff(role: string): void {
  if (role !== "owner" && role !== "manager") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà và quản lý mới có quyền thao tác hóa đơn.", []);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function listInvoices(userId: string, role: string): Promise<InvoiceRow[]> {
  assertStaff(role);
  const db = getDatabase();

  const cols = {
    id: invoices.id,
    contractId: invoices.contractId,
    roomNumber: rooms.roomNumber,
    propertyName: properties.name,
    propertyAddress: properties.address,
    tenantName: tenants.fullName,
    tenantPhone: tenants.phone,
    bankCode: properties.bankCode,
    bankAccount: properties.bankAccount,
    accountHolder: properties.accountHolder,
    billingPeriodStart: invoices.billingPeriodStart,
    issueDate: invoices.issueDate,
    dueDate: invoices.dueDate,
    status: invoices.status,
    totalAmount: invoices.totalAmount,
    createdAt: invoices.createdAt,
    updatedAt: invoices.updatedAt,
  };

  if (role === "owner") {
    return db
      .select(cols)
      .from(invoices)
      .innerJoin(contracts, eq(contracts.id, invoices.contractId))
      .innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .innerJoin(properties, eq(properties.id, rooms.propertyId))
      .leftJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
      .leftJoin(tenants, eq(tenants.id, contractTenants.tenantId))
      .orderBy(desc(invoices.billingPeriodStart));
  }

  return db
    .select(cols)
    .from(invoices)
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .leftJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
    .leftJoin(tenants, eq(tenants.id, contractTenants.tenantId))
    .innerJoin(
      propertyMembers,
      and(
        eq(propertyMembers.propertyId, properties.id),
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "active"),
      ),
    )
    .orderBy(desc(invoices.billingPeriodStart));
}

export async function getInvoice(
  userId: string,
  role: string,
  invoiceId: string,
): Promise<InvoiceDetail> {
  assertStaff(role);
  const db = getDatabase();

  const [row] = await db
    .select({
      id: invoices.id,
      contractId: invoices.contractId,
      roomNumber: rooms.roomNumber,
      propertyName: properties.name,
      propertyAddress: properties.address,
      tenantName: tenants.fullName,
      tenantPhone: tenants.phone,
      bankCode: properties.bankCode,
      bankAccount: properties.bankAccount,
      accountHolder: properties.accountHolder,
      billingPeriodStart: invoices.billingPeriodStart,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .leftJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
    .leftJoin(tenants, eq(tenants.id, contractTenants.tenantId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy hóa đơn.", []);

  const items = await db
    .select({
      id: invoiceItems.id,
      invoiceId: invoiceItems.invoiceId,
      meterReadingId: invoiceItems.meterReadingId,
      itemType: invoiceItems.itemType,
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPriceSnapshot: invoiceItems.unitPriceSnapshot,
      amount: invoiceItems.amount,
      createdAt: invoiceItems.createdAt,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceItems.createdAt));

  const paymentsList = await db
    .select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      paidAt: payments.paidAt,
      method: payments.method,
      reference: payments.reference,
      note: payments.note,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.paidAt));

  const totalPaid = paymentsList.reduce((sum, p) => sum + p.amount, 0);

  return {
    ...row,
    paidAmount: totalPaid,
    items,
    payments: paymentsList,
  };
}

export async function createInvoice(
  userId: string,
  role: string,
  input: CreateInvoiceInput,
): Promise<InvoiceRow> {
  assertStaff(role);

  // Validate billing period starts on day 01
  const parts = input.billingPeriodStart.split("-");
  if (parts.length !== 3 || parts[2] !== "01") {
    throw new AppError("VALIDATION_ERROR", "Kỳ tính hóa đơn phải là ngày 01 đầu tháng.", [
      { field: "billingPeriodStart", message: "Kỳ hóa đơn phải bắt đầu từ ngày 01 của tháng." },
    ]);
  }

  if (!Number.isInteger(input.totalAmount) || input.totalAmount < 0) {
    throw new AppError("VALIDATION_ERROR", "Tổng tiền hóa đơn không được âm.", [
      { field: "totalAmount", message: "Tổng tiền phải là số nguyên không âm." },
    ]);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(invoices)
    .values({
      contractId: input.contractId,
      billingPeriodStart: input.billingPeriodStart,
      issueDate: input.issueDate ?? null,
      dueDate: input.dueDate ?? null,
      status: "issued",
      totalAmount: input.totalAmount,
    })
    .returning({
      id: invoices.id,
      contractId: invoices.contractId,
      billingPeriodStart: invoices.billingPeriodStart,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    });

  if (!row) throw new AppError("DATABASE_ERROR", "Không thể tạo hóa đơn.");

  if (input.items && input.items.length > 0) {
    await db.insert(invoiceItems).values(
      input.items.map((item) => ({
        invoiceId: row.id,
        meterReadingId: item.meterReadingId ?? null,
        itemType: item.itemType,
        description: item.description,
        quantity: String(item.quantity),
        unitPriceSnapshot: item.unitPriceSnapshot,
        amount: item.amount,
      })),
    );
  }

  if (row.status === "issued") {
    void notifyTenantInvoice(input.contractId, input.billingPeriodStart, row.totalAmount, input.dueDate);
  }

  return { ...row, roomNumber: "", propertyName: "" } as InvoiceRow;
}

async function notifyTenantInvoice(
  contractId: string,
  billingPeriod: string,
  totalAmount: number,
  dueDate?: string | null,
) {
  try {
    const db = getDatabase();
    const tenantsList = await db
      .select({ userId: tenants.userId })
      .from(contractTenants)
      .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
      .where(eq(contractTenants.contractId, contractId));

    for (const t of tenantsList) {
      if (t.userId) {
        await createNotification({
          userId: t.userId,
          title: `Hóa đơn mới kỳ ${billingPeriod}`,
          message: `Hóa đơn tiền phòng kỳ ${billingPeriod} đã được phát hành (${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}). Hạn nộp: ${dueDate || "Ngày 10"}.`,
          type: "invoice",
          link: "/#invoices",
        });
      }
    }
  } catch {
    // Non-blocking
  }
}

async function notifyTenantPayment(invoiceId: string, amount: number) {
  try {
    const db = getDatabase();
    const [inv] = await db
      .select({ contractId: invoices.contractId, billingPeriodStart: invoices.billingPeriodStart })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (inv) {
      const tenantsList = await db
        .select({ userId: tenants.userId })
        .from(contractTenants)
        .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
        .where(eq(contractTenants.contractId, inv.contractId));

      for (const t of tenantsList) {
        if (t.userId) {
          await createNotification({
            userId: t.userId,
            title: `Xác nhận thanh toán hóa đơn`,
            message: `Chủ nhà đã xác nhận thanh toán ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)} cho hóa đơn kỳ ${inv.billingPeriodStart}.`,
            type: "payment",
            link: "/#invoices",
          });
        }
      }
    }
  } catch {
    // Non-blocking
  }
}

export async function updateInvoiceStatus(
  userId: string,
  role: string,
  invoiceId: string,
  status: InvoiceStatus,
): Promise<InvoiceRow> {
  assertStaff(role);

  await getInvoice(userId, role, invoiceId);

  const db = getDatabase();
  const [row] = await db
    .update(invoices)
    .set({ status, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning({
      id: invoices.id,
      contractId: invoices.contractId,
      billingPeriodStart: invoices.billingPeriodStart,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    });

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy hóa đơn.", []);

  if (status === "issued") {
    void notifyTenantInvoice(row.contractId, row.billingPeriodStart, row.totalAmount, row.dueDate);
  }

  return { ...row, roomNumber: "", propertyName: "" } as InvoiceRow;
}

export async function addPayment(
  userId: string,
  role: string,
  invoiceId: string,
  input: AddPaymentInput,
): Promise<PaymentRow> {
  assertStaff(role);

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new AppError("VALIDATION_ERROR", "Số tiền thanh toán phải lớn hơn 0.", [
      { field: "amount", message: "Số tiền thanh toán phải là số nguyên dương." },
    ]);
  }

  const invoice = await getInvoice(userId, role, invoiceId);

  const db = getDatabase();
  const [payment] = await db
    .insert(payments)
    .values({
      invoiceId,
      amount: input.amount,
      paidAt: new Date(),
      method: input.method,
      reference: input.reference ?? null,
      note: input.note ?? null,
    })
    .returning({
      id: payments.id,
      invoiceId: payments.invoiceId,
      amount: payments.amount,
      paidAt: payments.paidAt,
      method: payments.method,
      reference: payments.reference,
      note: payments.note,
      createdAt: payments.createdAt,
    });

  if (!payment) throw new AppError("DATABASE_ERROR", "Không thể ghi nhận thanh toán.");

  // Check total paid
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0) + input.amount;
  const newStatus: InvoiceStatus = totalPaid >= invoice.totalAmount ? "paid" : "partially_paid";

  await db
    .update(invoices)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  void notifyTenantPayment(invoiceId, input.amount);

  return payment;
}

export async function deleteInvoice(
  userId: string,
  role: string,
  invoiceId: string,
): Promise<void> {
  if (role !== "owner") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà mới có thể xóa hóa đơn.", []);
  }

  const existing = await getInvoice(userId, role, invoiceId);

  if (existing.status !== "draft") {
    throw new AppError(
      "BUSINESS_RULE_ERROR",
      "Chỉ có thể xóa hóa đơn ở trạng thái Nháp (draft).",
      [],
    );
  }

  const db = getDatabase();
  await db.delete(invoices).where(eq(invoices.id, invoiceId));
}
