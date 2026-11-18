import { and, asc, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import {
  contracts,
  contractTenants,
  invoiceItems,
  invoices,
  meterReadings,
  payments,
  properties,
  rooms,
  tenants,
  users,
} from "../../lib/database/schema";
import type { InvoiceDetail } from "../invoices/invoice.service";
import type { ContractRow } from "../contracts/contract.service";
import { createNotification } from "../notifications/notification.service";
import { AppError } from "../../errors/app-error";

export type TenantProfile = {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  citizenId?: string | null;
  hometown?: string | null;
  vehicleNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
};

export type TenantStay = {
  contractId: string;
  roomId: string;
  roomNumber: string;
  propertyName: string;
  propertyAddress: string | null;
  bankCode: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  monthlyRent: number;
  deposit: number;
  startDate: string;
  endDate: string | null;
  contractStatus: string;
};

export type TenantMeterReading = {
  id: string;
  utilityType: "electricity" | "water";
  billingPeriod: string;
  previousValue: string;
  currentValue: string;
  consumption: number;
  unitPriceSnapshot: number;
  createdAt: Date;
};

export type TenantPortalData = {
  tenant: TenantProfile | null;
  stay: TenantStay | null;
  stays: TenantStay[];
  contract: ContractRow | null;
  invoices: InvoiceDetail[];
  meters: TenantMeterReading[];
};

export type UpdateTenantProfileSelfInput = {
  fullName?: string;
  phone?: string | null;
  birthDate?: string | null;
  citizenId?: string | null;
  hometown?: string | null;
  vehicleNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
};

export async function getTenantPortalData(
  userId: string,
  selectedStayRoomId?: string,
): Promise<TenantPortalData> {
  const db = getDatabase();

  // 1. Find tenant record linked to userId
  let tenantRow = (
    await db
      .select({
        id: tenants.id,
        userId: tenants.userId,
        fullName: tenants.fullName,
        phone: tenants.phone,
        birthDate: tenants.birthDate,
        citizenId: tenants.nationalIdEncrypted,
        hometown: tenants.hometown,
        vehicleNumber: tenants.vehicleNumber,
        emergencyContactName: tenants.emergencyContactName,
        emergencyContactPhone: tenants.emergencyContactPhone,
        idCardFrontUrl: tenants.idCardFrontUrl,
        idCardBackUrl: tenants.idCardBackUrl,
        email: users.email,
      })
      .from(tenants)
      .innerJoin(users, eq(users.id, tenants.userId))
      .where(eq(tenants.userId, userId))
      .limit(1)
  )[0];

  // Fallback: If not linked by userId, match by phone number from users table
  if (!tenantRow) {
    const [currentUser] = await db
      .select({ id: users.id, phone: users.phone, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (currentUser?.phone) {
      const [unlinkedTenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.phone, currentUser.phone.trim()))
        .limit(1);

      if (unlinkedTenant) {
        // Auto-link userId so future lookups are immediate
        await db
          .update(tenants)
          .set({ userId: currentUser.id, updatedAt: new Date() })
          .where(eq(tenants.id, unlinkedTenant.id));

        tenantRow = {
          id: unlinkedTenant.id,
          userId: currentUser.id,
          fullName: unlinkedTenant.fullName,
          phone: unlinkedTenant.phone,
          birthDate: unlinkedTenant.birthDate,
          citizenId: unlinkedTenant.nationalIdEncrypted,
          hometown: unlinkedTenant.hometown,
          vehicleNumber: unlinkedTenant.vehicleNumber,
          emergencyContactName: unlinkedTenant.emergencyContactName,
          emergencyContactPhone: unlinkedTenant.emergencyContactPhone,
          idCardFrontUrl: unlinkedTenant.idCardFrontUrl,
          idCardBackUrl: unlinkedTenant.idCardBackUrl,
          email: currentUser.email,
        };
      }
    }
  }

  if (!tenantRow) {
    return {
      tenant: null,
      stay: null,
      stays: [],
      contract: null,
      invoices: [],
      meters: [],
    };
  }

  const tenantProfile: TenantProfile = {
    id: tenantRow.id,
    userId: tenantRow.userId ?? userId,
    fullName: tenantRow.fullName,
    phone: tenantRow.phone,
    email: tenantRow.email ?? null,
    birthDate: tenantRow.birthDate,
    citizenId: tenantRow.citizenId,
    hometown: tenantRow.hometown,
    vehicleNumber: tenantRow.vehicleNumber,
    emergencyContactName: tenantRow.emergencyContactName,
    emergencyContactPhone: tenantRow.emergencyContactPhone,
    idCardFrontUrl: tenantRow.idCardFrontUrl,
    idCardBackUrl: tenantRow.idCardBackUrl,
  };

  // 2. Find contracts
  const contractList = await db
    .select({
      contractId: contracts.id,
      roomId: rooms.id,
      roomNumber: rooms.roomNumber,
      propertyName: properties.name,
      propertyAddress: properties.address,
      bankCode: properties.bankCode,
      bankAccount: properties.bankAccount,
      accountHolder: properties.accountHolder,
      monthlyRent: contracts.monthlyRentSnapshot,
      deposit: contracts.depositSnapshot,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      contractStatus: contracts.status,
    })
    .from(contractTenants)
    .innerJoin(contracts, eq(contracts.id, contractTenants.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(eq(contractTenants.tenantId, tenantRow.id))
    .orderBy(desc(contracts.startDate));

  // Determine active stay (honoring selectedStayRoomId if specified)
  const activeStay: TenantStay | null =
    (selectedStayRoomId ? contractList.find((c) => c.roomId === selectedStayRoomId) : null) ??
    contractList.find((c) => c.contractStatus === "active") ??
    contractList[0] ??
    null;

  // 3. Complete Contract Details for Printable Contract View
  let activeContractData: ContractRow | null = null;
  if (activeStay) {
    const [cRow] = await db
      .select({
        id: contracts.id,
        roomId: rooms.id,
        roomNumber: rooms.roomNumber,
        propertyName: properties.name,
        propertyAddress: properties.address,
        startDate: contracts.startDate,
        endDate: contracts.endDate,
        monthlyRentSnapshot: contracts.monthlyRentSnapshot,
        depositSnapshot: contracts.depositSnapshot,
        paymentCycleMonths: contracts.paymentCycleMonths,
        status: contracts.status,
        landlordName: users.fullName,
        landlordPhone: users.phone,
        createdAt: contracts.createdAt,
        updatedAt: contracts.updatedAt,
      })
      .from(contracts)
      .innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .innerJoin(properties, eq(properties.id, rooms.propertyId))
      .leftJoin(users, eq(users.id, properties.ownerId))
      .where(eq(contracts.id, activeStay.contractId))
      .limit(1);

    if (cRow) {
      const tenantList = await db
        .select({
          id: tenants.id,
          fullName: tenants.fullName,
          phone: tenants.phone,
          citizenId: tenants.nationalIdEncrypted,
          userId: tenants.userId,
        })
        .from(contractTenants)
        .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
        .where(eq(contractTenants.contractId, cRow.id));

      activeContractData = {
        ...cRow,
        tenants: tenantList,
      };
    }
  }

  // 4. Find invoices for tenant's contracts (filtered by activeStay if present to avoid cross-room confusion)
  const invoiceWhereClause = activeStay
    ? and(
        eq(contractTenants.tenantId, tenantRow.id),
        eq(contracts.id, activeStay.contractId),
      )
    : eq(contractTenants.tenantId, tenantRow.id);

  const invoiceRows = await db
    .select({
      id: invoices.id,
      contractId: invoices.contractId,
      roomNumber: rooms.roomNumber,
      propertyName: properties.name,
      propertyAddress: properties.address,
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
    .innerJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(invoiceWhereClause)
    .orderBy(desc(invoices.billingPeriodStart));

  // Enrich invoices with items and payments
  const fullInvoices: InvoiceDetail[] = await Promise.all(
    invoiceRows.map(async (inv): Promise<InvoiceDetail> => {
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
        .where(eq(invoiceItems.invoiceId, inv.id))
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
        .where(eq(payments.invoiceId, inv.id))
        .orderBy(desc(payments.paidAt));

      const paidAmount = paymentsList.reduce((sum, p) => sum + p.amount, 0);

      return {
        ...inv,
        tenantName: tenantRow.fullName,
        tenantPhone: tenantRow.phone,
        paidAmount,
        items,
        payments: paymentsList,
      };
    }),
  );

  // 5. Find meters for current stay
  let meterList: TenantMeterReading[] = [];
  if (activeStay) {
    const rawMeters = await db
      .select({
        id: meterReadings.id,
        utilityType: meterReadings.utilityType,
        billingPeriod: meterReadings.billingPeriod,
        previousValue: meterReadings.previousValue,
        currentValue: meterReadings.currentValue,
        unitPriceSnapshot: meterReadings.unitPriceSnapshot,
        createdAt: meterReadings.createdAt,
      })
      .from(meterReadings)
      .where(eq(meterReadings.roomId, activeStay.roomId))
      .orderBy(desc(meterReadings.billingPeriod))
      .limit(12);

    meterList = rawMeters.map((m) => {
      const prev = Number(m.previousValue) || 0;
      const curr = Number(m.currentValue) || 0;
      return {
        ...m,
        consumption: Math.max(0, curr - prev),
      };
    });
  }

  return {
    tenant: tenantProfile,
    stay: activeStay,
    stays: contractList,
    contract: activeContractData,
    invoices: fullInvoices,
    meters: meterList,
  };
}

/**
 * Tenant self-updates their profile (CCCD, vehicle, emergency contact, hometown)
 */
export async function updateTenantProfileSelf(
  userId: string,
  input: UpdateTenantProfileSelfInput,
): Promise<TenantProfile> {
  const db = getDatabase();

  let [tenantRow] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.userId, userId))
    .limit(1);

  if (!tenantRow) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user?.phone) {
      [tenantRow] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.phone, user.phone.trim()))
        .limit(1);
    }
  }

  if (!tenantRow) {
    throw new AppError("NOT_FOUND", "Hồ sơ khách thuê không tồn tại.");
  }

  const updates: Partial<typeof tenants.$inferInsert> = {
    updatedAt: new Date(),
    userId, // Ensure linked
  };

  if (input.fullName !== undefined) updates.fullName = input.fullName.trim();
  if (input.phone !== undefined) updates.phone = input.phone?.trim() ?? null;
  if (input.birthDate !== undefined) updates.birthDate = input.birthDate ?? null;
  if (input.citizenId !== undefined) updates.nationalIdEncrypted = input.citizenId?.trim() ?? null;
  if (input.hometown !== undefined) updates.hometown = input.hometown?.trim() ?? null;
  if (input.vehicleNumber !== undefined) updates.vehicleNumber = input.vehicleNumber?.trim() ?? null;
  if (input.emergencyContactName !== undefined) updates.emergencyContactName = input.emergencyContactName?.trim() ?? null;
  if (input.emergencyContactPhone !== undefined) updates.emergencyContactPhone = input.emergencyContactPhone?.trim() ?? null;
  if (input.idCardFrontUrl !== undefined) updates.idCardFrontUrl = input.idCardFrontUrl?.trim() ?? null;
  if (input.idCardBackUrl !== undefined) updates.idCardBackUrl = input.idCardBackUrl?.trim() ?? null;

  const [updated] = await db
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, tenantRow.id))
    .returning();

  return {
    id: updated.id,
    userId: updated.userId ?? userId,
    fullName: updated.fullName,
    phone: updated.phone,
    email: null,
    birthDate: updated.birthDate,
    citizenId: updated.nationalIdEncrypted,
    hometown: updated.hometown,
    vehicleNumber: updated.vehicleNumber,
    emergencyContactName: updated.emergencyContactName,
    emergencyContactPhone: updated.emergencyContactPhone,
    idCardFrontUrl: updated.idCardFrontUrl,
    idCardBackUrl: updated.idCardBackUrl,
  };
}

