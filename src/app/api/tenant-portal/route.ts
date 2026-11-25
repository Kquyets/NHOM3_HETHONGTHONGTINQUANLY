import { type NextRequest } from "next/server";
import { AppError } from "../../../errors/app-error";
import { requireAuthContext } from "../../../lib/auth/with-auth";
import {
  getTenantPortalData,
  updateTenantProfileSelf,
  notifyLandlordPayment,
} from "../../../modules/tenant-portal/tenant-portal.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/tenant-portal — retrieve tenant portal data (stay, invoices, meters, contract)
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId") || undefined;

    const data = await getTenantPortalData(ctx.userId, roomId);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/tenant-portal — self-update tenant profile (CCCD, vehicle, emergency contact, hometown)
export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const updatedProfile = await updateTenantProfileSelf(ctx.userId, body);
    return successResponse({ tenant: updatedProfile });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/tenant-portal — actions like notify payment
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const body = await request.json().catch(() => ({}));

    if (body.action === "notify-payment" || body.invoiceId) {
      if (!body.invoiceId || typeof body.invoiceId !== "string") {
        return errorResponse(new AppError("VALIDATION_ERROR", "invoiceId is required."));
      }
      const result = await notifyLandlordPayment(ctx.userId, body.invoiceId, body.note);
      return successResponse(result);
    }

    return errorResponse(new AppError("VALIDATION_ERROR", "Invalid action."));
  } catch (error) {
    return errorResponse(error);
  }
}
