import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  deleteMeterReading,
  getMeterReading,
} from "../../../../modules/meters/meter.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

type Params = { params: Promise<{ readingId: string }> };

// GET /api/meters/[readingId]
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { readingId } = await params;
    const reading = await getMeterReading(ctx.userId, ctx.role, readingId);
    return successResponse({ reading });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/meters/[readingId]
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { readingId } = await params;
    await deleteMeterReading(ctx.userId, ctx.role, readingId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
