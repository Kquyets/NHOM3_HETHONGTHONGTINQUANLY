import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../../lib/auth/with-auth";
import {
  addPayment,
  type PaymentMethod,
} from "../../../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../../../utils/api-response";

type Params = { params: Promise<{ invoiceId: string }> };

// POST /api/invoices/[invoiceId]/payments
export async function POST(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { invoiceId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { amount, method, reference, note } = body as Record<string, unknown>;

    if (typeof amount !== "number" || amount <= 0) {
      return errorResponse(
        Object.assign(new Error("amount must be a positive number."), {
          code: "VALIDATION_ERROR",
        }),
      );
    }

    const VALID_METHODS: PaymentMethod[] = ["cash", "bank_transfer", "other"];
    if (typeof method !== "string" || !VALID_METHODS.includes(method as PaymentMethod)) {
      return errorResponse(
        Object.assign(
          new Error(`method must be one of: ${VALID_METHODS.join(", ")}.`),
          { code: "VALIDATION_ERROR" },
        ),
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
