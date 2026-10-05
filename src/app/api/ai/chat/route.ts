import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import { processAiQuery } from "../../../../modules/ai/ai.service";
import { AppError } from "../../../../errors/app-error";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/ai/chat — Process natural language query with AI assistant
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);

    if (ctx.role !== "owner" && ctx.role !== "manager") {
      throw new AppError(
        "FORBIDDEN",
        "Chức năng Trợ lý AI hiện chỉ dành cho Chủ nhà và Quản lý tòa nhà.",
        [],
      );
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      throw new AppError("VALIDATION_ERROR", "Nội dung câu hỏi không được để trống.", [
        { field: "message", message: "Nội dung câu hỏi không được để trống." },
      ]);
    }

    const history = Array.isArray(body?.history) ? body.history : undefined;

    const result = await processAiQuery({
      userId: ctx.userId,
      role: ctx.role,
      message,
      history,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
