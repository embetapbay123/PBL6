import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../api/auth-context";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ErrorView, Loading } from "../../bootstrap/components";
import { OrderFacts } from "../../live/OrderFacts";
import { ReturnControls } from "../../live/ReturnControls";
function itemTitle(item: Record<string, unknown>) {
  const snapshot = item.product_snapshot;
  const title =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? (snapshot as Record<string, unknown>).title
      : undefined;
  return String(
    title ??
      item.title ??
      item.product_title ??
      item.product_id ??
      "Mục đơn hàng",
  );
}
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>(),
    { session } = useAuth();
  return (
    <Detail key={(session?.context?.user_id ?? "guest") + ":" + id} id={id} />
  );
}
function Detail({ id }: { id?: string }) {
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
    <section className="boot-card">
      <Link to="/customer/orders">Quay lại lịch sử đơn hàng</Link>
      <h1>Chi tiết đơn hàng</h1>
      {error != null && (
        <ErrorView error={error} onRetry={() => setReload((n) => n + 1)} />
      )}
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <p>Mã đơn: {data.id}</p>
            <p>
              Trạng thái: {data.status} · phiên bản {data.version}
            </p>
            <p>
              Thanh toán: {data.payment_method} ·{" "}
              {data.payment_status ?? "Chưa có trạng thái"}
            </p>
            {data.refund_status && (
              <p role="status">
                {data.refund_status === "SUCCEEDED"
                  ? "Đã hoàn tiền."
                  : "Chưa xác nhận hoàn tiền. Trạng thái yêu cầu: " +
                    data.refund_status}
              </p>
            )}
            {data.status === "AWAITING_PAYMENT" &&
              data.payment_method === "SANDBOX" && (
                <Link to={"/orders/" + data.id + "/pay"}>Mở thanh toán</Link>
              )}
            <OrderFacts order={data} />
            <ReturnControls
              order={data}
              updated={(value) => {
                setData(value);
                setStale(false);
              }}
            />
            <h2>Sản phẩm trong đơn</h2>
            {data.items?.length ? (
              data.items.map((item, i) => (
                <article key={typeof item.id === "string" ? item.id : i}>
                  <p>{itemTitle(item)}</p>
                  {typeof item.quantity === "number" && (
                    <p>Số lượng: {item.quantity}</p>
                  )}
                  {typeof item.unit_price_vnd === "number" &&
                    Number.isSafeInteger(item.unit_price_vnd) && (
                      <p>Đơn giá: {money(item.unit_price_vnd)}</p>
                    )}
                </article>
              ))
            ) : (
              <p>API chưa cung cấp danh sách mục đơn.</p>
            )}
            <dl>
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
              <form onSubmit={cancel}>
                <label>
                  Lý do hủy
                  <input
                    maxLength={200}
                    value={reason}
                    disabled={busy}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy || stale}>Hủy đơn hàng</button>
              </form>
            )}
            {stale && (
              <p>
                Đơn đã thay đổi hoặc cần đối soát. Tải lại trước khi thực hiện
                tiếp.
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
          </>
        )
      )}
    </section>
  );
}
export default OrderDetailPage;
