import type {
  ExploreFilter,
  ExploreListingItem,
  ExploreSearchResult,
} from "./explore.types";

export function filterInMemoryListings(
  items: ExploreListingItem[],
  filter: ExploreFilter,
): ExploreSearchResult {
  let filtered = [...items];

  // City filter
  if (filter.city && filter.city !== "all") {
    const cityNorm = filter.city.trim().toLowerCase();
    filtered = filtered.filter((i) => i.city.toLowerCase() === cityNorm);
  }

  // District filter
  if (filter.district && filter.district !== "all") {
    const distNorm = filter.district.trim().toLowerCase();
    filtered = filtered.filter((i) => i.district.toLowerCase() === distNorm);
  }

  // Price Band filter
  if (filter.priceBand && filter.priceBand !== "all") {
    switch (filter.priceBand) {
      case "<1m":
        filtered = filtered.filter((i) => i.monthlyRent < 1_000_000);
        break;
      case "1-2m":
        filtered = filtered.filter((i) => i.monthlyRent >= 1_000_000 && i.monthlyRent < 2_000_000);
        break;
      case "2-3m":
        filtered = filtered.filter((i) => i.monthlyRent >= 2_000_000 && i.monthlyRent < 3_000_000);
        break;
      case "3-5m":
        filtered = filtered.filter((i) => i.monthlyRent >= 3_000_000 && i.monthlyRent < 5_000_000);
        break;
      case "5-7m":
        filtered = filtered.filter((i) => i.monthlyRent >= 5_000_000 && i.monthlyRent < 7_000_000);
        break;
      case ">7m":
        filtered = filtered.filter((i) => i.monthlyRent >= 7_000_000);
        break;
    }
  }

  // Custom min/max price
  if (filter.minPrice !== undefined) {
    filtered = filtered.filter((i) => i.monthlyRent >= (filter.minPrice ?? 0));
  }
  if (filter.maxPrice !== undefined) {
    filtered = filtered.filter((i) => i.monthlyRent <= (filter.maxPrice ?? Infinity));
  }

  // Area Band filter
  if (filter.areaBand && filter.areaBand !== "all") {
    switch (filter.areaBand) {
      case "<20":
        filtered = filtered.filter((i) => (i.areaM2 ?? 0) < 20);
        break;
      case "20-30":
        filtered = filtered.filter((i) => (i.areaM2 ?? 0) >= 20 && (i.areaM2 ?? 0) < 30);
        break;
      case "30-50":
        filtered = filtered.filter((i) => (i.areaM2 ?? 0) >= 30 && (i.areaM2 ?? 0) < 50);
        break;
      case ">50":
        filtered = filtered.filter((i) => (i.areaM2 ?? 0) >= 50);
        break;
    }
  }

  // Custom min/max area
  if (filter.minArea !== undefined) {
    filtered = filtered.filter((i) => (i.areaM2 ?? 0) >= (filter.minArea ?? 0));
  }
  if (filter.maxArea !== undefined) {
    filtered = filtered.filter((i) => (i.areaM2 ?? 0) <= (filter.maxArea ?? Infinity));
  }

  // Furnishing filter
  if (filter.furnishing && filter.furnishing !== "all") {
    filtered = filtered.filter((i) => i.furnishing === filter.furnishing);
  }

  // Amenities filter (must match all selected)
  if (filter.amenities && filter.amenities.length > 0) {
    filtered = filtered.filter((i) =>
      filter.amenities!.every((a) => i.amenities && i.amenities.includes(a)),
    );
  }

  // Free text search
  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim().toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.listingTitle.toLowerCase().includes(s) ||
        i.address.toLowerCase().includes(s) ||
        i.district.toLowerCase().includes(s) ||
        i.city.toLowerCase().includes(s) ||
        i.propertyName.toLowerCase().includes(s) ||
        i.listingDescription.toLowerCase().includes(s),
    );
  }

  // Sorting
  const sortBy = filter.sortBy ?? "newest";
  switch (sortBy) {
    case "price_asc":
      filtered.sort((a, b) => a.monthlyRent - b.monthlyRent);
      break;
    case "price_desc":
      filtered.sort((a, b) => b.monthlyRent - a.monthlyRent);
      break;
    case "area_desc":
      filtered.sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0));
      break;
    case "newest":
    default:
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
  }

  // Count aggregates
  const cityCounts: Record<string, number> = {};
  const districtCounts: Record<string, number> = {};
  const priceBandCounts: Record<string, number> = {
    "<1m": 0,
    "1-2m": 0,
    "2-3m": 0,
    "3-5m": 0,
    "5-7m": 0,
    ">7m": 0,
  };

  for (const item of items) {
    cityCounts[item.city] = (cityCounts[item.city] ?? 0) + 1;
    if (!filter.city || filter.city === "all" || item.city.toLowerCase() === filter.city.toLowerCase()) {
      districtCounts[item.district] = (districtCounts[item.district] ?? 0) + 1;
      if (item.monthlyRent < 1_000_000) priceBandCounts["<1m"] += 1;
      else if (item.monthlyRent < 2_000_000) priceBandCounts["1-2m"] += 1;
      else if (item.monthlyRent < 3_000_000) priceBandCounts["2-3m"] += 1;
      else if (item.monthlyRent < 5_000_000) priceBandCounts["3-5m"] += 1;
      else if (item.monthlyRent < 7_000_000) priceBandCounts["5-7m"] += 1;
      else priceBandCounts[">7m"] += 1;
    }
  }

  const total = filtered.length;
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.max(1, Math.min(50, filter.limit ?? 12));
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    totalPages,
    cityCounts,
    districtCounts,
    priceBandCounts,
  };
}
