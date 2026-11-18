import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../../lib/auth/with-auth";
import {
  addPropertyMember,
  listPropertyMembers,
  removePropertyMember,
} from "../../../../../modules/properties/property.service";
import { errorResponse, successResponse } from "../../../../../utils/api-response";

type Params = { params: Promise<{ propertyId: string }> };

// GET /api/properties/[propertyId]/members — List managers
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId } = await params;
    const members = await listPropertyMembers(ctx.userId, ctx.role, propertyId);
    return successResponse({ members, total: members.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/properties/[propertyId]/members — Add manager
export async function POST(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body.emailOrPhone !== "string" || !body.emailOrPhone.trim()) {
      return errorResponse(
        Object.assign(new Error("emailOrPhone is required."), { code: "VALIDATION_ERROR" }),
      );
    }

    const member = await addPropertyMember(
      ctx.userId,
      ctx.role,
      propertyId,
      body.emailOrPhone.trim(),
    );

    return successResponse({ member }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/properties/[propertyId]/members — Remove manager
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { propertyId } = await params;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return errorResponse(
        Object.assign(new Error("memberId query parameter is required."), {
          code: "VALIDATION_ERROR",
        }),
      );
    }

    await removePropertyMember(ctx.userId, ctx.role, propertyId, memberId);
    return successResponse({ removed: true });
  } catch (error) {
    return errorResponse(error);
  }
}
