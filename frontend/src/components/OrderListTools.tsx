import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { callOperation } from "../api/operations";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { orderStatusLabel } from "./OrderPresentation";
import { variantLabel } from "./variant-identity";
import { Package } from "lucide-react";
import { ProductImage } from "./ProductImage";
type Query = OperationInputs["listOwnOrders"]["query"] & Pick<OperationInputs['listStoreOrders']['query'],'sort'>;
const statuses: NonNullable<Query["status"]>[] = [
  "PREPARING",
  "AWAITING_PAYMENT",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "RECOVERING",
];
const payments: Record<NonNullable<Query["payment_status"]>, string> = {
  PENDING: "Chưa xác nhận thu",
  UNKNOWN: "Đang đối soát",
  SUCCEEDED: "Đã thu",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã đóng nghĩa vụ thu",
  REFUNDED: "Đã hoàn tiền",
};
const refunds: Record<NonNullable<Query["refund_status"]>, string> = {
  REQUESTED: "Đã yêu cầu hoàn, chưa xác nhận",
  PROCESSING: "Đang thực hiện hoàn",
  UNKNOWN: "Đang đối soát hoàn",
  SUCCEEDED: "Đã xác nhận hoàn",
  FAILED: "Hoàn tiền thất bại",
};
export const refundStatusLabel = (value: string) =>
  value === "REFUNDED"
    ? "Đã xác nhận hoàn"
    : (refunds[value as keyof typeof refunds] ?? value);
export const paymentStatusLabel = (value?: string, payable?: number) =>
  payable === 0 && value === "SUCCEEDED"
    ? "Không cần thu tiền (0 ₫)"
    : (payments[value as keyof typeof payments] ??
      "Chưa có trạng thái thu tiền");
export const paymentMethodLabel = (value: string) =>
  value === "COD"
    ? "Thanh toán khi nhận hàng (COD)"
    : value === "SANDBOX"
      ? "Chuyển khoản (thử nghiệm)"
      : "Phương thức chưa xác định";
