import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolvePreferredTheme, ThemeProvider } from "./theme-context";

describe("ThemeProvider and theme helpers", () => {
  it("resolves saved theme before falling back to system preference", () => {
    expect(resolvePreferredTheme("light", false)).toBe("light");
    expect(resolvePreferredTheme("dark", true)).toBe("dark");
    expect(resolvePreferredTheme(null, true)).toBe("light");
    expect(resolvePreferredTheme(null, false)).toBe("dark");
    expect(resolvePreferredTheme("unexpected", false)).toBe("dark");
  });

  it("renders SSR markup visibly without trapping children behind visibility:hidden", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <main>Đăng nhập hệ thống</main>
      </ThemeProvider>,
    );

    expect(html).toContain("Đăng nhập hệ thống");
    expect(html).not.toMatch(/visibility\s*:\s*hidden/i);
  });
});
