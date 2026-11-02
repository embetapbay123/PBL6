import type { OperationOutputs } from "../api/operations.generated";
import { variantLabel } from "./variant-identity";
import { orderNextStep } from "./order-actions";
import { PrintPackingSlip } from "./PrintPackingSlip";
import {useCurrentOrderImages} from './useCurrentOrderImages';
import {ProductImage} from './ProductImage';
type Order = OperationOutputs["getOwnOrder"];
export function OrderNextStep({
  order,
  store = false,
}: {
  order: Order;
  store?: boolean;
}) {
  return (
    <section aria-label="Bước tiếp theo">
      <h3>Bước tiếp theo</h3>
      <p>{orderNextStep(order, store)}</p>
    </section>
  );
}
const labels: Record<string, string> = {
  PREPARING: "Đang xác nhận đặt hàng",
  AWAITING_PAYMENT: "Chờ khách thanh toán",
  PENDING: "Chờ cửa hàng xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị hàng",
  SHIPPED: "Đã bàn giao giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn thanh toán",
  RECOVERING: "Đang khôi phục kết quả đặt hàng",
};
export const orderStatusLabel = (status: string) => labels[status] ?? status;
const money = (value: number) => value.toLocaleString("vi-VN") + " ₫";
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
function collectionInstruction(order: Order) {
  if (order.amounts.payable_vnd === 0)
    return "Đơn 0đ không cần thu tiền hoặc chuyển khoản. Không ghi biên nhận thu/hoàn tiền giả.";
  if (order.payment_status === "REFUNDED")
    return "Đã ghi nhận hoàn đủ khoản đã thu. Không thu lại.";
  if (order.payment_status === "CANCELLED")
    return "Đã đóng nghĩa vụ thu. Không thu tiền cho đơn này.";
  if (order.payment_status === "UNKNOWN")
    return "Chưa rõ kết quả thu tiền. Cần đối soát; không thu lại khi chưa xác định.";
  if (["CANCELLED", "EXPIRED"].includes(order.status))
    return "Đơn đã đóng. Đối soát khoản đã thu hoặc cần hoàn; không thu tiền cho đơn này.";
  if (order.payment_method === "COD") {
    if (order.payment_status === "SUCCEEDED")
      return "Đã ghi nhận thu đủ COD. Không thu lại.";
    if (order.payment_status === "PENDING")
      return `COD cần thu: ${money(order.amounts.payable_vnd)}. Chỉ ghi nhận sau khi đã nhận đủ tiền.`;
    return "Chưa xác định nghĩa vụ thu COD. Đọc lại đơn hoặc liên hệ hỗ trợ trước khi thu.";
  }
  return order.payment_status === "SUCCEEDED"
    ? "Đơn online đã xác nhận thanh toán. Không thu COD."
    : "Chưa xác nhận tiền online. Cần đối soát trước khi giao hàng.";
}
export function OrderItemIdentity({
  item,
  snapshotKind = "PURCHASE",
  currentImage,
}: {
  item: Record<string, unknown>;
  snapshotKind?: "PURCHASE" | "EXCHANGE";
  currentImage?:string;
}) {
  const snapshot = record(item.product_snapshot),
    values = variantLabel(record(snapshot.variant_values), "");
  const variant = values || text(snapshot.variant_title);
  return (
    <div className="order-item-identity">
      {currentImage&&<div className="order-item-current-image"><ProductImage src={currentImage} name={text(snapshot.title)??'sản phẩm'} alt="Ảnh sản phẩm hiện tại"/><small>Ảnh hiện tại</small></div>}
      <div>
      <p>
        <strong>
          {text(snapshot.title) ?? "Mục đơn cũ chưa có tên snapshot"}
        </strong>
      </p>
      <p>
        {variant
          ? `Phân loại: ${variant}`
          : "Đơn cũ chưa lưu màu/size. Cần đối chiếu với khách trước khi lấy hàng."}
      </p>
      {text(item.sku_snapshot) && (
        <p>
          {snapshotKind === "EXCHANGE"
            ? "SKU lúc xuất hàng đổi"
            : "SKU khi đặt"}
          : {String(item.sku_snapshot)}
        </p>
      )}
      <p>
        Số lượng:{" "}
        {typeof item.quantity === "number" ? item.quantity : "Chưa có dữ liệu"}
      </p>
      {typeof item.unit_price_vnd === "number" && (
        <p>
          {snapshotKind === "EXCHANGE"
            ? "Đơn giá đối chiếu khi đổi"
            : "Đơn giá khi đặt"}
          : {money(item.unit_price_vnd)}
        </p>
      )}
      {typeof item.line_total_vnd === "number" && (
        <p>Thành tiền: {money(item.line_total_vnd)}</p>
      )}
      </div>
    </div>
  );
}
export function OrderDeliveryAddress({ order }: { order: Order }) {
  const address = record(order.address_snapshot),
    name = text(address.recipient_name),
    phone = text(address.phone);
  const parts = ["line1", "ward", "district", "city"]
    .map((key) => text(address[key]))
    .filter(Boolean);
  return (
    <section aria-label="Địa chỉ giao hàng đã chốt">
      <h3>Thông tin giao hàng đã chốt</h3>
      {name && phone && parts.length ? (
        <address style={{ fontStyle: "normal", overflowWrap: "anywhere" }}>
          {name}
          <br />
          <a href={"tel:" + phone}>{phone}</a>
          <br />
          {parts.join(", ")}
        </address>
      ) : (
        <p role="status">
          Đơn cũ thiếu thông tin người nhận hoặc địa chỉ. Đối chiếu với khách
          trước khi bàn giao; không dùng địa chỉ hồ sơ hiện tại thay lịch sử.
        </p>
      )}
    </section>
  );
}
export function OrderPackingSheet({ order }: { order: Order }) {
  const images=useCurrentOrderImages(order.items??[]);
  return (
    <section aria-label="Thông tin lấy hàng và giao hàng">
      <PrintPackingSlip order={order} />
      <OrderDeliveryAddress order={order} />
      <h3>Danh sách lấy hàng</h3>
      {order.items?.length ? (
        order.items.map((item, index) => (
          <article
            className="boot-card"
            key={typeof item.id === "string" ? item.id : index}
          >
            <OrderItemIdentity item={item} currentImage={images.get(String(item.variant_id??item.product_id))} />
          </article>
        ))
      ) : (
        <p>Chưa có dữ liệu món trong đơn. Đọc lại đơn trước khi lấy hàng.</p>
      )}
      <p>{collectionInstruction(order)}</p>
    </section>
  );
}
export function ReturnPolicyNotice({
  policy,
}: {
  policy?: Order["return_policy_snapshot"];
}) {
  if (!policy?.return_address)
    return (
      <p>
        Đơn cũ chưa lưu snapshot chính sách. Cửa hàng xét từng ca; không áp hồi
        tố hạn 7 ngày.
      </p>
    );
  const a = policy.return_address;
  return (
    <section aria-label="Chính sách đổi trả đã chốt">
      <p>
        Gửi yêu cầu trong 7×24 giờ kể từ khi đơn hoàn tất. Yêu cầu gửi đúng hạn
        tiếp tục xử lý sau hạn. Hoàn đủ khoản đã thu, gồm phí giao ban đầu;
        không trừ phí trả hàng.
      </p>
      <p>
        Store chịu phí khi lỗi Store; khách chịu khi đổi ý / chọn sai. Kết luận
        bên có lỗi phải được ghi trong quyết định; tranh chấp chuyển Admin xem
        xét.
      </p>
      <address>
        Địa chỉ nhận trả: {a.recipient_name} · {a.phone}
        <br />
        {[a.line1, a.ward, a.district, a.city].join(", ")}
      </address>
      <p>
        Chỉ gửi hàng sau khi yêu cầu được chấp thuận và nhận hướng dẫn của cửa
        hàng.
      </p>
    </section>
  );
}
export function OrderTimeline({ order }: { order: Order }) {
  const formatTime = (value: string) =>
    new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  return (
    <section className="order-timeline" aria-label="Diễn biến đơn hàng">
      <h3>Diễn biến đơn hàng (giờ Việt Nam)</h3>
      {order.created_at && (
        <p>
          Tạo đơn:{" "}
          <time dateTime={order.created_at}>
            {formatTime(order.created_at)}
          </time>
        </p>
      )}
      {order.timeline?.length ? (
        <ol>
          {order.timeline.map((event, index) => (
            <li key={index}>
              <strong>{orderStatusLabel(event.status)}</strong>
              <span>
                <time dateTime={event.occurred_at}>
                  {formatTime(event.occurred_at)}
                </time>{" "}
                ·{" "}
                {event.actor_kind === "CUSTOMER"
                  ? "Khách hàng"
                  : event.actor_kind === "SYSTEM"
                    ? "Hệ thống"
                    : "Cửa hàng"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p>Chưa có lịch sử trạng thái trong dữ liệu đơn này.</p>
      )}
    </section>
  );
}