export function useOrderListFilters(storeScope = false) {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("page")),
    page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
  const status = statuses.find((value) => value === params.get("status")),
    payment = Object.keys(payments).find(
      (value) => value === params.get("payment_status"),
    ) as Query["payment_status"];
  const refund = Object.keys(refunds).find(
    (value) => value === params.get("refund_status"),
  ) as Query["refund_status"];
  const query: Query = {
    page,
    size: 20,
    ...(storeScope && ['CREATED_ASC','CREATED_DESC','TOTAL_ASC','TOTAL_DESC'].includes(params.get('sort')??'')?{sort:params.get('sort') as Query['sort']}:{}),
    ...(params.get("q") ? { q: params.get("q")! } : {}),
    ...(status ? { status } : {}),
    ...(payment ? { payment_status: payment } : {}),
    ...(refund ? { refund_status: refund } : {}),
  };
  const set = (key: string, value: string, options?: { replace?: boolean }) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (key !== "page") next.delete("page");
      value ? next.set(key, value) : next.delete(key);
      return next;
    }, options);
  return {
    query,
    page,
    set,
    reset: () =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        for (const key of [
          "q",
          "status",
          "payment_status",
          "refund_status",
          "page",
          "sort",
        ])
          next.delete(key);
        return next;
      }),
  };
}
export function OrderStatusTabs({
  filters,
}: {
  filters: ReturnType<typeof useOrderListFilters>;
}) {
  return (
    <nav className="order-status-tabs" aria-label="Lọc nhanh trạng thái đơn">
      {[
        ["", "Tất cả"],
        ["AWAITING_PAYMENT", "Chờ thanh toán"],
        ["PENDING", "Chờ xác nhận"],
        ["CONFIRMED", "Đã xác nhận"],
        ["PROCESSING", "Chuẩn bị hàng"],
        ["SHIPPED", "Đang giao"],
        ["COMPLETED", "Hoàn tất"],
        ["CANCELLED", "Đã hủy"],
      ].map(([value, label]) => (
        <button
          type="button"
          key={value}
          aria-pressed={(filters.query.status ?? "") === value}
          onClick={() => filters.set("status", value)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
export function OrderListFilters({
  filters,
}: {
  filters: ReturnType<typeof useOrderListFilters>;
}) {
  const [search, setSearch] = useState(filters.query.q ?? "");
  useEffect(() => setSearch(filters.query.q ?? ""), [filters.query.q]);
  return (
    <div className="order-filter-panel">
      <form
        className="admin-moderation-search"
        onSubmit={(event) => {
          event.preventDefault();
          filters.set("q", search.trim());
        }}
      >
        <label>
          Tìm đơn theo mã, món, SKU hoặc người nhận
          <input
            type="search"
            maxLength={200}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button>Tìm trong toàn bộ đơn</button>
      </form>
      <div className="seller-product-filters">
        <label>
          Trạng thái đơn
          <select
            value={filters.query.status ?? ""}
            onChange={(event) => filters.set("status", event.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {orderStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tình trạng tiền
          <select
            value={filters.query.payment_status ?? ""}
            onChange={(event) =>
              filters.set("payment_status", event.target.value)
            }
          >
            <option value="">Tất cả tình trạng tiền</option>
            {Object.entries(payments).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái lệnh hoàn tiền
          <select
            value={filters.query.refund_status ?? ""}
            onChange={(event) =>
              filters.set("refund_status", event.target.value)
            }
          >
            <option value="">Tất cả lệnh hoàn</option>
            {Object.entries(refunds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={filters.reset}>
          Bỏ bộ lọc đơn
        </button>
      </div>
    </div>
  );
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function OrderListIdentity({
  order,
  recipient = false,
  store = false,
  compact = false,
  currentImages,
}: {
  order: OperationOutputs["getOwnOrder"];
  recipient?: boolean;
  store?: boolean;
  compact?: boolean;
  currentImages?: Map<string,string>;
}) {
  const address = record(order.address_snapshot);
  return (
    <div style={{ overflowWrap: "anywhere" }}>
      {order.created_at && Number.isFinite(Date.parse(order.created_at)) && (
        <p>
          Tạo lúc{" "}
          <time dateTime={order.created_at}>
            {new Date(order.created_at).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </time>{" "}
          (giờ Việt Nam)
        </p>
      )}
      {store && <OrderStoreLabel id={order.store_id} />}
      {order.items?.length ? (
        <ul className={compact || currentImages ? "order-card-items" : undefined}>
          {order.items.slice(0, compact ? 2 : 3).map((item, index) => {
            const snapshot = record(item.product_snapshot),
              values = variantLabel(record(snapshot.variant_values), ""),
              title =
                typeof snapshot.title === "string"
                  ? snapshot.title
                  : "Mục đơn cũ chưa lưu tên";
            return (
              <li key={typeof item.id === "string" ? item.id : index}>
                {(compact || currentImages) && (
                  <span className="order-card-image">
                    {typeof snapshot.image_url === "string" &&
                    /^https?:\/\//.test(snapshot.image_url) ? (
                      <ProductImage
                        src={snapshot.image_url}
                        name={title}
                        alt={title}
                      />
                    ) : typeof item.product_id==='string' && currentImages?.has(item.product_id) ? (
                      <ProductImage src={currentImages.get(item.product_id)} name={title} alt="Ảnh sản phẩm hiện tại" title="Ảnh sản phẩm hiện tại, có thể khác khi đặt" />
                    ) : (
                      <Package
                        size={22}
                        aria-label="Đơn chưa lưu ảnh sản phẩm"
                      />
                    )}
                  </span>
                )}
                <span>
                  <strong>{title}</strong>
                  {currentImages && typeof item.product_id==='string' && currentImages.has(item.product_id) && typeof snapshot.image_url!=='string' && <small className="order-current-image-note">Ảnh hiện tại của sản phẩm</small>}
                  <span>
                    {" "}
                    ·{" "}
                    {values ||
                      (typeof snapshot.variant_title === "string"
                        ? snapshot.variant_title
                        : "Chưa lưu phân loại")}{" "}
                    · SL{" "}
                    {typeof item.quantity === "number"
                      ? item.quantity
                      : "chưa có dữ liệu"}
                    {!compact && typeof item.sku_snapshot === "string" && (
                      <> · SKU {item.sku_snapshot}</>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
          {order.items.length > (compact ? 2 : 3) && (
            <li>
              Còn {order.items.length - (compact ? 2 : 3)} dòng hàng; xem chi
              tiết để kiểm đủ.
            </li>
          )}
        </ul>
      ) : (
        <p>Đơn cũ chưa có dữ liệu món trong bản đọc này.</p>
      )}
      {recipient && (
        <p>
          Người nhận:{" "}
          {typeof address.recipient_name === "string"
            ? address.recipient_name
            : "Chưa lưu người nhận"}
          {typeof address.phone === "string" && <> · {address.phone}</>}
        </p>
      )}
    </div>
  );
}
function OrderStoreLabel({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["order-current-store", id],
    queryFn: ({ signal }) =>
      callOperation("getPublicStore", { path: { id } }, { signal }),
    retry: false,
  });
  return (
    <p>
      {query.data ? (
        <Link to={"/stores/" + id}>Store hiện tại: {query.data.name}</Link>
      ) : query.error instanceof ApiError && query.error.status === 404 ? (
        "Store không còn công khai"
      ) : query.error ? (
        "Chưa đọc được tên Store"
      ) : (
        "Đang đọc tên Store…"
      )}
      <br />
      <small>Mã Store: {id}</small>
    </p>
  );
}
