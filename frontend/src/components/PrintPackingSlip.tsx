import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import type { OperationOutputs } from "../api/operations.generated";
import { variantLabel } from "./variant-identity";
import { Button } from "./ui/Button";
import { paymentMethodLabel, paymentStatusLabel } from "./OrderListTools";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");
export function PrintPackingSlip({
  order,
}: {
  order: OperationOutputs["getOwnOrder"];
}) {
  const frame = useRef<HTMLIFrameElement | null>(null),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      frame.current?.remove();
    },
    [],
  );
  function print() {
    setError("");
    frame.current?.remove();
    const element = document.createElement("iframe");
    element.title = "Bản in phiếu đóng gói";
    element.setAttribute("aria-hidden", "true");
    element.style.cssText =
      "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0";
    document.body.append(element);
    frame.current = element;
    const view = element.contentWindow,
      doc = element.contentDocument;
    if (!view || !doc) {
      setError(
        "Không mở được bản in. Hãy thử lại hoặc dùng thông tin lấy hàng bên dưới.",
      );
      element.remove();
      return;
    }
    doc.open();
    doc.write(
      '<!doctype html><html lang="vi"><head><title>Phiếu đóng gói</title><style>body{font:14px/1.6 Arial,sans-serif;color:#222;padding:24px}h1{font-size:24px}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border:1px solid #bbb;overflow-wrap:anywhere}p{overflow-wrap:anywhere}h2{font-size:18px}@page{margin:16mm}</style></head><body></body></html>',
    );
    doc.close();
    const add = (tag: string, value: string) => {
      const node = doc.createElement(tag);
      node.textContent = value;
      doc.body.append(node);
      return node;
    };
    add("h1", "Phiếu đóng gói · #" + order.id.slice(-8).toUpperCase());
    add("p", "Mã đơn: " + order.id);
    add("p", "Store: " + order.store_id);
    const address = record(order.address_snapshot),
      parts = ["line1", "ward", "district", "city"]
        .map((key) => text(address[key]))
        .filter(Boolean);
    add("h2", "Người nhận");
    add(
      "p",
      [text(address.recipient_name), text(address.phone), parts.join(", ")]
        .filter(Boolean)
        .join(" · ") ||
        "Đơn cũ thiếu địa chỉ đã chốt; đối chiếu với khách trước khi giao.",
    );
    add("h2", "Danh sách lấy hàng");
    const table = add("table", ""),
      header = doc.createElement("tr");
    for (const value of ["Sản phẩm / phân loại", "SKU khi đặt", "Số lượng"]) {
      const th = doc.createElement("th");
      th.textContent = value;
      header.append(th);
    }
    table.append(header);
    for (const item of order.items ?? []) {
      const snapshot = record(item.product_snapshot),
        tr = doc.createElement("tr");
      for (const value of [
        (text(snapshot.title) || "Chưa lưu tên") +
          " · " +
          variantLabel(
            record(snapshot.variant_values),
            text(snapshot.variant_title) || "Chưa lưu phân loại",
          ),
        text(item.sku_snapshot) || "Chưa lưu SKU",
        String(item.quantity ?? "Chưa có dữ liệu"),
      ]) {
        const td = doc.createElement("td");
        td.textContent = value;
        tr.append(td);
      }
      table.append(tr);
    }
    if (!order.items?.length)
      add("p", "Đơn chưa có dữ liệu món; đọc lại trước khi lấy hàng.");
    add(
      "p",
      paymentMethodLabel(order.payment_method) +
        " · " +
        paymentStatusLabel(order.payment_status, order.amounts.payable_vnd),
    );
    const cod =
      order.payment_method === "COD" &&
      order.payment_status === "PENDING" &&
      !["CANCELLED", "EXPIRED"].includes(order.status);
    add(
      "h2",
      cod
        ? "COD cần thu: " +
            order.amounts.payable_vnd.toLocaleString("vi-VN") +
            " ₫"
        : "Không thu thêm COD theo trạng thái hiện tại",
    );
    add(
      "p",
      "Phiếu hỗ trợ lấy / giao hàng thủ công, không phải biên nhận đã thu tiền hoặc xác nhận bàn giao.",
    );
    view.addEventListener(
      "afterprint",
      () => {
        element.remove();
        if (frame.current === element) frame.current = null;
      },
      { once: true },
    );
    try {
      view.focus();
      view.print();
    } catch {
      setError("Trình duyệt chưa mở được hộp in. Hãy thử lại.");
      element.remove();
    }
  }
  return (
    <div className="packing-print-action">
      <Button variant="secondary" onClick={print}>
        <Printer size={16} aria-hidden="true" />
        In phiếu đóng gói
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
