import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  deleteInvoice,
  getInvoice,
  updateInvoiceStatus,
  type InvoiceStatus,
} from "../../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

type Params = { params: Promise<{ invoiceId: string }> };

// GET /api/invoices/[invoiceId]
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { invoiceId } = await params;
    const invoice = await getInvoice(ctx.userId, ctx.role, invoiceId);
    return successResponse({ invoice });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/invoices/[invoiceId]
export async function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { invoiceId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { status } = body as Record<string, unknown>;
    const VALID_STATUSES: InvoiceStatus[] = [
      "draft",
      "issued",
      "partially_paid",
      "paid",
      "cancelled",
    ];

    if (typeof status !== "string" || !VALID_STATUSES.includes(status as InvoiceStatus)) {
      return errorResponse(
        Object.assign(
          new Error(`status must be one of: ${VALID_STATUSES.join(", ")}.`),
          { code: "VALIDATION_ERROR" },
        ),
      );
    }

    const invoice = await updateInvoiceStatus(ctx.userId, ctx.role, invoiceId, status as InvoiceStatus);
    return successResponse({ invoice });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/invoices/[invoiceId]
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { invoiceId } = await params;
    await deleteInvoice(ctx.userId, ctx.role, invoiceId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
