import type { OperationOutputs } from "../api/operations.generated";
import { variantLabel } from "./variant-identity";
import { orderNextStep } from "./order-actions";
import { PrintPackingSlip } from "./PrintPackingSlip";
import {useCurrentOrderImages} from './useCurrentOrderImages';
import {ProductImage} from './ProductImage';
import { ProgressSteps } from "./ui/ProgressSteps";
type Order = OperationOutputs["getOwnOrder"];
export function OrderNextStep({
  order,
  store = false,
}: {
  order: Order;
  store?: boolean;
}) {
  const next = orderNextStep(order, store);
  return next ? (
    <section aria-label="Bước tiếp theo">
      <p>{next}</p>
    </section>
  ) : null;
}
const labels: Record<string, string> = {
  PREPARING: "Đang tạo đơn",
  AWAITING_PAYMENT: "Chờ thanh toán",
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Chờ lấy hàng",
  PROCESSING: "Đang đóng gói",
  SHIPPED: "Đang giao hàng",
  COMPLETED: "Đã giao / Hoàn tất",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn thanh toán",
  RECOVERING: "Đang đối soát hoàn hàng",
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
    return "Đơn 0đ, không cần thu tiền.";
  if (order.payment_status === "REFUNDED")
    return "Đã hoàn tiền. Không thu lại.";
  if (order.payment_status === "CANCELLED")
    return "Đã hủy khoản thu. Không thu tiền.";
  if (order.payment_status === "UNKNOWN")
    return "Chưa rõ kết quả thu tiền. Kiểm tra trước khi thu lại.";
  if (["CANCELLED", "EXPIRED"].includes(order.status))
    return "Đơn đã đóng, không thu thêm tiền.";
  if (order.payment_method === "COD") {
    if (order.payment_status === "SUCCEEDED")
      return "Đã ghi nhận thu đủ COD. Không thu lại.";
    if (order.payment_status === "PENDING")
      return `COD cần thu: ${money(order.amounts.payable_vnd)}.`;
    return "Chưa rõ khoản COD. Kiểm tra trước khi thu.";
  }
  return order.payment_status === "SUCCEEDED"
    ? "Đã thanh toán online. Không thu COD."
    : "Chưa xác nhận thanh toán online. Chưa giao hàng.";
}
export function OrderItemIdentity({
  item,
  snapshotKind = "PURCHASE",
  currentImage,
  scope = "CUSTOMER",
}: {
  item: Record<string, unknown>;
  snapshotKind?: "PURCHASE" | "EXCHANGE";
  currentImage?: string;
  scope?: "CUSTOMER" | "STORE" | "ADMIN";
}) {
  const snapshot = record(item.product_snapshot),
    values = variantLabel(record(snapshot.variant_values), "");
  const variant = values || text(snapshot.variant_title);
  return (
    <div className="order-item-identity">
      {currentImage&&<div className="order-item-current-image" title="Ảnh sản phẩm hiện tại"><ProductImage src={currentImage} name={text(snapshot.title)??'sản phẩm'} alt="Ảnh sản phẩm hiện tại"/></div>}
      <div>
      <p>
        <strong>
          {text(snapshot.title) ?? "Sản phẩm chưa có tên"}
        </strong>
      </p>
      <p>
        {variant
          ? `Phân loại: ${variant}`
          : (scope === "STORE" || scope === "ADMIN")
            ? "Thiếu phân loại. Xác nhận với khách trước khi lấy hàng."
            : "Phân loại tiêu chuẩn"}
      </p>
      {scope !== 'CUSTOMER' && text(item.sku_snapshot) && (
        <p>
          {snapshotKind === "EXCHANGE"
            ? "SKU hàng đổi"
            : "SKU"}
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
            ? "Đơn giá hàng đổi"
            : "Đơn giá"}
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
export function OrderDeliveryAddress({
  order,
  scope = "CUSTOMER",
  showHeading = true,
}: {
  order: Order;
  scope?: "CUSTOMER" | "STORE" | "ADMIN";
  showHeading?: boolean;
}) {
  const address = record(order.address_snapshot),
    name = text(address.recipient_name),
    phone = text(address.phone);
  const parts = ["line1", "ward", "district", "city"]
    .map((key) => text(address[key]))
    .filter(Boolean);
  return (
    <section aria-label="Địa chỉ giao hàng đã chốt">
      {showHeading && <h3>Địa chỉ nhận hàng</h3>}
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
          {scope === "STORE" || scope === "ADMIN"
            ? "Đơn cũ thiếu thông tin người nhận hoặc địa chỉ. Xác nhận với khách trước khi giao."
            : "Chưa có đầy đủ thông tin địa chỉ người nhận."}
        </p>
      )}
    </section>
  );
}
export function OrderPackingSheet({ order, showPayment = true }: { order: Order; showPayment?: boolean }) {
  const images=useCurrentOrderImages(order.items??[]);
  return (
    <section aria-label="Thông tin lấy hàng và giao hàng">
      <OrderDeliveryAddress order={order} scope="STORE" />
      <div className="packing-list-heading">
        <h3>Danh sách lấy hàng</h3>
        <PrintPackingSlip order={order} />
      </div>
      {order.items?.length ? (
        order.items.map((item, index) => (
          <article
            className="boot-card"
            key={typeof item.id === "string" ? item.id : index}
          >
            <OrderItemIdentity
              item={item}
              currentImage={images.get(String(item.variant_id??item.product_id))}
              scope="STORE"
            />
          </article>
        ))
      ) : (
        <p>Chưa tải được sản phẩm. Làm mới đơn trước khi lấy hàng.</p>
      )}
      {showPayment && <p>{collectionInstruction(order)}</p>}
    </section>
  );
}
export function ReturnPolicyNotice({
  policy,
  scope = "CUSTOMER",
}: {
  policy?: Order["return_policy_snapshot"];
  scope?: "CUSTOMER" | "STORE" | "ADMIN";
}) {
  if (!policy?.return_address)
    return (
      <p>
        {scope === "STORE" || scope === "ADMIN"
          ? "Đơn cũ chưa lưu snapshot chính sách. Cửa hàng xét từng ca; không áp hồi tố hạn 7 ngày."
          : "Áp dụng theo chính sách đổi trả tiêu chuẩn của sàn và gian hàng."}
      </p>
    );
  const a = policy.return_address;
  return (
    <section aria-label="Chính sách đổi trả đã chốt">
      <p>
        Gửi yêu cầu trong 7×24 giờ từ khi giao thành công. Yêu cầu đúng hạn tiếp tục
        được xử lý sau hạn. Hoàn đủ tiền đã thu, gồm phí giao ban đầu.
      </p>
      <p>
        Cửa hàng chịu phí trả khi giao sai/lỗi; khách chịu phí khi đổi ý hoặc chọn sai.
        Phí trả được xử lý riêng, không trừ vào khoản hoàn. Tranh chấp do Admin xem xét.
      </p>
      <address>
        Địa chỉ nhận trả: {a.recipient_name} · {a.phone}
        <br />
        {[a.line1, a.ward, a.district, a.city].join(", ")}
      </address>
      <p>
        Chờ cửa hàng duyệt và hướng dẫn trước khi gửi trả.
      </p>
    </section>
  );
}
export function OrderProgressTracker({ order }: { order: Order }) {
  const steps = ["Đơn đã đặt", "Đã xác nhận", "Đang giao hàng", "Hoàn tất"];
  const isCancelled = order.status === "CANCELLED" || order.status === "EXPIRED";

  let currentStep = 0;
  if (order.status === "COMPLETED") {
    currentStep = 4;
  } else if (order.status === "SHIPPED") {
    currentStep = 2;
  } else if (["CONFIRMED", "PROCESSING"].includes(order.status)) {
    currentStep = 1;
  } else {
    currentStep = 0;
  }

  if (isCancelled) {
    return (
      <div className="order-stepper-container is-cancelled bg-rose-50 border border-rose-200 rounded-xl p-4 my-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 block">Trạng thái đơn hàng</span>
        <strong className="text-base text-rose-900">{orderStatusLabel(order.status)}</strong>
        <p className="text-xs text-rose-600 mt-1">Đơn hàng này không còn tiếp tục luồng xử lý thông thường.</p>
      </div>
    );
  }

  return (
    <div className="order-stepper-container bg-white border border-slate-200 rounded-xl p-4 sm:p-6 my-4 shadow-sm">
      <ProgressSteps
        steps={steps}
        current={currentStep}
        label="Tiến trình đơn hàng"
      />
    </div>
  );
}

export function OrderTimeline({ order }: { order: Order }) {
  const formatTime = (value: string) =>
    new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  return (
    <section className="order-timeline" aria-label="Diễn biến đơn hàng">
      <details className="order-timeline-details">
        <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900">
          Xem lịch sử cập nhật trạng thái ({order.timeline?.length ?? 0} sự kiện)
        </summary>
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
        <p>Chưa có cập nhật.</p>
      )}
      </details>
    </section>
  );
}
