import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import type { OperationOutputs } from "../api/operations.generated";
import { variantLabel } from "./variant-identity";
import { Button } from "./ui/Button";
import { paymentMethodLabel, paymentStatusLabel } from "./OrderListTools";
import { codToCollect } from "./order-actions";

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");

function maskPhone(val: string) {
  const p = val.trim();
  if (p.length < 7) return p;
  return p.slice(0, 3) + "*****" + p.slice(-3);
}

function generateBarcodeSvg(seed: string): string {
  const code = (seed.replace(/[^a-zA-Z0-9]/g, "") + "SPX").toUpperCase().slice(0, 16);
  let x = 8;
  const bars: string[] = [];
  bars.push(`<rect x="${x}" y="0" width="2" height="42" fill="#000"/>`); x += 4;
  bars.push(`<rect x="${x}" y="0" width="1" height="42" fill="#000"/>`); x += 3;
  bars.push(`<rect x="${x}" y="0" width="2" height="42" fill="#000"/>`); x += 5;
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    const w1 = (c % 3) + 1;
    const w2 = ((c >> 1) % 2) + 1;
    bars.push(`<rect x="${x}" y="0" width="${w1}" height="38" fill="#000"/>`);
    x += w1 + 2;
    bars.push(`<rect x="${x}" y="0" width="${w2}" height="38" fill="#000"/>`);
    x += w2 + 2;
  }
  bars.push(`<rect x="${x}" y="0" width="2" height="42" fill="#000"/>`); x += 4;
  bars.push(`<rect x="${x}" y="0" width="1" height="42" fill="#000"/>`); x += 3;
  bars.push(`<rect x="${x}" y="0" width="2" height="42" fill="#000"/>`); x += 6;
  return `<svg width="${x + 8}" height="42" viewBox="0 0 ${x + 8} 42" xmlns="http://www.w3.org/2000/svg" style="display:inline-block">${bars.join("")}</svg>`;
}

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
    element.title = "Phiếu gửi hàng Shopee AWB";
    element.setAttribute("aria-hidden", "true");
    element.style.cssText =
      "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0";
    document.body.append(element);
    frame.current = element;
    const view = element.contentWindow,
      doc = element.contentDocument;
    if (!view || !doc) {
      setError(
        "Không mở được bản in. Hãy thử lại hoặc dùng danh sách lấy hàng.",
      );
      element.remove();
      return;
    }

    const shortId = order.id.slice(-8).toUpperCase();
    const trackingCode = `VN-PBL6-${shortId}`;
    const cod = codToCollect(order);
    const address = record(order.address_snapshot);
    const parts = ["line1", "ward", "district", "city"]
      .map((key) => text(address[key]))
      .filter(Boolean);
    const recipientPhone = text(address.phone) ? maskPhone(text(address.phone)) : "";
    const recipientName = text(address.recipient_name) || "Khách hàng";
    const recipientAddress = parts.join(", ") || "Địa chỉ mặc định theo đơn hàng";

    const rowsHtml = (order.items ?? []).map((item, idx) => {
      const snapshot = record(item.product_snapshot);
      const title = (text(snapshot.title) || "Sản phẩm") + " · " + variantLabel(
        record(snapshot.variant_values),
        text(snapshot.variant_title) || "Phân loại tiêu chuẩn",
      );
      const sku = text(item.sku_snapshot) || "N/A";
      const qty = item.quantity ?? 1;
      return `<tr>
        <td style="text-align:center;width:28px">${idx + 1}</td>
        <td><strong>${title}</strong></td>
        <td style="font-family:monospace;font-size:10px">${sku}</td>
        <td style="text-align:center;font-weight:700;width:40px">${qty}</td>
      </tr>`;
    }).join("");

    const barcodeSvg = generateBarcodeSvg(order.id);

    const htmlContent = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phiếu gửi hàng AWB · ${trackingCode}</title>
  <style>
    @page { size: A5 portrait; margin: 6mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; line-height: 1.35; color: #111; margin: 0; padding: 10px; }
    .awb-container { border: 2px solid #000; padding: 10px; max-width: 540px; margin: 0 auto; background: #fff; }
    .awb-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
    .awb-brand { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
    .awb-carrier { font-size: 11px; font-weight: 800; background: #000; color: #fff; padding: 3px 8px; border-radius: 3px; letter-spacing: 0.5px; }
    .awb-barcode-zone { text-align: center; border-bottom: 1.5px solid #000; padding: 6px 0 8px; }
    .awb-tracking-code { font-family: monospace; font-size: 13px; font-weight: 800; letter-spacing: 1.5px; margin-top: 3px; }
    .awb-routing-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1.5px solid #000; margin-bottom: 6px; }
    .awb-route-box { padding: 6px 8px; }
    .awb-route-box:first-child { border-right: 1.5px solid #000; }
    .awb-section-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; color: #555; margin-bottom: 3px; }
    .awb-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
    .awb-meta { font-size: 10.5px; color: #222; }
    .awb-cod-box { border: 2px solid #000; margin: 6px 0; padding: 8px 12px; text-align: center; }
    .awb-cod-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .awb-cod-amount { font-size: 18px; font-weight: 900; margin-top: 2px; }
    .awb-items-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .awb-items-table th, .awb-items-table td { border: 1px solid #777; padding: 5px 6px; font-size: 10px; text-align: left; }
    .awb-items-table th { background: #f1f5f9; font-weight: 700; }
    .awb-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #777; font-size: 9.5px; color: #444; }
    .awb-sign { text-align: center; min-width: 120px; }
    .awb-sign-space { height: 35px; }
  </style>
</head>
<body>
  <div class="awb-container">
    <div class="awb-header">
      <div>
        <div class="awb-brand">VinaBIM · Shopee Standard</div>
        <div style="font-size: 10px; color: #475569;">PHIẾU GỬI HÀNG (AIR WAYBILL)</div>
      </div>
      <div style="text-align: right;">
        <span class="awb-carrier">SPX EXPRESS</span>
        <div style="font-size: 9px; margin-top: 2px; font-weight: 600;">Mã trạm: SGN-HUB</div>
      </div>
    </div>

    <div class="awb-barcode-zone">
      ${barcodeSvg}
      <div class="awb-tracking-code">${trackingCode}</div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Mã đơn: ${order.id}</div>
    </div>

    <div class="awb-routing-grid">
      <div class="awb-route-box">
        <div class="awb-section-title">Từ (Người gửi)</div>
        <div class="awb-name">Gian hàng Shopee Partner</div>
        <div class="awb-meta">Hotline: 1900-**** (Bảo mật sàn)</div>
        <div class="awb-meta">Kho lấy hàng: Trung tâm Vận hành VinaBIM</div>
      </div>
      <div class="awb-route-box">
        <div class="awb-section-title">Đến (Người nhận)</div>
        <div class="awb-name">${recipientName}</div>
        <div class="awb-meta">SĐT: ${recipientPhone || "Bảo mật sàn"}</div>
        <div class="awb-meta" style="margin-top: 2px;">${recipientAddress}</div>
      </div>
    </div>

    <div class="awb-cod-box" style="${cod > 0 ? 'background: #fef2f2; border-color: #dc2626;' : 'background: #f0fdf4; border-color: #16a34a;'}">
      <div class="awb-cod-title" style="${cod > 0 ? 'color: #991b1b;' : 'color: #166534;'}">
        ${cod > 0 ? 'Tiền thu người nhận (COD)' : 'Đã thanh toán trước qua sàn'}
      </div>
      <div class="awb-cod-amount" style="${cod > 0 ? 'color: #dc2626;' : 'color: #166534;'}">
        ${cod > 0 ? cod.toLocaleString('vi-VN') + ' ₫' : '0 ₫ (KHÔNG THU TIỀN)'}
      </div>
      <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
        ${paymentMethodLabel(order.payment_method)} · ${paymentStatusLabel(order.payment_status, order.amounts.payable_vnd)}
      </div>
    </div>

    <div>
      <div class="awb-section-title" style="margin-top: 6px;">Nội dung hàng hóa (Tổng ${order.items?.length ?? 0} món)</div>
      <table class="awb-items-table">
        <thead>
          <tr>
            <th style="width:28px">STT</th>
            <th>Tên sản phẩm & Phân loại</th>
            <th style="width:110px">Mã SKU</th>
            <th style="width:40px;text-align:center">SL</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="4" style="text-align:center">Chưa có dữ liệu món</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="awb-footer">
      <div>
        <strong>Chỉ dẫn giao hàng:</strong> Cho xem hàng, không cho thử.<br />
        <em>Hạn phát tối đa: 03 lần phát. Miễn phí đổi trả 15 ngày qua VinaBIM.</em>
      </div>
      <div class="awb-sign">
        <strong>Chữ ký người nhận</strong>
        <div class="awb-sign-space"></div>
        <div style="font-size: 8.5px; color: #888;">(Xác nhận nguyên vẹn)</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    doc.open();
    doc.write(htmlContent);
    doc.close();

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
        In phiếu gửi hàng (AWB)
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
