import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import {
  createInvoice,
  listInvoices,
  type CreateInvoiceItemInput,
} from "../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/invoices
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const data = await listInvoices(ctx.userId, ctx.role);
    return successResponse({ invoices: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/invoices
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { contractId, billingPeriodStart, issueDate, dueDate, totalAmount, items } =
      body as Record<string, unknown>;

    if (
      typeof contractId !== "string" ||
      typeof billingPeriodStart !== "string"
    ) {
      return errorResponse(
        Object.assign(new Error("Missing contractId or billingPeriodStart."), {
          code: "VALIDATION_ERROR",
        }),
      );
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
