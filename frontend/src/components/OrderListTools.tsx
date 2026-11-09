import { Fragment, useEffect, useState } from "react";
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
  CANCELLED: "Không cần thanh toán",
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
    storeScope,
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
  returns = false,
}: {
  filters: ReturnType<typeof useOrderListFilters>;
  returns?: boolean;
}) {
  const tabs = filters.storeScope
    ? [
        ["", "Tất cả"],
        ["PENDING", "Chờ xác nhận"],
        ["CONFIRMED", "Chờ lấy hàng"],
        ["PROCESSING", "Đang đóng gói"],
        ["SHIPPED", "Đang giao"],
        ["COMPLETED", "Đã giao"],
        ["CANCELLED", "Đã hủy"],
      ]
    : [
        ["", "Tất cả"],
        ["AWAITING_PAYMENT", "Chờ thanh toán"],
        ["PENDING", "Chờ xác nhận"],
        ["CONFIRMED", "Chờ lấy hàng"],
        ["PROCESSING", "Đang đóng gói"],
        ["SHIPPED", "Đang giao"],
        ["COMPLETED", "Đã giao"],
        ["CANCELLED", "Đã hủy"],
      ];
  if (filters.storeScope && ["PREPARING", "EXPIRED", "RECOVERING"].includes(filters.query.status ?? "")) {
    const techLabels: Record<string, string> = {
      PREPARING: "Đang tạo đơn",
      EXPIRED: "Hết hạn",
      RECOVERING: "Đang khôi phục",
    };
    tabs.push([filters.query.status!, techLabels[filters.query.status!]]);
  }
  return (
    <nav className="order-status-tabs" aria-label="Lọc nhanh trạng thái đơn">
      {tabs.map(([value, label]) => (
        <Fragment key={value}>
        {returns && value === "CANCELLED" && <Link to="/customer/returns">Đổi trả</Link>}
        <button
          type="button"
          key={value}
          aria-pressed={(filters.query.status ?? "") === value}
          onClick={() => filters.set("status", value)}
        >
          {label}
        </button>
        </Fragment>
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
  const store = filters.storeScope;
  const extraCount = Number(!!filters.query.payment_status) + Number(!!filters.query.refund_status);
  const hasFilters = !!(filters.query.q || filters.query.status || extraCount || filters.query.sort && filters.query.sort !== "CREATED_DESC");
  const fields = (
      <div className="seller-product-filters">
        {!store && <label>
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
        </label>}
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
        {!store && <button type="button" className="ui-button ui-button-secondary" onClick={filters.reset}>
          Bỏ bộ lọc đơn
        </button>}
      </div>
  );
  return (
    <div className={"order-filter-panel" + (store ? " store-order-filters" : "")}>
      <form
        className="admin-moderation-search"
        onSubmit={(event) => {
          event.preventDefault();
          filters.set("q", search.trim());
        }}
      >
        <label>
          <span className={store ? "sr-only" : undefined}>Tìm đơn theo mã, món, SKU hoặc người nhận</span>
          <input
            type="search"
            maxLength={200}
            placeholder={store ? "Mã đơn, món, SKU hoặc người nhận" : undefined}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="ui-button ui-button-primary">Tìm đơn</button>
      </form>
      {store ? (
        <>
          <details className="store-order-extra-filters">
            <summary>Bộ lọc thêm{extraCount > 0 ? ` (${extraCount})` : ""}</summary>
            {fields}
          </details>
          {hasFilters && <button type="button" className="ui-button ui-button-secondary" onClick={filters.reset}>Xóa bộ lọc</button>}
        </>
      ) : fields}
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
  showPrice = false,
}: {
  order: OperationOutputs["getOwnOrder"];
  recipient?: boolean;
  store?: boolean;
  compact?: boolean;
  currentImages?: Map<string,string>;
  showPrice?: boolean;
}) {
  const address = record(order.address_snapshot);
  return (
    <div style={{ overflowWrap: "anywhere" }}>
      {order.created_at && Number.isFinite(Date.parse(order.created_at)) && (
        <p className="text-xs text-slate-500 mb-2">
          {compact ? (
            <>
              Ngày đặt:{" "}
              <time dateTime={order.created_at}>
                {new Date(order.created_at).toLocaleDateString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </time>
            </>
          ) : (
            <>
              Tạo lúc{" "}
              <time dateTime={order.created_at}>
                {new Date(order.created_at).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </time>{" "}
              (giờ Việt Nam)
            </>
          )}
        </p>
      )}
      {store && <OrderStoreLabel id={order.store_id} compact={compact} />}
      {order.items?.length ? (
        <ul className={compact || currentImages ? "order-card-items" : undefined}>
          {order.items.slice(0, compact ? 2 : 3).map((item, index) => {
            const snapshot = record(item.product_snapshot),
              values = variantLabel(record(snapshot.variant_values), ""),
              title =
                typeof snapshot.title === "string"
                  ? snapshot.title
                  : "Mục đơn cũ chưa lưu tên",
              unitPrice = typeof item.unit_price_vnd === "number" ? item.unit_price_vnd : undefined;
            return (
              <li key={typeof item.id === "string" ? item.id : index} className={showPrice ? "order-card-item-row flex items-center justify-between gap-3 py-2 border-b border-slate-50" : undefined}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {(compact || currentImages) && (
                    <span className="order-card-image shrink-0">
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
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-900 line-clamp-1">{title}</strong>
                    {currentImages && typeof item.product_id==='string' && currentImages.has(item.product_id) && typeof snapshot.image_url!=='string' && <small className="order-current-image-note">Ảnh hiện tại của sản phẩm</small>}
                    <div className="text-xs text-slate-500 mt-0.5">
                      <span>Phân loại: {values || (typeof snapshot.variant_title === "string" ? snapshot.variant_title : "Tiêu chuẩn")}</span>
                      <span className="mx-1.5">·</span>
                      <span className="font-medium text-slate-700">x{typeof item.quantity === "number" ? item.quantity : 1}</span>
                      {!compact && typeof item.sku_snapshot === "string" && (
                        <> · SKU {item.sku_snapshot}</>
                      )}
                    </div>
                  </div>
                </div>
                {showPrice && unitPrice !== undefined && (
                  <div className="order-card-item-price text-right text-xs shrink-0 pl-3">
                    <span className="font-semibold text-slate-800">
                      {unitPrice.toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                )}
              </li>
            );
          })}
          {order.items.length > (compact ? 2 : 3) && (
            <li className="text-xs text-slate-500 italic pt-1">
              Còn {order.items.length - (compact ? 2 : 3)} sản phẩm khác trong đơn; xem chi
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
export function OrderStoreLabel({ id, compact = false }: { id: string; compact?: boolean }) {
  const query = useQuery({
    queryKey: ["order-current-store", id],
    queryFn: ({ signal }) =>
      callOperation("getPublicStore", { path: { id } }, { signal }),
    retry: false,
  });
  if (compact) {
    return (
      <span className="order-store-label-compact font-bold text-slate-800">
        {query.data ? (
          <Link to={"/stores/" + id} className="hover:underline text-indigo-700">
            {query.data.name}
          </Link>
        ) : query.error instanceof ApiError && query.error.status === 404 ? (
          <span className="text-slate-500">Store không còn mở</span>
        ) : (
          <span>Store</span>
        )}
      </span>
    );
  }
  return (
    <p>
      {query.data ? (
        <Link to={"/stores/" + id}>Store: {query.data.name}</Link>
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
