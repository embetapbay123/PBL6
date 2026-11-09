import { ReturnPolicyNotice } from "../../components/OrderPresentation";
import { FormEvent, useEffect, useRef, useState, useId } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ErrorView, Loading } from "../../bootstrap/components";
import { customerReturnUrl, ReturnRequestView } from "./ReturnRequestView";
import { ReturnActions } from "./ReturnActions";
type Body = {
  type: "REFUND" | "EXCHANGE";
  reason: string;
  expected_order_version: number;
};
export function OrderReturnsPanel({
  order,
}: {
  order: OperationOutputs["getOwnOrder"];
}) {
  if (order.status !== "COMPLETED" && !(['GHN','PLATFORM'].includes(order.shipping_mode??'')&&order.shipping_delivered_at&&order.status==='SHIPPED')) return null;
  return <Panel key={order.id} order={order} />;
}
function Panel({ order }: { order: OperationOutputs["getOwnOrder"] }) {
  const [now, setNow] = useState(() => Date.now());
  const deliveredOrCompletedAt = ['GHN', 'PLATFORM'].includes(order.shipping_mode ?? '')
    ? order.shipping_delivered_at
    : order.completed_at;
  const hasPolicy = !!order.return_policy_snapshot;
  const windowHours = order.return_policy_snapshot?.window_hours;
  const deadlineMs = hasPolicy && deliveredOrCompletedAt && typeof windowHours === 'number'
    ? new Date(deliveredOrCompletedAt).getTime() + windowHours * 3600000
    : undefined;
  const isExpired = hasPolicy && deadlineMs !== undefined && now > deadlineMs;

  useEffect(() => {
    if (!hasPolicy || deadlineMs === undefined) return;
    const remaining = deadlineMs - Date.now();
    if (remaining <= 0) {
      setNow(Date.now());
      return;
    }
    const timer = setTimeout(() => {
      setNow(Date.now());
    }, Math.min(remaining + 50, 1000));
    return () => clearTimeout(timer);
  }, [hasPolicy, deadlineMs, now]);
  const fieldId = useId(),
    cache = useQueryClient(),
    flight = useRef(false);
  const [type, setType] = useState<"REFUND" | "EXCHANGE">("REFUND"),
    [reason, setReason] = useState(""),
    [pending, setPending] = useState<Body>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const query = useQuery({
    queryKey: ["return-requests", "CUSTOMER", order.id],
    refetchOnWindowFocus: false,
    queryFn: () =>
      callOperation("listOwnReturnRequests", {
        query: { order_id: order.id, page: 1, size: 1 },
      }),
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (flight.current || (!pending && !reason.trim())) return;
    const currentExpired = hasPolicy && deadlineMs !== undefined && Date.now() > deadlineMs;
    if (currentExpired && !pending) {
      setNow(Date.now());
      return;
    }
    const body = pending ?? {
      type,
      reason: reason.trim(),
      expected_order_version: order.version,
    };
    flight.current = true;
    setBusy(true);
    setPending(body);
    setError(undefined);
    try {
      await callOperation("createReturnRequest", {
        path: { id: order.id },
        body,
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["return-requests"] }),
        cache.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      setPending(undefined);
      setReason("");
    } catch (e) {
      setError(e);
      if (
        e instanceof ApiError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 429
      ) {
        setPending(undefined);
        if (e.status === 409) await query.refetch();
      }
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <section id="returns" aria-label="Đổi trả đơn hàng">
      <h2>Đổi trả và hoàn tiền</h2>
      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {query.data?.items.map((request) => (
        <ReturnRequestView key={request.id} request={request}>
          <ReturnActions
            key={request.id}
            request={request}
            scope="CUSTOMER"
            refresh={() =>
              cache.invalidateQueries(
                { queryKey: ["return-requests"] },
                { throwOnError: true },
              )
            }
          />
        </ReturnRequestView>
      ))}
      {query.data && !query.data.items.length && (
        isExpired && !pending ? (
          <div className="return-expired-box" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, margin: "14px 0" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#991b1b" }}>Đã hết hạn gửi yêu cầu đổi trả</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#7f1d1d" }}>
              Thời hạn yêu cầu đổi trả cho đơn hàng này đã kết thúc vào{" "}
              <strong>
                {new Date(deadlineMs!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
              </strong>{" "}
              (giờ Việt Nam).
            </p>
            <details className="return-policy-details" style={{ marginTop: 12 }}>
              <summary>Chính sách đổi trả</summary>
              <ReturnPolicyNotice policy={order.return_policy_snapshot} />
            </details>
          </div>
        ) : (
          <form className="return-create-form customer-return-create" onSubmit={submit}>
            <p>Yêu cầu áp dụng cho toàn đơn. Chờ cửa hàng duyệt rồi mới gửi trả hàng.</p>
            {hasPolicy && deliveredOrCompletedAt && (
              <p>Hạn gửi yêu cầu{" "}
                <strong>{new Date(deadlineMs!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</strong>
                {" "}(giờ Việt Nam)
              </p>
            )}
            <details className="return-policy-details">
              <summary>Chính sách đổi trả</summary>
              <ReturnPolicyNotice policy={order.return_policy_snapshot} />
            </details>
            <label htmlFor={fieldId + "-type"}>Loại yêu cầu</label>
            <select
              id={fieldId + "-type"}
              disabled={busy || !!pending}
              value={pending ? pending.type : type}
              onChange={(event) =>
                setType(event.target.value as "REFUND" | "EXCHANGE")
              }
            >
              <option value="REFUND">Trả hàng và hoàn tiền</option>
              <option value="EXCHANGE">Đổi hàng</option>
            </select>
            <label htmlFor={fieldId + "-reason"}>Lý do đổi trả</label>
            <textarea
              id={fieldId + "-reason"}
              required
              rows={3}
              maxLength={2000}
              disabled={busy || !!pending}
              value={pending ? pending.reason : reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <button disabled={busy || (!pending && !reason.trim()) || (isExpired && !pending)}>
                {busy
                  ? "Đang gửi…"
                  : pending
                    ? "Gửi lại yêu cầu"
                    : "Gửi"}
              </button>
              {pending && (
                <button
                  type="button"
                  className="ui-button ui-button-secondary"
                  disabled={busy || query.isFetching}
                  onClick={async () => {
                    const res = await query.refetch();
                    if (res.data?.items?.length) {
                      setPending(undefined);
                      setReason("");
                    }
                  }}
                >
                  Kiểm tra lại
                </button>
              )}
            </div>
          </form>
        )
      )}
      {error !== undefined && <ErrorView error={error} />}{" "}
      {pending && !busy && (
        <p>
          Chưa xác định được kết quả; gửi lại sẽ giữ nguyên nội dung yêu cầu.
        </p>
      )}
      {query.data?.items[0]
        ? <Link to={customerReturnUrl(query.data.items[0])}>Theo dõi</Link>
        : <Link to="/customer/returns">Xem danh sách đổi trả</Link>}
    </section>
  );
}
