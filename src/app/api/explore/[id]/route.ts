import { AppError } from "../../../../errors/app-error";
import { getPublicListingDetail } from "../../../../modules/explore/explore.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { id } = await params;
    const listing = await getPublicListingDetail(id);
    if (!listing) {
      throw new AppError("NOT_FOUND", "Không tìm thấy tin đăng phòng trọ.");
    }
    return successResponse(listing);
  } catch (error) {
    return errorResponse(error);
  }
}
