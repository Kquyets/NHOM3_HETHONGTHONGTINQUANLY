import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sanitizeCsvField, generateCsvContent, exportTableToCsv } from "./export-csv";

describe("export-csv", () => {
  describe("sanitizeCsvField", () => {
    it("handles null and undefined", () => {
      expect(sanitizeCsvField(null)).toBe('""');
      expect(sanitizeCsvField(undefined)).toBe('""');
    });

    it("escapes double quotes by doubling them", () => {
      expect(sanitizeCsvField('Nhà "Trọ" Sài Gòn')).toBe('"Nhà ""Trọ"" Sài Gòn"');
    });

    it("wraps normal string and numbers in quotes", () => {
      expect(sanitizeCsvField("Phòng 101")).toBe('"Phòng 101"');
      expect(sanitizeCsvField(2500000)).toBe('"2500000"');
    });

    it("safely handles strings with commas, semicolons, and newlines", () => {
      expect(sanitizeCsvField("Hà Nội, Việt Nam")).toBe('"Hà Nội, Việt Nam"');
      expect(sanitizeCsvField("Dòng 1\nDòng 2")).toBe('"Dòng 1\nDòng 2"');
    });
  });

  describe("generateCsvContent", () => {
    it("generates CSV string with UTF-8 BOM and CRLF line breaks", () => {
      const headers = ["Phòng", "Giá thuê", "Trạng thái"];
      const rows = [
        ["101", 3000000, "Đang thuê"],
        ["102", 3200000, "Trống"],
      ];

      const csv = generateCsvContent(headers, rows);

      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain('"Phòng","Giá thuê","Trạng thái"');
      expect(csv).toContain('"101","3000000","Đang thuê"');
      expect(csv).toContain('"102","3200000","Trống"');
      expect(csv.split("\r\n")).toHaveLength(3);
    });
  });

  describe("downloadCsvFile and exportTableToCsv", () => {
    beforeEach(() => {
      vi.stubGlobal("window", {});
      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue({
          setAttribute: vi.fn(),
          style: {},
          click: vi.fn(),
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn().mockReturnValue("blob:http://localhost/test-uuid"),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("triggers client-side anchor click with blob url", () => {
      const clickMock = vi.fn();
      const setAttributeMock = vi.fn();
      (document.createElement as ReturnType<typeof vi.fn>).mockReturnValue({
        setAttribute: setAttributeMock,
        style: {},
        click: clickMock,
      });

      exportTableToCsv("danh-sach-phong", ["Phòng", "Giá"], [["101", 3500000]]);

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(setAttributeMock).toHaveBeenCalledWith("download", "danh-sach-phong.csv");
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(clickMock).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/test-uuid");
    });
  });
});
