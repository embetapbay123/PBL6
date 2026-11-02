import { Bell, Package, CreditCard, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { CustomerSubNav } from "./CustomerSubNav";
const statuses: Record<string, string> = {
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

export function NotificationsPage() {
  const cache = useQueryClient(),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(""),
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
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }
  return (
    <section>
      <CustomerSubNav />
      <h1>Thông báo đơn hàng</h1>
      <p className="text-sm text-slate-500">
        Tự cập nhật khi bạn đang xem trang, mỗi 15 giây.
      </p>
      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {error !== undefined && <ErrorView error={error} />}
      {query.data && (
        <>
          <p>{query.data.unread} thông báo chưa đọc</p>
          <button
            disabled={!!busy || !query.data.unread}
            onClick={() => void read("all")}
          >
            Đánh dấu tất cả đã đọc
          </button>
          {!query.data.items.length && (
            <Empty>Chưa có cập nhật về đơn hàng hoặc thanh toán.</Empty>
          )}
          <div className="market-notifications">
            {query.data.items.map((notification) => (
              <article
                key={notification.id}
                className={
                  "notification-row " +
                  (!notification.read ? "notification-unread" : "")
                }
              >
                <div>
                  <span className="market-badge">
                    {notification.read ? "Đã đọc" : "Chưa đọc"}
                  </span>
                  <time
                    dateTime={notification.created_at}
                    title={
                      new Date(notification.created_at).toLocaleString(
                        "vi-VN",
                        { timeZone: "Asia/Ho_Chi_Minh" },
                      ) + " (giờ Việt Nam)"
                    }
                  >
                    {relativeTime(notification.created_at)}
                  </time>
                </div>
                <h2>
                  {notification.kind === "ORDER_STATUS" ? (
                    <Package size={20} aria-hidden="true" />
                  ) : notification.kind === "RETURN_STATUS" ? (
                    <RotateCcw size={20} aria-hidden="true" />
                  ) : (
                    <CreditCard size={20} aria-hidden="true" />
                  )}
                  {notification.kind === "ORDER_STATUS"
                    ? "Đơn hàng được cập nhật"
                    : notification.kind === "RETURN_STATUS"
                      ? "Yêu cầu đổi trả được cập nhật"
                      : "Có cập nhật thanh toán"}
                </h2>
                {notification.kind === "ORDER_STATUS" ? (
                  <p>
                    {statuses[notification.event_status] ??
                      notification.event_status}
                  </p>
                ) : notification.kind === "RETURN_STATUS" ? (
                  <p>
                    {returnStatuses[notification.event_status] ??
                      notification.event_status}
                  </p>
                ) : (
                  <p>Mở đơn hàng để xem trạng thái thanh toán hiện tại.</p>
                )}
                <div className="notification-actions">
                  <span>
                    Đơn #{notification.order_id.slice(-8).toUpperCase()}
                  </span>
                  <Link to={"/customer/orders/" + notification.order_id}>
                    Xem đơn hàng
                  </Link>
                  {!notification.read && (
                    <button
                      disabled={!!busy}
                      onClick={() => void read(notification.id)}
                    >
                      {busy === notification.id
                        ? "Đang cập nhật…"
                        : "Đánh dấu đã đọc"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <Pagination
            page={page}
            size={query.data.size}
            total={query.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}
