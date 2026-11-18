export type FurnishingType = "full" | "basic" | "empty";

export type ExploreListingItem = {
  id: string;
  propertyId: string;
  propertyName: string;
  roomNumber: string;
  monthlyRent: number;
  areaM2: number | null;
  status: "ready" | "maintenance";
  isPublicListed: boolean;
  listingTitle: string;
  listingDescription: string;
  city: string; // e.g. "Hà Nội" | "TP. Hồ Chí Minh"
  district: string; // e.g. "Cầu Giấy", "Đống Đa", "Quận 1", etc.
  ward?: string | null;
  address: string;
  floor?: number | null;
  furnishing: FurnishingType;
  amenities: string[];
  imageUrls: string[];
  contactPhone: string;
  contactZalo: string;
  electricityRate?: number;
  waterRate?: number;
  createdAt: string;
  updatedAt: string;
};

export type ExploreFilter = {
  city?: string;
  district?: string;
  priceBand?: "<1m" | "1-2m" | "2-3m" | "3-5m" | "5-7m" | ">7m" | "all";
  minPrice?: number;
  maxPrice?: number;
  areaBand?: "<20" | "20-30" | "30-50" | ">50" | "all";
  minArea?: number;
  maxArea?: number;
  furnishing?: FurnishingType | "all";
  amenities?: string[];
  search?: string;
  sortBy?: "newest" | "price_asc" | "price_desc" | "area_desc";
  page?: number;
  limit?: number;
};

export type ExploreSearchResult = {
  items: ExploreListingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  cityCounts: Record<string, number>;
  districtCounts: Record<string, number>;
  priceBandCounts: Record<string, number>;
};

export const POPULAR_AMENITIES = [
  { id: "ve_sinh_khep_kin", label: "Vệ sinh khép kín", icon: "Toilet" },
  { id: "khong_chung_chu", label: "Không chung chủ", icon: "Key" },
  { id: "gac_lung", label: "Có gác lửng", icon: "Stairs" },
  { id: "dieu_hoa", label: "Điều hòa", icon: "Wind" },
  { id: "nong_lanh", label: "Nóng lạnh", icon: "Drop" },
  { id: "thang_may", label: "Thang máy", icon: "Elevator" },
  { id: "may_giat", label: "Máy giặt", icon: "TShirt" },
  { id: "gio_tu_do", label: "Giờ giấc tự do", icon: "Clock" },
  { id: "cho_nuoi_pet", label: "Cho nuôi thú cưng", icon: "PawPrint" },
  { id: "cho_de_xe", label: "Chỗ để xe", icon: "Motorcycle" },
  { id: "ban_cong", label: "Ban công thoáng mát", icon: "Sun" },
] as const;

export const VIETNAM_CITIES: Record<string, string[]> = {
  "Hà Nội": [
    "Cầu Giấy",
    "Đống Đa",
    "Thanh Xuân",
    "Nam Từ Liêm",
    "Bắc Từ Liêm",
    "Ba Đình",
    "Hai Bà Trưng",
    "Hoàng Mai",
    "Hà Đông",
    "Tây Hồ",
    "Long Biên",
  ],
  "TP. Hồ Chí Minh": [
    "Quận 1",
    "Quận 3",
    "Quận 5",
    "Quận 7",
    "Quận 10",
    "Bình Thạnh",
    "Gò Vấp",
    "Tân Bình",
    "Phú Nhuận",
    "TP. Thủ Đức",
  ],
};
