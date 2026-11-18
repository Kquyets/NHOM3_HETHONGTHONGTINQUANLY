import { describe, expect, it } from "vitest";
import { numberToVietnameseWords } from "./vietnamese-currency-words";

describe("numberToVietnameseWords", () => {
  it("converts 0 correctly", () => {
    expect(numberToVietnameseWords(0)).toBe("Không đồng");
  });

  it("converts single and double digit amounts", () => {
    expect(numberToVietnameseWords(5)).toBe("Năm đồng");
    expect(numberToVietnameseWords(10)).toBe("Mười đồng");
    expect(numberToVietnameseWords(11)).toBe("Mười một đồng");
    expect(numberToVietnameseWords(15)).toBe("Mười lăm đồng");
    expect(numberToVietnameseWords(21)).toBe("Hai mươi mốt đồng");
    expect(numberToVietnameseWords(25)).toBe("Hai mươi lăm đồng");
  });

  it("converts hundreds correctly with linh / lẻ", () => {
    expect(numberToVietnameseWords(100)).toBe("Một trăm đồng");
    expect(numberToVietnameseWords(105)).toBe("Một trăm linh năm đồng");
    expect(numberToVietnameseWords(115)).toBe("Một trăm mười lăm đồng");
    expect(numberToVietnameseWords(500)).toBe("Năm trăm đồng");
    expect(numberToVietnameseWords(999)).toBe("Chín trăm chín mươi chín đồng");
  });

  it("converts thousands, millions, and typical rental amounts accurately", () => {
    expect(numberToVietnameseWords(15000)).toBe("Mười lăm nghìn đồng");
    expect(numberToVietnameseWords(500000)).toBe("Năm trăm nghìn đồng");
    expect(numberToVietnameseWords(1000000)).toBe("Một triệu đồng");
    expect(numberToVietnameseWords(3500000)).toBe("Ba triệu năm trăm nghìn đồng");
    expect(numberToVietnameseWords(4250000)).toBe("Bốn triệu hai trăm năm mươi nghìn đồng");
    expect(numberToVietnameseWords(12345000)).toBe(
      "Mười hai triệu ba trăm bốn mươi lăm nghìn đồng",
    );
  });
});
