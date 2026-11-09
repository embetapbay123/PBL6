import { Package, CreditCard, RotateCcw, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { CustomerSubNav } from "./CustomerSubNav";
import { Button } from "../../components/ui/Button";

type NotificationItem = OperationOutputs["listNotifications"]["items"][number];

const statuses: Record<string, string> = {
  PREPARING: "Đang xác nhận đặt hàng",
  AWAITING_PAYMENT: "Đang chờ thanh toán",
  PENDING: "Đang chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPED: "Đang giao hàng",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
  RECOVERING: "Đang xử lý",
};

const returnStatuses: Record<string, string> = {
  REQUESTED: "Đã gửi yêu cầu",
  APPROVED: "Đã chấp thuận yêu cầu",
  REJECTED: "Yêu cầu bị từ chối",
  RECEIVED: "Gian hàng đã nhận hàng trả",
  EXCHANGE_SENT: "Gian hàng đã gửi hàng đổi",
  COMPLETED: "Đã hoàn tất yêu cầu",
};

const paymentStatuses: Record<string, string> = {
  COD_COLLECTED: "Đã thu tiền COD",
  REFUNDED: "Đã hoàn tiền",
  SUCCEEDED: "Thanh toán thành công",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Thanh toán đã hủy",
  EXPIRED: "Thanh toán đã hết hạn",
  PENDING: "Đang chờ thanh toán",
};

function getShopeeTitle(kind: string, event_status: string) {
  if (kind === "ORDER_STATUS") {
    if (event_status === "COMPLETED") return "Giao kiện hàng thành công";
    if (event_status === "SHIPPED") return "Đang vận chuyển";
    if (event_status === "CONFIRMED") return "Đơn hàng đã được xác nhận";
    if (event_status === "PROCESSING") return "Người bán đang chuẩn bị hàng";
    if (event_status === "CANCELLED") return "Đơn hàng đã hủy";
    return statuses[event_status] ?? event_status;
  }
  if (kind === "RETURN_STATUS") {
    if (event_status === "APPROVED") return "Yêu cầu đổi trả đã được chấp thuận";
    if (event_status === "COMPLETED") return "Đổi trả hoàn tất";
    if (event_status === "REJECTED") return "Yêu cầu đổi trả bị từ chối";
    return `Yêu cầu đổi trả: ${returnStatuses[event_status] ?? event_status}`;
  }
  if (event_status === "SUCCEEDED" || event_status === "COD_COLLECTED") return "Thanh toán thành công";
  if (event_status === "REFUNDED") return "Hoàn tiền thành công";
  return `Thanh toán: ${paymentStatuses[event_status] ?? event_status}`;
}

function getShopeeDescription(kind: string, event_status: string, code: string) {
  if (kind === "ORDER_STATUS") {
    if (event_status === "COMPLETED") return `Kiện hàng của đơn hàng ${code} đã giao thành công đến bạn.`;
    if (event_status === "SHIPPED") return `Kiện hàng của đơn hàng ${code} đang được vận chuyển đến bạn.`;
    if (event_status === "CONFIRMED") return `Đơn hàng ${code} đã được người bán xác nhận và đang được đóng gói.`;
    if (event_status === "CANCELLED") return `Đơn hàng ${code} đã hủy thành công.`;
    return `Đơn hàng ${code} đã chuyển sang trạng thái: ${statuses[event_status] ?? event_status}.`;
  }
  if (kind === "RETURN_STATUS") {
    return `Yêu cầu trả hàng/hoàn tiền của đơn hàng ${code} đã được cập nhật: ${returnStatuses[event_status] ?? event_status}.`;
  }
  return `Giao dịch thanh toán của đơn hàng ${code} đã được cập nhật: ${paymentStatuses[event_status] ?? event_status}.`;
}

function formatShopeeTime(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Chưa rõ thời gian";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}-${month}-${year}`;
}

function NotificationThumbnail({ orderId, kind }: { orderId: string; kind: string }) {
  const query = useQuery({
    queryKey: ["notification-order-thumb", orderId],
    queryFn: ({ signal }) =>
      callOperation("getOwnOrder", { path: { id: orderId } }, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const firstItem = query.data?.items?.[0];
  const snapshot =
    typeof firstItem?.product_snapshot === "object" && firstItem.product_snapshot !== null
      ? (firstItem.product_snapshot as Record<string, unknown>)
      : null;
  const imageUrl = typeof snapshot?.image_url === "string" ? snapshot.image_url : null;
  const title = typeof snapshot?.title === "string" ? snapshot.title : "Sản phẩm";

  if (imageUrl) {
    return (
      <div className="shopee-noti-thumb">
        <img src={imageUrl} alt={title} className="shopee-noti-img" />
      </div>
    );
  }

  return (
    <div className={`shopee-noti-thumb is-fallback kind-${kind.toLowerCase()}`}>
      {kind === "ORDER_STATUS" ? (
        <Package size={26} className="text-[#ee4d2d]" />
      ) : kind === "RETURN_STATUS" ? (
        <RotateCcw size={26} className="text-[#d97706]" />
      ) : (
        <CreditCard size={26} className="text-[#2563eb]" />
      )}
    </div>
  );
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - Date.parse(value));
  if (!Number.isFinite(elapsed)) return "Chưa rõ thời gian";
  const minutes = Math.floor(elapsed / 60000);
  if (!minutes) return "Vừa xong";
  const formatter = new Intl.RelativeTimeFormat("vi-VN", { numeric: "auto" });
  return minutes < 60
    ? formatter.format(-minutes, "minute")
    : minutes < 1440
      ? formatter.format(-Math.floor(minutes / 60), "hour")
      : formatter.format(-Math.floor(minutes / 1440), "day");
}

function NotificationGroupHistory({
  item,
  code,
  busy,
  onReadItem,
}: {
  item: NotificationItem;
  code: string;
  busy: string;
  onReadItem: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: [
      "notificationGroupHistory",
      item.kind,
      item.order_id,
      page,
      item.created_at,
    ],
    enabled: open,
    queryFn: () =>
      callOperation("listNotificationGroupHistory", {
        query: {
          kind: item.kind,
          order_id: item.order_id,
          page,
          size: 10,
          exclude_primary: true,
          up_to: item.created_at,
        },
      }),
  });

  const previousCount = Math.max(0, (item.update_count ?? 1) - 1);
  if (previousCount === 0) return null;

  const historyItems = query.data?.items ?? [];

  return (
    <details
      className="notification-history-details"
      style={{ margin: "10px 0" }}
      onToggle={(e) => {
        if (e.currentTarget.open) {
          setOpen(true);
        }
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: "13px",
          color: "#475569",
        }}
      >
        Xem {previousCount} cập nhật trước của đơn #{code}
      </summary>

      {query.isLoading && (
        <div
          style={{
            padding: "8px 0 4px 18px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          Đang tải cập nhật trước…
        </div>
      )}

      {query.error && (
        <div
          style={{
            padding: "8px 0 4px 18px",
            fontSize: "13px",
            color: "#dc2626",
          }}
        >
          Không tải được lịch sử cập nhật.
        </div>
      )}

      {historyItems.length > 0 && (
        <ul
          style={{
            margin: "8px 0 0",
            paddingLeft: "18px",
            fontSize: "13px",
            color: "#475569",
          }}
        >
          {historyItems.map((sub) => (
            <li key={sub.id} style={{ marginBottom: "6px" }}>
              <span>
                {sub.kind === "ORDER_STATUS"
                  ? (statuses[sub.event_status] ?? sub.event_status)
                  : sub.kind === "RETURN_STATUS"
                    ? (returnStatuses[sub.event_status] ?? sub.event_status)
                    : (paymentStatuses[sub.event_status] ?? sub.event_status)}
              </span>{" "}
              ·{" "}
              <time dateTime={sub.created_at}>
                {relativeTime(sub.created_at)}
              </time>
              {!sub.read && (
                <button
                  type="button"
                  disabled={!!busy}
                  style={{
                    marginLeft: "8px",
                    fontSize: "12px",
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => void onReadItem(sub.id)}
                >
                  {busy === sub.id ? "Đang cập nhật…" : "Đánh dấu đã đọc"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {query.data && query.data.total > 10 && (
        <div style={{ marginTop: "6px", paddingLeft: "18px" }}>
          <Pagination
            page={page}
            size={query.data.size}
            total={query.data.total}
            onPage={setPage}
          />
        </div>
      )}
    </details>
  );
}

export function NotificationsPage() {
  const cache = useQueryClient(),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(""),
    [filterKind, setFilterKind] = useState<string>("ALL"),
    [error, setError] = useState<unknown>();
  const query = useQuery({
    queryKey: ["notifications", page],
    refetchInterval: 15000,
    queryFn: () =>
      callOperation("listNotifications", { query: { page, size: 20 } }),
  });

  async function read(id: string) {
    if (busy) return;
    setBusy(id);
    setError(undefined);
    try {
      if (id === "all") await callOperation("markAllNotificationsRead");
      else await callOperation("markNotificationRead", { path: { id } });
      await cache.invalidateQueries({ queryKey: ["notifications"] });
      await cache.invalidateQueries({
        queryKey: ["notificationGroupHistory"],
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }

  async function readGroup(item: NotificationItem) {
    if (busy) return;
    setBusy(item.id);
    setError(undefined);
    try {
      await callOperation("markNotificationGroupRead", {
        body: {
          kind: item.kind,
          order_id: item.order_id,
          up_to: item.created_at,
        },
      });
      await cache.invalidateQueries({ queryKey: ["notifications"] });
      await cache.invalidateQueries({
        queryKey: [
          "notificationGroupHistory",
          item.kind,
          item.order_id,
        ],
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }

  const items = query.data?.items ?? [];
  const filteredItems =
    filterKind === "ALL"
      ? items
      : items.filter((item) => item.kind === filterKind);

  return (
    <section>
      <CustomerSubNav />

      {/* Shopee-style Category Tabs & Read-all Action Header */}
      <div className="shopee-noti-header-bar flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-200">
        <div className="notification-category-tabs flex items-center gap-2 overflow-x-auto">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "ORDER_STATUS", label: "Cập nhật đơn hàng" },
            { key: "PAYMENT_EVENT", label: "Cập nhật ví & thanh toán" },
            { key: "RETURN_STATUS", label: "Đổi trả & hoàn tiền" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                filterKind === tab.key
                  ? "bg-[#ee4d2d] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => setFilterKind(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {query.data && query.data.unread > 0 && (
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-[#ee4d2d] font-normal transition-colors"
            disabled={!!busy}
            onClick={() => void read("all")}
          >
            Đánh dấu Đã đọc tất cả
          </button>
        )}
      </div>

      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {error !== undefined && <ErrorView error={error} />}
      {query.data && !query.error && (
        <>
          {filteredItems.length ? (
            <div className="shopee-noti-container bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-sm overflow-hidden">
              {filteredItems.map((item) => {
                const code = item.order_id.slice(-8).toUpperCase();
                const unreadCount = item.unread_count ?? (item.read ? 0 : 1);
                const isGroupUnread = unreadCount > 0 || !item.read;
                const targetUrl =
                  item.kind === "RETURN_STATUS"
                    ? `/customer/returns?order_id=${item.order_id}`
                    : item.kind === "PAYMENT_EVENT"
                      ? `/customer/orders/${item.order_id}#payment`
                      : `/customer/orders/${item.order_id}`;

                return (
                  <article
                    key={item.id}
                    className={`shopee-noti-row flex items-start gap-4 p-4 transition-colors ${
                      isGroupUnread ? "bg-[#fffaf8]" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {/* Left: Product or Event Thumbnail */}
                    <NotificationThumbnail orderId={item.order_id} kind={item.kind} />

                    {/* Center: Content & Timestamp */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 m-0">
                          {getShopeeTitle(item.kind, item.event_status)}
                        </h3>
                        {isGroupUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#ee4d2d] shrink-0" title="Chưa đọc" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1 mb-1 leading-relaxed">
                        {getShopeeDescription(item.kind, item.event_status, code)}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <time dateTime={item.created_at}>
                          {formatShopeeTime(item.created_at)}
                        </time>
                      </div>

                      <NotificationGroupHistory
                        item={item}
                        code={code}
                        busy={busy}
                        onReadItem={read}
                      />
                    </div>

                    {/* Right: Shopee-style Outline Button */}
                    <div className="shrink-0 pt-0.5">
                      <Link
                        to={targetUrl}
                        className="shopee-noti-action-btn inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          if (isGroupUnread) void readGroup(item);
                        }}
                      >
                        Xem Chi Tiết
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty>
              {filterKind !== "ALL"
                ? "Không có thông báo nào trong mục này."
                : page === 1
                  ? "Chưa có thông báo."
                  : "Không có thông báo ở trang này."}
            </Empty>
          )}
          <div className="mt-4">
            <Pagination
              page={page}
              size={query.data.size}
              total={query.data.total}
              onPage={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
}
