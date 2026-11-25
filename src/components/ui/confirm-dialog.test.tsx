import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders alertdialog markup with title, message, and action labels when open", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Xác nhận xóa phòng"
        message="Bạn có chắc muốn xóa phòng 101?"
        confirmLabel="Xóa phòng"
        cancelLabel="Quay lại"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Xác nhận xóa phòng");
    expect(html).toContain("Bạn có chắc muốn xóa phòng 101?");
    expect(html).toContain("Xóa phòng");
    expect(html).toContain("Quay lại");
  });

  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open={false}
        title="Ẩn"
        message="Không hiển thị"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toBe("");
  });
});
