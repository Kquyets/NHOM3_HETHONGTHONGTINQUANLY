import { type NextRequest } from "next/server";
import { AppError } from "../../../../../errors/app-error";
import { requireAuthContext } from "../../../../../lib/auth/with-auth";
import {
  addPayment,
  type PaymentMethod,
} from "../../../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../../../utils/api-response";

type Params = { params: Promise<{ invoiceId: string }> };

// POST /api/invoices/[invoiceId]/payments
export async function POST(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { invoiceId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { amount, method, reference, note } = body as Record<string, unknown>;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return errorResponse(new AppError("VALIDATION_ERROR", "amount must be a positive number."));
    }

    const VALID_METHODS: PaymentMethod[] = ["cash", "bank_transfer", "other"];
    if (typeof method !== "string" || !VALID_METHODS.includes(method as PaymentMethod)) {
      return errorResponse(
        new AppError("VALIDATION_ERROR", `method must be one of: ${VALID_METHODS.join(", ")}.`),
      );
    }

    const payment = await addPayment(ctx.userId, ctx.role, invoiceId, {
      amount,
      method: method as PaymentMethod,
      reference: typeof reference === "string" ? reference : null,
      note: typeof note === "string" ? note : null,
    });

    return successResponse({ payment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
