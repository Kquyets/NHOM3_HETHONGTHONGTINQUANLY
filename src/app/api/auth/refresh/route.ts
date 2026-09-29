import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";
import { refreshSchema } from "../../../../lib/auth/validation";
import { rotateRefreshToken } from "../../../../modules/auth/service";

export async function POST(request: Request): Promise<Response> {
  try {
    const { refreshToken } = await parseJson(request, refreshSchema);
    return successResponse(await rotateRefreshToken(refreshToken));
  } catch (error) {
    return errorResponse(error);
  }
}
