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
import type { InvoiceDetail, InvoiceItemRow, InvoiceRow, PaymentRow } from "../invoices/invoice.service";

export type TenantProfile = {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
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
  invoices: InvoiceDetail[];
  meters: TenantMeterReading[];
};

export async function getTenantPortalData(userId: string): Promise<TenantPortalData> {
  const db = getDatabase();

  // 1. Find tenant record linked to userId
  const [tenantRow] = await db
    .select({
      id: tenants.id,
      userId: tenants.userId,
      fullName: tenants.fullName,
      phone: tenants.phone,
      birthDate: tenants.birthDate,
      email: users.email,
    })
    .from(tenants)
    .innerJoin(users, eq(users.id, tenants.userId))
    .where(eq(tenants.userId, userId))
    .limit(1);

  if (!tenantRow) {
    return {
      tenant: null,
      stay: null,
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

  // Pick active stay or most recent
  const activeStay: TenantStay | null = contractList.find((c) => c.contractStatus === "active") ?? contractList[0] ?? null;

  // 3. Find invoices for tenant's contracts
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
    .where(eq(contractTenants.tenantId, tenantRow.id))
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

  // 4. Find meters for current stay
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
    invoices: fullInvoices,
    meters: meterList,
  };
}
