import { describe, expect, it, vi } from "vitest";

import {
  fetchDashboardOverview,
  getDemoViewData,
  parseOverviewApiResponse,
} from "./overview-data";

describe("overview data adapter", () => {
  it("provides demo data path when no backend URL is configured", async () => {
    const fetchMock = vi.fn();
    const data = await fetchDashboardOverview(fetchMock, { apiUrl: "" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(data.source).toBe("demo");
    expect(data.propertyCount).toBe(2);
    expect(data.counts.total).toBe(5);
    expect(data.counts.occupied).toBe(2);
    expect(data.counts.vacant).toBe(2);
    expect(data.counts.maintenance).toBe(1);
    expect(data.properties).toHaveLength(2);
  });

  it("returns synchronous demo view data with identical room counts", () => {
    const demoData = getDemoViewData();
    expect(demoData.source).toBe("demo");
    expect(demoData.counts.total).toBe(5);
    expect(demoData.properties).toHaveLength(2);
  });

  it("fetches and adapts live API overview response when backend URL is configured", async () => {
    const apiPayload = {
      success: true,
      data: {
        propertyCount: 1,
        roomCount: 2,
        occupiedCount: 1,
        properties: [
          {
            property: { id: "p100", name: "Nhà Trọ Mẫu", address: "123 Đường Mẫu" },
            rooms: [
              { id: "r1", propertyId: "p100", roomNumber: "101", monthlyRent: 2500000, status: "occupied" },
              { id: "r2", propertyId: "p100", roomNumber: "102", monthlyRent: 2500000, status: "vacant" },
            ],
            roomCount: 2,
            occupiedCount: 1,
          },
        ],
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => apiPayload,
    });

    const data = await fetchDashboardOverview(fetchMock as unknown as typeof fetch, {
      apiUrl: "http://localhost:3000",
      token: "test-token",
    });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:3000/api/dashboard/overview", {
      headers: {
        Accept: "application/json",
        Authorization: "Bearer test-token",
      },
    });
    expect(data.source).toBe("api");
    expect(data.propertyCount).toBe(1);
    expect(data.counts.total).toBe(2);
    expect(data.counts.occupied).toBe(1);
    expect(data.counts.vacant).toBe(1);
    expect(data.properties[0].property.name).toBe("Nhà Trọ Mẫu");
  });

  it("handles empty API property list correctly", () => {
    const emptyPayload = {
      success: true,
      data: {
        propertyCount: 0,
        roomCount: 0,
        occupiedCount: 0,
        properties: [],
      },
    };

    const data = parseOverviewApiResponse(emptyPayload);
    expect(data.source).toBe("api");
    expect(data.propertyCount).toBe(0);
    expect(data.counts.total).toBe(0);
    expect(data.properties).toHaveLength(0);
  });

  it("throws descriptive error when API request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { message: "Authentication required." },
      }),
    });

    await expect(
      fetchDashboardOverview(fetchMock as unknown as typeof fetch, {
        apiUrl: "http://localhost:3000",
      }),
    ).rejects.toThrow("Authentication required.");
  });

  it("throws error when API response payload structure is invalid", () => {
    expect(() => parseOverviewApiResponse({ success: false })).toThrow(
      "Dữ liệu phản hồi từ máy chủ không hợp lệ",
    );
  });
});
