import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";

import { AppError } from "../../errors/app-error";
import type { AuthenticatedUser } from "../../lib/auth/session";
import { getDatabase } from "../../lib/database/client";
import {
  contractTenants,
  contracts,
  invoiceItems,
  invoices,
  meterReadings,
  payments,
  rooms,
  tenants,
  utilityRates,
} from "../../lib/database/schema";
import { requirePropertyAccess, requirePropertyManager } from "../properties/access";
import type {
  contractInputSchema,
  contractPatchSchema,
  invoiceInputSchema,
  meterInputSchema,
  paymentInputSchema,
  tenantInputSchema,
  tenantPatchSchema,
  utilityRateInputSchema,
} from "./validation";
import { calculateUtilityAmount } from "./billing";

type TenantInput = typeof tenantInputSchema._output;
type TenantPatch = typeof tenantPatchSchema._output;
type ContractInput = typeof contractInputSchema._output;
type ContractPatch = typeof contractPatchSchema._output;
type RateInput = typeof utilityRateInputSchema._output;
type MeterInput = typeof meterInputSchema._output;
type InvoiceInput = typeof invoiceInputSchema._output;
type PaymentInput = typeof paymentInputSchema._output;

const today = () => new Date().toISOString().slice(0, 10);

export async function listTenants(user: AuthenticatedUser, propertyId: string) {
  requirePropertyManager(user);
  await requirePropertyAccess(user, propertyId);
  return getDatabase().selectDistinct({
    id: tenants.id,
    fullName: tenants.fullName,
    phone: tenants.phone,
    birthDate: tenants.birthDate,
  }).from(tenants)
    .innerJoin(contractTenants, eq(contractTenants.tenantId, tenants.id))
    .innerJoin(contracts, eq(contracts.id, contractTenants.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .where(eq(rooms.propertyId, propertyId));
}

export async function createTenant(user: AuthenticatedUser, input: TenantInput) {
  requirePropertyManager(user);
  await requirePropertyAccess(user, input.propertyId);
  const [tenant] = await getDatabase().insert(tenants).values({
    fullName: input.fullName,
    phone: input.phone ?? null,
    birthDate: input.birthDate ?? null,
  }).returning({ id: tenants.id, fullName: tenants.fullName, phone: tenants.phone, birthDate: tenants.birthDate });
  return tenant;
}

export async function updateTenant(user: AuthenticatedUser, tenantId: string, propertyId: string, input: TenantPatch) {
  requirePropertyManager(user);
  await requirePropertyAccess(user, propertyId);
  const [link] = await getDatabase().select({ id: tenants.id }).from(tenants)
    .innerJoin(contractTenants, eq(contractTenants.tenantId, tenants.id))
    .innerJoin(contracts, eq(contracts.id, contractTenants.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .where(and(eq(tenants.id, tenantId), eq(rooms.propertyId, propertyId))).limit(1);
  if (!link) throw new AppError("NOT_FOUND", "Tenant not found.");
  const [tenant] = await getDatabase().update(tenants).set({ ...input, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning({ id: tenants.id, fullName: tenants.fullName, phone: tenants.phone, birthDate: tenants.birthDate });
  return tenant;
}

export async function listContracts(user: AuthenticatedUser, propertyId: string) {
  await requirePropertyAccess(user, propertyId);
  const database = getDatabase();
  const projection = {
    id: contracts.id,
    roomId: contracts.roomId,
    roomNumber: rooms.roomNumber,
    startDate: contracts.startDate,
    endDate: contracts.endDate,
    status: contracts.status,
    monthlyRent: contracts.monthlyRentSnapshot,
    deposit: contracts.depositSnapshot,
  };

  if (user.role === "tenant") {
    return database.selectDistinct(projection).from(contracts)
      .innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .innerJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
      .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
      .where(and(eq(rooms.propertyId, propertyId), eq(tenants.userId, user.userId)))
      .orderBy(asc(contracts.startDate));
  }
  return database.select(projection).from(contracts).innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .where(eq(rooms.propertyId, propertyId)).orderBy(asc(contracts.startDate));
}

export async function createContract(user: AuthenticatedUser, input: ContractInput) {
  requirePropertyManager(user);
  const database = getDatabase();
  return database.transaction(async (tx) => {
    const [room] = await tx.select({ id: rooms.id, propertyId: rooms.propertyId, monthlyRent: rooms.monthlyRent })
      .from(rooms).where(eq(rooms.id, input.roomId)).limit(1);
    if (!room) throw new AppError("NOT_FOUND", "Room not found.");
    await requirePropertyAccess(user, room.propertyId);

    const linkedTenants = await tx.select({ id: tenants.id }).from(tenants).where(inArray(tenants.id, input.tenantIds));
    if (linkedTenants.length !== new Set(input.tenantIds).size) throw new AppError("NOT_FOUND", "One or more tenants were not found.");
    const [contract] = await tx.insert(contracts).values({
      roomId: room.id,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      status: input.status,
      monthlyRentSnapshot: room.monthlyRent,
      depositSnapshot: input.deposit,
    }).returning();
    await tx.insert(contractTenants).values(input.tenantIds.map((tenantId) => ({ contractId: contract.id, tenantId })));
    return contract;
  });
}

export async function updateContract(user: AuthenticatedUser, contractId: string, input: ContractPatch) {
  requirePropertyManager(user);
  const database = getDatabase();
  const [current] = await database.select({ id: contracts.id, roomId: rooms.id, propertyId: rooms.propertyId })
    .from(contracts).innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .where(eq(contracts.id, contractId)).limit(1);
  if (!current) throw new AppError("NOT_FOUND", "Contract not found.");
  await requirePropertyAccess(user, current.propertyId);
  const [contract] = await database.update(contracts).set({
    status: input.status,
    endDate: input.endDate ?? (input.status === "ended" ? today() : undefined),
    updatedAt: new Date(),
  }).where(eq(contracts.id, contractId)).returning();
  return contract;
}

export async function listUtilityRates(user: AuthenticatedUser, propertyId: string) {
  await requirePropertyAccess(user, propertyId);
  return getDatabase().select().from(utilityRates).where(eq(utilityRates.propertyId, propertyId))
    .orderBy(asc(utilityRates.effectiveFrom));
}

export async function createUtilityRate(user: AuthenticatedUser, input: RateInput) {
  requirePropertyManager(user);
  await requirePropertyAccess(user, input.propertyId);
  const [rate] = await getDatabase().insert(utilityRates).values(input).returning();
  return rate;
}

export async function listMeterReadings(user: AuthenticatedUser, propertyId: string) {
  await requirePropertyAccess(user, propertyId);
  return getDatabase().select({
    id: meterReadings.id,
    roomId: meterReadings.roomId,
    roomNumber: rooms.roomNumber,
    utilityType: meterReadings.utilityType,
    billingPeriod: meterReadings.billingPeriod,
    previousValue: meterReadings.previousValue,
    currentValue: meterReadings.currentValue,
    unitPrice: meterReadings.unitPriceSnapshot,
  }).from(meterReadings).innerJoin(rooms, eq(rooms.id, meterReadings.roomId))
    .where(eq(rooms.propertyId, propertyId))
    .orderBy(asc(meterReadings.billingPeriod), asc(rooms.roomNumber));
}

export async function createMeterReading(user: AuthenticatedUser, input: MeterInput) {
  requirePropertyManager(user);
  const database = getDatabase();
  const [room] = await database.select({ id: rooms.id, propertyId: rooms.propertyId })
    .from(rooms).where(eq(rooms.id, input.roomId)).limit(1);
  if (!room) throw new AppError("NOT_FOUND", "Room not found.");
  await requirePropertyAccess(user, room.propertyId);

  const [rate] = await database.select().from(utilityRates).where(and(
    eq(utilityRates.id, input.utilityRateId),
    eq(utilityRates.propertyId, room.propertyId),
    eq(utilityRates.utilityType, input.utilityType),
    lte(utilityRates.effectiveFrom, input.billingPeriod),
  )).limit(1);
  if (!rate || (rate.effectiveTo && input.billingPeriod >= rate.effectiveTo)) {
    throw new AppError("BUSINESS_RULE_ERROR", "No matching utility rate is effective for this period.");
  }
  const [reading] = await database.insert(meterReadings).values({
    roomId: room.id,
    propertyId: room.propertyId,
    utilityType: input.utilityType,
    billingPeriod: input.billingPeriod,
    previousValue: input.previousValue.toFixed(3),
    currentValue: input.currentValue.toFixed(3),
    utilityRateId: rate.id,
    unitPriceSnapshot: rate.unitPrice,
  }).returning();
  return reading;
}

export async function createInvoice(user: AuthenticatedUser, input: InvoiceInput) {
  requirePropertyManager(user);
  const database = getDatabase();
  return database.transaction(async (tx) => {
    const [contract] = await tx.select({
      id: contracts.id,
      roomId: rooms.id,
      propertyId: rooms.propertyId,
      monthlyRent: contracts.monthlyRentSnapshot,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      status: contracts.status,
    }).from(contracts).innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .where(eq(contracts.id, input.contractId)).limit(1);
    if (!contract || contract.status === "draft" || contract.status === "cancelled") {
      throw new AppError("BUSINESS_RULE_ERROR", "Only an active or ended contract can be invoiced.");
    }
    await requirePropertyAccess(user, contract.propertyId);
    if (input.billingPeriodStart < contract.startDate || (contract.endDate && input.billingPeriodStart > contract.endDate)) {
      throw new AppError("BUSINESS_RULE_ERROR", "Invoice period falls outside the contract dates.");
    }

    const readings = await tx.select().from(meterReadings).where(and(
      eq(meterReadings.roomId, contract.roomId),
      eq(meterReadings.billingPeriod, input.billingPeriodStart),
    ));
    const utilityLines = readings.map((reading) => ({
      meterReadingId: reading.id,
      itemType: reading.utilityType,
      description: reading.utilityType === "electricity" ? "Tiền điện" : "Tiền nước",
      quantity: (Number(reading.currentValue) - Number(reading.previousValue)).toFixed(3),
      unitPriceSnapshot: reading.unitPriceSnapshot,
      amount: calculateUtilityAmount(reading.previousValue, reading.currentValue, reading.unitPriceSnapshot),
    }));
    const totalAmount = contract.monthlyRent + utilityLines.reduce((sum, line) => sum + line.amount, 0);
    const [invoice] = await tx.insert(invoices).values({
      contractId: contract.id,
      billingPeriodStart: input.billingPeriodStart,
      issueDate: today(),
      dueDate: input.dueDate ?? null,
      status: "issued",
      totalAmount,
    }).returning();
    await tx.insert(invoiceItems).values([
      {
        invoiceId: invoice.id,
        itemType: "rent",
        description: "Tiền thuê phòng",
        quantity: "1.000",
        unitPriceSnapshot: contract.monthlyRent,
        amount: contract.monthlyRent,
      },
      ...utilityLines.map((line) => ({ invoiceId: invoice.id, ...line })),
    ]);
    return { ...invoice, items: utilityLines.length + 1 };
  });
}

export async function listInvoices(user: AuthenticatedUser, propertyId: string) {
  await requirePropertyAccess(user, propertyId);
  const database = getDatabase();
  const result = await database.select({
    id: invoices.id,
    contractId: invoices.contractId,
    roomId: contracts.roomId,
    roomNumber: rooms.roomNumber,
    billingPeriodStart: invoices.billingPeriodStart,
    dueDate: invoices.dueDate,
    status: invoices.status,
    totalAmount: invoices.totalAmount,
  }).from(invoices)
    .innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .where(eq(rooms.propertyId, propertyId))
    .orderBy(asc(invoices.billingPeriodStart));
  if (user.role !== "tenant") return result;
  const links = await database.select({ contractId: contractTenants.contractId })
    .from(contractTenants).innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
    .where(eq(tenants.userId, user.userId));
  const contractIds = new Set(links.map(({ contractId }) => contractId));
  return result.filter((invoice) => contractIds.has(invoice.contractId));
}

export async function getInvoice(user: AuthenticatedUser, invoiceId: string) {
  const database = getDatabase();
  const [invoice] = await database.select({
    id: invoices.id,
    contractId: invoices.contractId,
    propertyId: rooms.propertyId,
    roomId: rooms.id,
    billingPeriodStart: invoices.billingPeriodStart,
    issueDate: invoices.issueDate,
    dueDate: invoices.dueDate,
    status: invoices.status,
    totalAmount: invoices.totalAmount,
  }).from(invoices).innerJoin(contracts, eq(contracts.id, invoices.contractId))
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.");
  await requirePropertyAccess(user, invoice.propertyId);
  if (user.role === "tenant") {
    const [link] = await database.select({ id: contractTenants.id }).from(contractTenants)
      .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
      .where(and(eq(contractTenants.contractId, invoice.contractId), eq(tenants.userId, user.userId))).limit(1);
    if (!link) throw new AppError("NOT_FOUND", "Invoice not found.");
  }
  const [paid] = await database.select({ amount: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
    .from(payments).where(eq(payments.invoiceId, invoice.id));
  const [items] = await database.select({ rows: sql<number>`count(*)::int` }).from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
  const lines = await database.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
  const paymentRows = await database.select().from(payments).where(eq(payments.invoiceId, invoice.id)).orderBy(asc(payments.paidAt));
  const paidAmount = Number(paid?.amount ?? 0);
  return {
    ...invoice,
    items: lines,
    payments: paymentRows,
    totalItemCount: items?.rows ?? 0,
    paidAmount,
    balance: invoice.totalAmount - paidAmount,
    overdue: Boolean(invoice.dueDate && invoice.dueDate < today() && invoice.totalAmount > paidAmount),
  };
}

export async function recordPayment(user: AuthenticatedUser, input: PaymentInput) {
  requirePropertyManager(user);
  const database = getDatabase();
  return database.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM invoices WHERE id = ${input.invoiceId} FOR UPDATE`);
    const [invoice] = await tx.select({
      id: invoices.id,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      propertyId: rooms.propertyId,
    }).from(invoices).innerJoin(contracts, eq(contracts.id, invoices.contractId))
      .innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .where(eq(invoices.id, input.invoiceId)).limit(1);
    if (!invoice) throw new AppError("NOT_FOUND", "Invoice not found.");
    await requirePropertyAccess(user, invoice.propertyId);
    if (invoice.status === "cancelled") throw new AppError("BUSINESS_RULE_ERROR", "Cancelled invoices cannot receive payments.");
    const [paid] = await tx.select({ amount: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments).where(eq(payments.invoiceId, invoice.id));
    const paidAmount = Number(paid?.amount ?? 0);
    if (paidAmount + input.amount > invoice.totalAmount) throw new AppError("BUSINESS_RULE_ERROR", "Payment exceeds the invoice balance.");

    const [payment] = await tx.insert(payments).values({
      invoiceId: invoice.id,
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      reference: input.reference ?? null,
      note: input.note ?? null,
    }).returning();
    const newStatus = paidAmount + input.amount === invoice.totalAmount ? "paid" : "partially_paid";
    await tx.update(invoices).set({ status: newStatus, updatedAt: new Date() }).where(eq(invoices.id, invoice.id));
    return payment;
  });
}

export async function listPayments(user: AuthenticatedUser, invoiceId: string) {
  await getInvoice(user, invoiceId);
  return getDatabase().select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(asc(payments.paidAt));
}
