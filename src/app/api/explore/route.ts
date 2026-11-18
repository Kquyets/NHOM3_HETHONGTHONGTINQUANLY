import { searchPublicListings } from "../../../modules/explore/explore.service";
import type { ExploreFilter, FurnishingType } from "../../../modules/explore/explore.types";
import { errorResponse, successResponse } from "../../../utils/api-response";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city") || undefined;
    const district = searchParams.get("district") || undefined;
    const priceBand = (searchParams.get("priceBand") as ExploreFilter["priceBand"]) || undefined;
    const areaBand = (searchParams.get("areaBand") as ExploreFilter["areaBand"]) || undefined;
    const furnishing = (searchParams.get("furnishing") as FurnishingType | "all") || undefined;
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") as ExploreFilter["sortBy"]) || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 12;

    const amenitiesParam = searchParams.get("amenities");
    const amenities = amenitiesParam ? amenitiesParam.split(",").filter(Boolean) : undefined;

    const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!, 10) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : undefined;
    const minArea = searchParams.get("minArea") ? parseFloat(searchParams.get("minArea")!) : undefined;
    const maxArea = searchParams.get("maxArea") ? parseFloat(searchParams.get("maxArea")!) : undefined;

    const filter: ExploreFilter = {
      city,
      district,
      priceBand,
      areaBand,
      furnishing,
      amenities,
      search,
      sortBy,
      page,
      limit,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
    };

    const results = await searchPublicListings(filter);
    return successResponse(results);
  } catch (error) {
    return errorResponse(error);
  }
}