/**
 * Tenant notifies landlord that payment has been transferred
 */
export async function notifyLandlordPayment(
  userId: string,
  invoiceId: string,
  note?: string,
): Promise<{ success: boolean; message: string }> {
  const db = getDatabase();

  const [inv] = await db
    .select({
      id: invoices.id,
      contractId: invoices.contractId,
      status: invoices.status,
      billingPeriodStart: invoices.billingPeriodStart,
      totalAmount: invoices.totalAmount,
      roomNumber: rooms.roomNumber,
      propertyName: properties.name,
      ownerId: properties.ownerId,
    })
    .from(invoices)
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!inv) {
    throw new AppError("NOT_FOUND", "Hóa đơn không tồn tại.");
  }

  if (inv.status === "paid") {
    throw new AppError("BUSINESS_RULE_ERROR", "Hóa đơn này đã được thanh toán rồi.");
  }

  const [sender] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!sender) {
    throw new AppError("UNAUTHORIZED", "Người dùng không tồn tại.");
  }

  // IDOR & Authorization check: verify user is indeed a tenant on this invoice's contract
  let [tenantRow] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.userId, userId))
    .limit(1);

  if (!tenantRow && sender.phone) {
    [tenantRow] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.phone, sender.phone))
      .limit(1);
  }

  if (!tenantRow) {
    throw new AppError("FORBIDDEN", "Bạn không có quyền thông báo thanh toán cho hóa đơn này.");
  }

  const [isContractTenant] = await db
    .select({ id: contractTenants.id })
    .from(contractTenants)
    .where(
      and(
        eq(contractTenants.contractId, inv.contractId),
        eq(contractTenants.tenantId, tenantRow.id),
      ),
    )
    .limit(1);

  if (!isContractTenant) {
    throw new AppError("FORBIDDEN", "Hóa đơn này không thuộc hợp đồng phòng thuê của bạn.");
  }

  const senderName = sender.fullName || sender.email || "Khách thuê";

  await createNotification({
    userId: inv.ownerId,
    title: "Khách thuê báo đã chuyển khoản",
    message: `${senderName} (Phòng ${inv.roomNumber} - ${inv.propertyName}) vừa báo đã chuyển khoản ${inv.totalAmount.toLocaleString("vi-VN")} đ cho hóa đơn kỳ ${inv.billingPeriodStart}.${note ? ` Ghi chú: ${note}` : ""}`,
    type: "payment",
    link: "/invoices",
  });

  return {
    success: true,
    message: "Đã gửi thông báo đến chủ nhà thành công. Chủ nhà sẽ kiểm tra sao kê và gạch nợ sớm.",
  };
}
