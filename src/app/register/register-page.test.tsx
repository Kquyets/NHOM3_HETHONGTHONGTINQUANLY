import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("../../lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    register: vi.fn(),
  }),
}));

vi.mock("../../lib/theme-context", () => ({
  useTheme: () => ({
    theme: "light",
    toggle: vi.fn(),
  }),
}));

import RegisterPage from "./page";

describe("RegisterPage Component", () => {
  it("renders with 2 role options: Owner and Tenant, excluding standalone Manager", () => {
    const markup = renderToStaticMarkup(<RegisterPage />);

    // Should include Owner option
    expect(markup).toContain("Chủ nhà / BQL");
    expect(markup).toContain("Toàn quyền quản trị");

    // Should include Tenant option
    expect(markup).toContain("Khách thuê phòng");
    expect(markup).toContain("Xem bill &amp; Báo sự cố");

    // Should NOT include standalone Manager option
    expect(markup).not.toContain("Phòng &amp; Sự cố");
  });

  it("renders initial Owner state with appropriate title and links", () => {
    const markup = renderToStaticMarkup(<RegisterPage />);

    expect(markup).toContain("Đăng ký tài khoản Quản trị");
    expect(markup).toContain("chu-nha@example.com");
    expect(markup).toContain("Đăng ký tài khoản quản trị miễn phí");
    expect(markup).toContain("/login");
    expect(markup).toContain("← Quay lại trang chủ");
  });
});
