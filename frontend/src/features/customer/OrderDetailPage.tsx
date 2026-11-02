import { useConfirm } from "../../components/ConfirmDialog";
import { ContactStoreButton } from "./ContactStoreButton";
import { OwnDeliveryReturn } from "../returns/DeliveryReturnsPage";
import {
  OrderItemIdentity,
  OrderNextStep,
  OrderTimeline,
  OrderDeliveryAddress,
  ReturnPolicyNotice,
  orderStatusLabel,
} from "../../components/OrderPresentation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../api/auth-context";
import { ApiError, isUncertainMutation } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ErrorView, Loading } from "../../bootstrap/components";
import { OrderReturnsPanel } from "../returns/OrderReturnsPanel";
import { canStartOrderPayment } from "../../components/order-actions";
import {
  paymentMethodLabel,
  paymentStatusLabel,
  refundStatusLabel,
} from "../../components/OrderListTools";
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>(),
    { session } = useAuth();
  return (
    <Detail key={(session?.context?.user_id ?? "guest") + ":" + id} id={id} />
  );
}
function Detail({ id }: { id?: string }) {
  const { confirm, dialog } = useConfirm();
  const location = useLocation(),
    candidate = location.state?.ordersReturnTo;
  const returnTo =
    typeof candidate === "string" &&
    (candidate === "/customer/orders" ||
      candidate.startsWith("/customer/orders?"))
      ? candidate
      : "/customer/orders";
  const [data, setData] = useState<OperationOutputs["getOwnOrder"]>(),
    [error, setError] = useState<unknown>(),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0);
  const alive = useRef(true),
    flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(undefined);
    setError(undefined);
    if (!id) {
      setError(new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng."));
      setLoading(false);
      return;
    }
    callOperation("getOwnOrder", { path: { id } })
      .then((v) => {
        if (active) {
          setData(v);
          setStale(false);
          if (v.purchase_group_id) {
            callOperation("getPurchaseGroupOrders", {
              path: { id: v.purchase_group_id },
            }).catch(() => {});
          }
          callOperation("getOrderRefund", { path: { id } }).catch(() => {});
        }
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  async function cancel(event: FormEvent) {
    event.preventDefault();
    if (!id || !data || flight.current || stale) return;
    if (
      !(await confirm({
        title: "Hủy đơn hàng?",
        description: `Đơn #${data.id.slice(-8).toUpperCase()} sẽ ngừng xử lý. ${reason.trim() ? "Lý do: " + reason.trim() + ". " : ""}Nếu đã thanh toán, kết quả hoàn tiền được theo dõi riêng. Muốn mua tiếp, bạn cần đặt đơn mới.`,
        confirmLabel: "Xác nhận hủy đơn",
      }))
    )
      return;
    if (flight.current || stale) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      const value = await callOperation("cancelOwnOrder", {
        path: { id },
        body: {
          expected_version: data.version,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      });
      if (alive.current) {
        setData(value);
        setNotice(
          "Đã hủy đơn theo phản hồi API. Trạng thái hoàn tiền hiển thị riêng.",
        );
      }
    } catch (e) {
      if (alive.current) {
        setError(e);
        if (
          isUncertainMutation(e) ||
          (e instanceof ApiError && e.status === 409)
        )
          setStale(true);
      }
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const money = (v: number) => v.toLocaleString("vi-VN") + " ₫";
  const canCancel =
    data &&
    ["AWAITING_PAYMENT", "PENDING", "CONFIRMED"].includes(data.status) &&
    data.payment_status !== "UNKNOWN";
  return (
    <section className="boot-card order-detail-page">
      {dialog}
      <Link to={returnTo}>Quay lại lịch sử đơn hàng</Link>
      <h1>Chi tiết đơn hàng</h1>
      <button
        type="button"
        disabled={loading || busy}
        onClick={() => setReload((n) => n + 1)}
      >
        Làm mới đơn
      </button>
      {error != null && (
        <ErrorView error={error} onRetry={() => setReload((n) => n + 1)} />
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <p>Mã đơn: #{data.id.slice(-8).toUpperCase()}</p>
            <ContactStoreButton storeId={data.store_id} orderId={data.id} />
            <p>Trạng thái: {orderStatusLabel(data.status)}</p>
            <p>
              Thanh toán: {paymentMethodLabel(data.payment_method)} ·{" "}
              {paymentStatusLabel(
                data.payment_status,
                data.amounts.payable_vnd,
              )}
            </p>
            {data.refund_status && (
              <p role="status">
                {data.refund_status === "SUCCEEDED"
                  ? "Đã hoàn tiền."
                  : "Chưa xác nhận hoàn tiền. Trạng thái yêu cầu: " +
                    refundStatusLabel(data.refund_status)}
              </p>
            )}
            {canStartOrderPayment(data) && (
              <Link to={"/orders/" + data.id + "/pay"}>Mở thanh toán</Link>
            )}
            <OrderNextStep order={data} />
            <h2 id="order-items">Sản phẩm trong đơn</h2>
            {data.items?.length ? (
              data.items.map((item, i) => (
                <article key={typeof item.id === "string" ? item.id : i}>
                  <OrderItemIdentity item={item} />
                  {typeof item.product_id === "string" && (
                    <div className="order-actions">
                      <Link to={"/products/" + item.product_id}>
                        Xem sản phẩm
                      </Link>
                      {data.status === "COMPLETED" && (
                        <Link to={"/products/" + item.product_id + "#reviews"}>
                          Viết đánh giá
                        </Link>
                      )}
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p>API chưa cung cấp danh sách mục đơn.</p>
            )}
            <OrderDeliveryAddress order={data} />
            {data.status !== "COMPLETED" && (
              <ReturnPolicyNotice policy={data.return_policy_snapshot} />
            )}
            <OrderTimeline order={data} />
            <OwnDeliveryReturn order={data} />
            <dl className="order-amounts">
              <dt>Tiền hàng</dt>
              <dd>{money(data.amounts.goods_vnd)}</dd>
              <dt>Giảm giá Store</dt>
              <dd>{money(data.amounts.store_discount_vnd)}</dd>
              <dt>Giảm giá sàn</dt>
              <dd>{money(data.amounts.platform_discount_vnd)}</dd>
              <dt>Phí giao hàng</dt>
              <dd>{money(data.amounts.shipping_vnd)}</dd>
              <dt>Tổng thanh toán</dt>
              <dd>{money(data.amounts.payable_vnd)}</dd>
            </dl>
            {canCancel && (
              <form id="cancel" onSubmit={cancel}>
                <label>
                  Lý do hủy
                  <input
                    maxLength={200}
                    value={reason}
                    disabled={busy || stale}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy || stale}>Hủy đơn hàng</button>
              </form>
            )}
            {stale && (
              <p>
                Đơn đã thay đổi hoặc cần đối soát. Bấm Làm mới đơn để kiểm tra
                trước khi thực hiện tiếp.
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
            {data && <OrderReturnsPanel order={data} />}
          </>
        )
      )}
    </section>
  );
}
export default OrderDetailPage;
