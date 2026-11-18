import { describe, expect, it } from "vitest";
import { DEMO_EXPLORE_LISTINGS } from "./explore-demo-data";
import {
  filterInMemoryListings,
  getPublicListingDetail,
  searchPublicListings,
} from "./explore.service";

describe("explore service - public listings", () => {
  it("returns all listings when empty filter is passed", () => {
    const result = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, {});
    expect(result.total).toBe(DEMO_EXPLORE_LISTINGS.length);
    expect(result.items.length).toBeLessThanOrEqual(12);
    expect(result.cityCounts["Hà Nội"]).toBeGreaterThan(0);
    expect(result.cityCounts["TP. Hồ Chí Minh"]).toBeGreaterThan(0);
  });

  it("filters correctly by city (Hà Nội vs TP. Hồ Chí Minh)", () => {
    const hnResult = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { city: "Hà Nội" });
    expect(hnResult.items.every((item) => item.city === "Hà Nội")).toBe(true);
    expect(hnResult.total).toBeGreaterThan(0);

    const hcmResult = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { city: "TP. Hồ Chí Minh" });
    expect(hcmResult.items.every((item) => item.city === "TP. Hồ Chí Minh")).toBe(true);
    expect(hcmResult.total).toBeGreaterThan(0);
  });

  it("filters correctly by district", () => {
    const result = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, {
      city: "Hà Nội",
      district: "Cầu Giấy",
    });
    expect(result.items.every((item) => item.district === "Cầu Giấy")).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it("filters correctly across price bands", () => {
    const band3to5 = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { priceBand: "3-5m" });
    expect(
      band3to5.items.every((item) => item.monthlyRent >= 3_000_000 && item.monthlyRent < 5_000_000),
    ).toBe(true);

    const bandAbove7 = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { priceBand: ">7m" });
    expect(bandAbove7.items.every((item) => item.monthlyRent >= 7_000_000)).toBe(true);

    const band1to2 = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { priceBand: "1-2m" });
    expect(
      band1to2.items.every((item) => item.monthlyRent >= 1_000_000 && item.monthlyRent < 2_000_000),
    ).toBe(true);
  });

  it("filters correctly by area bands", () => {
    const smallArea = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { areaBand: "<20" });
    expect(smallArea.items.every((item) => (item.areaM2 ?? 0) < 20)).toBe(true);

    const midArea = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { areaBand: "20-30" });
    expect(midArea.items.every((item) => (item.areaM2 ?? 0) >= 20 && (item.areaM2 ?? 0) < 30)).toBe(
      true,
    );
  });

  it("filters by furnishing status", () => {
    const fullFurnished = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { furnishing: "full" });
    expect(fullFurnished.items.every((item) => item.furnishing === "full")).toBe(true);

    const basicFurnished = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { furnishing: "basic" });
    expect(basicFurnished.items.every((item) => item.furnishing === "basic")).toBe(true);
  });

  it("filters by multiple amenities requiring all to be present", () => {
    const result = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, {
      amenities: ["gac_lung", "khong_chung_chu"],
    });
    expect(
      result.items.every(
        (item) =>
          item.amenities.includes("gac_lung") && item.amenities.includes("khong_chung_chu"),
      ),
    ).toBe(true);
  });

  it("searches by keyword in title, district, or address", () => {
    const searchResult = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { search: "Dịch Vọng Hậu" });
    expect(searchResult.total).toBeGreaterThan(0);
    expect(
      searchResult.items.some(
        (item) =>
          item.listingTitle.includes("Dịch Vọng Hậu") || item.address.includes("Dịch Vọng Hậu"),
      ),
    ).toBe(true);
  });

  it("sorts correctly by price and area", () => {
    const priceAsc = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { sortBy: "price_asc", limit: 20 });
    for (let i = 0; i < priceAsc.items.length - 1; i++) {
      expect(priceAsc.items[i].monthlyRent).toBeLessThanOrEqual(priceAsc.items[i + 1].monthlyRent);
    }

    const priceDesc = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { sortBy: "price_desc", limit: 20 });
    for (let i = 0; i < priceDesc.items.length - 1; i++) {
      expect(priceDesc.items[i].monthlyRent).toBeGreaterThanOrEqual(priceDesc.items[i + 1].monthlyRent);
    }
  });

  it("paginates results correctly", () => {
    const page1 = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { page: 1, limit: 3 });
    const page2 = filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { page: 2, limit: 3 });

    expect(page1.items.length).toBe(3);
    expect(page2.items.length).toBe(3);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
    expect(page1.totalPages).toBe(Math.ceil(DEMO_EXPLORE_LISTINGS.length / 3));
  });

  it("retrieves public listing details by id", async () => {
    const listing = await getPublicListingDetail("exp-hn-01");
    expect(listing).not.toBeNull();
    expect(listing?.id).toBe("exp-hn-01");
    expect(listing?.city).toBe("Hà Nội");
    expect(listing?.contactPhone).toBe("0982345678");

    const nonExistent = await getPublicListingDetail("non-existent-id");
    expect(nonExistent).toBeNull();
  });

  it("searchPublicListings handles execution gracefully", async () => {
    const res = await searchPublicListings({ city: "Hà Nội" });
    expect(res).toBeDefined();
    expect(res.items.length).toBeGreaterThan(0);
  });
});
