import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => "/staff",
}));

vi.mock("../../lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-owner", email: "owner@example.com", role: "owner", fullName: "Chủ Trọ" },
    isLoading: false,
  }),
}));

vi.mock("../../lib/theme-context", () => ({
  useTheme: () => ({
    theme: "light",
    toggle: vi.fn(),
  }),
}));

vi.mock("../../lib/api-client", () => ({
  apiClient: vi.fn().mockResolvedValue({ staff: [], properties: [] }),
}));

import StaffPage from "./page";

describe("StaffPage Component and Add Staff Modal", () => {
  it("renders the StaffPage with header, title and Add Staff trigger button", () => {
    const markup = renderToStaticMarkup(<StaffPage />);

    expect(markup).toContain("Quản lý Nhân viên");
    expect(markup).toContain("Phân quyền ban quản lý");
    expect(markup).toContain("Thêm nhân viên");
  });

  it("ensures modals in StaffPage do not use AI-looking emoji (✨, 💡) in tab labels or hint boxes", () => {
    const filePath = path.resolve(__dirname, "./page.tsx");
    const sourceCode = fs.readFileSync(filePath, "utf-8");

    // Must not use AI-looking sparkle emoji in tab label
    expect(sourceCode).not.toContain("✨");
    // Must not use lightbulb emoji in hint text
    expect(sourceCode).not.toContain("💡");
    // Must not have unused Sparkle import from phosphor icons
    expect(sourceCode).not.toContain("Sparkle,");

    // Must not use house emoji
    expect(sourceCode).not.toContain("🏠");

    // Must use proper icon components instead
    expect(sourceCode).toContain("UserCirclePlus");
    expect(sourceCode).toContain("ShieldCheck");
  });
});
