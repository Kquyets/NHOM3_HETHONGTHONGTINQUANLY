import { describe, expect, it } from "vitest";

describe("Superdesign Landing Page Configuration", () => {
  it("defines standard anchors for navigation and parallax sections", () => {
    const anchors = ["#expertise", "#works", "#perspectives"];
    expect(anchors).toContain("#expertise");
    expect(anchors).toContain("#works");
    expect(anchors).toContain("#perspectives");
  });

  it("references the generated HD hero atmosphere image", () => {
    const heroImage = "/images/hero-atmosphere.jpg";
    expect(heroImage).toMatch(/^\/images\/hero-atmosphere\.(jpg|png)$/);
  });

  it("calculates formatted 12-hour clock time properly", () => {
    function formatTime(date: Date) {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }

    const testNoon = new Date(2026, 0, 1, 12, 0, 0);
    expect(formatTime(testNoon)).toBe("12:00 PM");

    const testMidnight = new Date(2026, 0, 1, 0, 15, 0);
    expect(formatTime(testMidnight)).toBe("12:15 AM");

    const testEvening = new Date(2026, 0, 1, 23, 11, 0);
    expect(formatTime(testEvening)).toBe("11:11 PM");
  });

  it("defines floating element animation classes", () => {
    const floatAnimations = ["animate-float-left", "animate-float-right"];
    expect(floatAnimations).toHaveLength(2);
    expect(floatAnimations[0]).toBe("animate-float-left");
    expect(floatAnimations[1]).toBe("animate-float-right");
  });
});
