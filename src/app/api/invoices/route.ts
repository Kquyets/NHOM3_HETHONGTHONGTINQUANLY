import { type NextRequest } from "next/server";
import { AppError } from "../../../errors/app-error";
import { requireAuthContext } from "../../../lib/auth/with-auth";
import {
  createInvoice,
  listInvoices,
  type CreateInvoiceItemInput,
} from "../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/invoices
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const data = await listInvoices(ctx.userId, ctx.role);
    return successResponse({ invoices: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/invoices
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { contractId, billingPeriodStart, issueDate, dueDate, totalAmount, items } =
      body as Record<string, unknown>;

    if (
      typeof contractId !== "string" ||
      !contractId.trim() ||
      typeof billingPeriodStart !== "string"
    ) {
      return errorResponse(new AppError("VALIDATION_ERROR", "Missing contractId or billingPeriodStart."));
    }

    const invoice = await createInvoice(ctx.userId, ctx.role, {
      contractId,
      billingPeriodStart,
      issueDate: typeof issueDate === "string" ? issueDate : null,
      dueDate: typeof dueDate === "string" ? dueDate : null,
      totalAmount: Number(totalAmount || 0),
      items: Array.isArray(items) ? (items as CreateInvoiceItemInput[]) : [],
    });

    return successResponse({ invoice }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
