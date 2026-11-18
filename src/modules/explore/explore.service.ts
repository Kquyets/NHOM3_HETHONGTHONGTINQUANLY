import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { properties, rooms, utilityRates } from "../../lib/database/schema";
import { DEMO_EXPLORE_LISTINGS } from "./explore-demo-data";
import { filterInMemoryListings } from "./explore-filter";
import type {
  ExploreFilter,
  ExploreListingItem,
  ExploreSearchResult,
  FurnishingType,
} from "./explore.types";

export { filterInMemoryListings };

/**
 * Search public listings with database backing and demo dataset fallback
 */
export async function searchPublicListings(filter: ExploreFilter): Promise<ExploreSearchResult> {
  try {
    const db = getDatabase();
    const rows = await db
      .select({
        id: rooms.id,
        propertyId: rooms.propertyId,
        propertyName: properties.name,
        propertyAddress: properties.address,
        roomNumber: rooms.roomNumber,
        monthlyRent: rooms.monthlyRent,
        areaM2: rooms.areaM2,
        status: rooms.status,
        isPublicListed: rooms.isPublicListed,
        listingTitle: rooms.listingTitle,
        listingDescription: rooms.listingDescription,
        city: rooms.city,
        district: rooms.district,
        ward: rooms.ward,
        address: rooms.address,
        floor: rooms.floor,
        furnishing: rooms.furnishing,
        amenities: rooms.amenities,
        imageUrls: rooms.imageUrls,
        contactPhone: rooms.contactPhone,
        contactZalo: rooms.contactZalo,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
      })
      .from(rooms)
      .innerJoin(properties, eq(rooms.propertyId, properties.id))
      .where(eq(rooms.isPublicListed, true))
      .orderBy(desc(rooms.createdAt));

    if (rows && rows.length > 0) {
      const items: ExploreListingItem[] = rows.map((r) => ({
        id: r.id,
        propertyId: r.propertyId,
        propertyName: r.propertyName,
        roomNumber: r.roomNumber,
        monthlyRent: r.monthlyRent,
        areaM2: r.areaM2 ? Number(r.areaM2) : null,
        status: r.status,
        isPublicListed: r.isPublicListed,
        listingTitle: r.listingTitle || `Phòng ${r.roomNumber} - ${r.propertyName}`,
        listingDescription: r.listingDescription || "Phòng trọ cho thuê sạch đẹp, liên hệ ngay để xem phòng trực tiếp.",
        city: r.city || "Hà Nội",
        district: r.district || "Cầu Giấy",
        ward: r.ward || null,
        address: r.address || r.propertyAddress || `${r.district}, ${r.city}`,
        floor: r.floor ?? null,
        furnishing: (r.furnishing as FurnishingType) || "basic",
        amenities: r.amenities || ["ve_sinh_khep_kin", "gio_tu_do"],
        imageUrls: r.imageUrls && r.imageUrls.length > 0
          ? r.imageUrls
          : ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"],
        contactPhone: r.contactPhone || "0982345678",
        contactZalo: r.contactZalo || r.contactPhone || "0982345678",
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
      }));

      return filterInMemoryListings(items, filter);
    }
  } catch {
    // If DB has no active connection or tables, fallback gracefully to demo listings
  }

  return filterInMemoryListings(DEMO_EXPLORE_LISTINGS, filter);
}

/**
 * Get single public listing detail
 */
export async function getPublicListingDetail(
  listingId: string,
): Promise<ExploreListingItem | null> {
  try {
    const db = getDatabase();
    const [row] = await db
      .select({
        id: rooms.id,
        propertyId: rooms.propertyId,
        propertyName: properties.name,
        propertyAddress: properties.address,
        roomNumber: rooms.roomNumber,
        monthlyRent: rooms.monthlyRent,
        areaM2: rooms.areaM2,
        status: rooms.status,
        isPublicListed: rooms.isPublicListed,
        listingTitle: rooms.listingTitle,
        listingDescription: rooms.listingDescription,
        city: rooms.city,
        district: rooms.district,
        ward: rooms.ward,
        address: rooms.address,
        floor: rooms.floor,
        furnishing: rooms.furnishing,
        amenities: rooms.amenities,
        imageUrls: rooms.imageUrls,
        contactPhone: rooms.contactPhone,
        contactZalo: rooms.contactZalo,
        createdAt: rooms.createdAt,
        updatedAt: rooms.updatedAt,
      })
      .from(rooms)
      .innerJoin(properties, eq(rooms.propertyId, properties.id))
      .where(and(eq(rooms.id, listingId), eq(rooms.isPublicListed, true)))
      .limit(1);

    if (row) {
      // Fetch latest utility rates for electricity & water if available
      let electricityRate: number | undefined;
      let waterRate: number | undefined;

      try {
        const rates = await db
          .select({
            utilityType: utilityRates.utilityType,
            unitPrice: utilityRates.unitPrice,
          })
          .from(utilityRates)
          .where(eq(utilityRates.propertyId, row.propertyId));

        for (const rate of rates) {
          if (rate.utilityType === "electricity") electricityRate = rate.unitPrice;
          if (rate.utilityType === "water") waterRate = rate.unitPrice;
        }
      } catch {
        // utility rates lookup optional
      }

      return {
        id: row.id,
        propertyId: row.propertyId,
        propertyName: row.propertyName,
        roomNumber: row.roomNumber,
        monthlyRent: row.monthlyRent,
        areaM2: row.areaM2 ? Number(row.areaM2) : null,
        status: row.status,
        isPublicListed: row.isPublicListed,
        listingTitle: row.listingTitle || `Phòng ${row.roomNumber} - ${row.propertyName}`,
        listingDescription: row.listingDescription || "Phòng trọ cho thuê sạch đẹp, an ninh.",
        city: row.city || "Hà Nội",
        district: row.district || "Cầu Giấy",
        ward: row.ward || null,
        address: row.address || row.propertyAddress || `${row.district}, ${row.city}`,
        floor: row.floor ?? null,
        furnishing: (row.furnishing as FurnishingType) || "basic",
        amenities: row.amenities || ["ve_sinh_khep_kin", "gio_tu_do"],
        imageUrls: row.imageUrls && row.imageUrls.length > 0
          ? row.imageUrls
          : ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"],
        contactPhone: row.contactPhone || "0982345678",
        contactZalo: row.contactZalo || row.contactPhone || "0982345678",
        electricityRate,
        waterRate,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      };
    }
  } catch {
    // Fallback to demo items
  }

  const demoMatch = DEMO_EXPLORE_LISTINGS.find((i) => i.id === listingId);
  return demoMatch ?? null;
}
