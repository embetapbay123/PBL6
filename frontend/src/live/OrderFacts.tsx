import type { OperationOutputs } from "../api/operations.generated";
type Order = OperationOutputs["getOwnOrder"];
export const orderLabel: Record<string, string> = {
  PREPARING: "Đang tạo đơn",
  AWAITING_PAYMENT: "Chờ thanh toán",
  PENDING: "Chờ Store xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị hàng",
  SHIPPED: "Đang giao",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
  RECOVERING: "Đang đối soát",
  RETURNED: "Store đã nhận hàng trả",
};
export const timeLabel = (value?: string) =>
  value ? new Date(value).toLocaleString("vi-VN") : "Chưa có mốc thời gian";
export function OrderFacts({ order }: { order: Order }) {
  const address = order.address_snapshot,
    history = order.status_history ?? [];
  return (
    <section className="market-order-facts">
      <h3>Thông tin giao hàng</h3>
      <p>Ngày tạo: {timeLabel(order.created_at)}</p>
      {address ? (
        <>
          <p>
            {String(address.recipient_name ?? "")} {String(address.phone ?? "")}
          </p>
          <p>
            {["line1", "ward", "district", "city"]
              .map((k) => address[k])
              .filter(Boolean)
              .map(String)
              .join(", ") || "Địa chỉ chi tiết chưa được cung cấp"}
          </p>
        </>
      ) : (
        <p>Chưa có thông tin địa chỉ từ đơn hàng.</p>
      )}
      <h3>Chuỗi xử lý đơn hàng</h3>
      <ol className="market-order-chain">
        {["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"].map(
          (status) => (
            <li
              key={status}
              className={
                order.status === status
                  ? "current"
                  : history.some((h) => h.to_status === status)
                    ? "visited"
                    : ""
              }
              aria-current={order.status === status ? "step" : undefined}
            >
              {orderLabel[status]}
            </li>
          ),
        )}
      </ol>
      {["CANCELLED", "EXPIRED", "RECOVERING", "RETURNED"].includes(
        order.status,
      ) && <p className="market-badge">{orderLabel[order.status]}</p>}
      <h3>Lịch sử thay đổi trạng thái</h3>
      {!history.length ? (
        <p>Đơn chưa có lịch sử được ghi nhận.</p>
      ) : (
        <ol className="market-order-timeline">
          {history.map((h) => (
            <li key={h.id}>
              <strong>{orderLabel[h.to_status] ?? h.to_status}</strong>
              <time dateTime={h.created_at}>{timeLabel(h.created_at)}</time>
              {h.from_status && (
                <p>Từ: {orderLabel[h.from_status] ?? h.from_status}</p>
              )}
              <p>{h.reason ?? "Không ghi lý do riêng"}</p>
              <small>Tài khoản ghi nhận: {h.actor_user_id}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
