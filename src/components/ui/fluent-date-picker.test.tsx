import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { FluentDatePicker } from "./fluent-date-picker";

describe("FluentDatePicker Component", () => {
  it("renders trigger button with formatted month when mode='month'", () => {
    const markup = renderToStaticMarkup(
      <FluentDatePicker
        mode="month"
        value="2026-11"
        onChange={vi.fn()}
      />
    );
    expect(markup).toContain("Tháng 11/2026");
    expect(markup).toContain("fluent-picker-trigger");
  });

  it("renders trigger button with formatted date when mode='date'", () => {
    const markup = renderToStaticMarkup(
      <FluentDatePicker
        mode="date"
        value="2026-11-19"
        onChange={vi.fn()}
      />
    );
    expect(markup).toContain("19/11/2026");
  });

  it("renders placeholder when value is empty", () => {
    const markup = renderToStaticMarkup(
      <FluentDatePicker
        mode="month"
        value=""
        placeholder="Chọn tháng lập phiếu"
        onChange={vi.fn()}
      />
    );
    expect(markup).toContain("Chọn tháng lập phiếu");
  });
});
