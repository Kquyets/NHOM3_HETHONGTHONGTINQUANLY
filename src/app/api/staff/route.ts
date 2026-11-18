import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import {
  listAllStaffForOwner,
  addPropertyMember,
  removePropertyMember,
  createAndAssignStaffMember,
} from "../../../modules/properties/property.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/staff — List all staff across owner properties
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const staff = await listAllStaffForOwner(ctx.userId, ctx.role);
    return successResponse({ staff, total: staff.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/staff — Assign or directly create staff member for properties
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Dữ liệu gửi lên không hợp lệ."), { code: "VALIDATION_ERROR" }),
      );
    }

    const propertyIds: string[] = Array.isArray(body.propertyIds)
      ? body.propertyIds
      : body.propertyId
      ? [body.propertyId]
      : [];

    if (propertyIds.length === 0) {
      return errorResponse(
        Object.assign(new Error("Vui lòng chọn ít nhất một nhà trọ phân công."), {
          code: "VALIDATION_ERROR",
        }),
      );
    }

    // Direct account creation or if fullName/phone is provided
    if (body.createAccount || body.mode === "create" || (body.phone && body.fullName)) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (!phone) {
        return errorResponse(
          Object.assign(new Error("Số điện thoại là bắt buộc để tạo tài khoản nhân viên."), {
            code: "VALIDATION_ERROR",
          }),
        );
      }

      const result = await createAndAssignStaffMember(ctx.userId, ctx.role, {
        fullName: typeof body.fullName === "string" ? body.fullName : "",
        phone,
        email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : undefined,
        password: typeof body.password === "string" && body.password.trim() ? body.password.trim() : "12345678",
        propertyIds,
      });

      return successResponse(result, { status: 201 });
    }

    // Assign existing user by emailOrPhone
    if (typeof body.emailOrPhone !== "string" || !body.emailOrPhone.trim()) {
      return errorResponse(
        Object.assign(new Error("emailOrPhone is required."), { code: "VALIDATION_ERROR" }),
      );
    }

    const emailOrPhone = body.emailOrPhone.trim();
    const results = [];
    for (const propertyId of propertyIds) {
      const member = await addPropertyMember(ctx.userId, ctx.role, propertyId, emailOrPhone);
      results.push(member);
    }

    return successResponse({ members: results }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/staff — Revoke staff assignment from a property
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const memberId = searchParams.get("memberId");

    if (!propertyId || !memberId) {
      return errorResponse(
        Object.assign(new Error("propertyId and memberId query parameters are required."), {
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
