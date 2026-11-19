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

  it("ensures modals in StaffPage are centered with flexbox overlay and do not use translate(-50%, -50%)", () => {
    const filePath = path.resolve(__dirname, "./page.tsx");
    const sourceCode = fs.readFileSync(filePath, "utf-8");

    // Must not use transform: translate(-50%, -50%) which gets overridden by motion.div animate props
    expect(sourceCode).not.toContain('transform: "translate(-50%, -50%)"');
    expect(sourceCode).not.toContain("transform: 'translate(-50%, -50%)'");

    // Must use centered flexbox layout for modal overlays
    expect(sourceCode).toContain('alignItems: "center"');
    expect(sourceCode).toContain('justifyContent: "center"');
    expect(sourceCode).toContain('maxHeight: "90vh"');
  });
});
