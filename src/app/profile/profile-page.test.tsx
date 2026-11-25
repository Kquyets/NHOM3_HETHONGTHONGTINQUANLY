import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/profile",
}));

vi.mock("../../lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u-1", email: "owner@example.com", role: "owner", fullName: "Chủ nhà A" },
    isLoading: false,
    refreshProfile: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("../../lib/theme-context", () => ({
  useTheme: () => ({ theme: "dark", toggle: vi.fn() }),
}));

vi.mock("../../lib/api-client", () => ({
  apiClient: vi.fn().mockResolvedValue({ profile: null }),
}));

import ProfilePage from "./page";

describe("ProfilePage", () => {
  it("renders inside app-shell with AppHeader navigation bar", () => {
    const markup = renderToStaticMarkup(<ProfilePage />);
    expect(markup).toContain("app-shell");
    expect(markup).toContain("HManagers");
  });
});
