import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";
import { loginSchema } from "../../../../lib/auth/validation";
import { login } from "../../../../modules/auth/service";

export async function POST(request: Request): Promise<Response> {
  try {
    return successResponse(await login(await parseJson(request, loginSchema)));
  } catch (error) {
    return errorResponse(error);
  }
}
