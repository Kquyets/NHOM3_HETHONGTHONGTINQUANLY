import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { requireAuthContext } from "../../../../lib/auth/with-auth";
import {
  deleteProperty,
  getProperty,
  updateProperty,
} from "../../../../modules/properties/property.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

type Params = { params: Promise<{ propertyId: string }> };

// GET /api/properties/:propertyId
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { propertyId } = await params;
    const property = await getProperty(ctx.userId, ctx.role, propertyId);
    return successResponse({ property });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/properties/:propertyId
export async function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { propertyId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { name, address, bankCode, bankAccount, accountHolder } = body as Record<string, unknown>;

    const property = await updateProperty(ctx.userId, ctx.role, propertyId, {
      name: typeof name === "string" ? name : undefined,
      address: address === null ? null : typeof address === "string" ? address : undefined,
      bankCode: bankCode === null ? null : typeof bankCode === "string" ? bankCode : undefined,
      bankAccount: bankAccount === null ? null : typeof bankAccount === "string" ? bankAccount : undefined,
      accountHolder: accountHolder === null ? null : typeof accountHolder === "string" ? accountHolder : undefined,
    });

    return successResponse({ property });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/properties/:propertyId
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { propertyId } = await params;
    await deleteProperty(ctx.userId, ctx.role, propertyId);
    return successResponse({ message: "Property deleted." });
  } catch (error) {
    return errorResponse(error);
  }
}
