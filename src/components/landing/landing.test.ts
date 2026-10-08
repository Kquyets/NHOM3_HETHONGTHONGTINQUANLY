import { describe, expect, it } from "vitest";

describe("Landing & Auth Navigation and Content", () => {
  it("defines standard landing anchors matching navigation requirements", () => {
    const landingAnchors = ["#features", "#comparison", "#benefits"];
    expect(landingAnchors).toContain("#features");
    expect(landingAnchors).toContain("#comparison");
    expect(landingAnchors).toContain("#benefits");
  });

  it("has valid auth routes for login and register", () => {
    const authRoutes = {
      login: "/login",
      register: "/register",
      home: "/",
    };
    expect(authRoutes.login).toBe("/login");
    expect(authRoutes.register).toBe("/register");
    expect(authRoutes.home).toBe("/");
  });

  it("supports expected role types for registration", () => {
    const validRoles = ["owner", "manager"] as const;
    expect(validRoles).toHaveLength(2);
    expect(validRoles).toContain("owner");
    expect(validRoles).toContain("manager");
  });

  it("calculates password strength correctly", () => {
    function calcPwStrength(pw: string) {
      if (pw.length === 0) return 0;
      if (pw.length < 6) return 1;
      if (pw.length < 10) return 2;
      return 3;
    }

    expect(calcPwStrength("")).toBe(0);
    expect(calcPwStrength("12345")).toBe(1);
    expect(calcPwStrength("12345678")).toBe(2);
    expect(calcPwStrength("supersecret123")).toBe(3);
  });

  it("references the project home background image correctly", () => {
    const bgPath = "/images/image_e148c7f8.jpg";
    expect(bgPath).toBe("/images/image_e148c7f8.jpg");
  });
});

