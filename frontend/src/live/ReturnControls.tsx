import { useRef, useState } from "react";
import { useAuth } from "../api/auth-context";
import { callOperation } from "../api/operations";
import { ApiError } from "../api/client";
import type {
  OperationId,
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { ErrorView } from "../bootstrap/components";
import { formatMoney, useStoreAccess } from "./useLiveData";
import { timeLabel } from "./OrderFacts";
type Order = OperationOutputs["getOwnOrder"];
type Kind =
  | "requestOrderReturn"
  | "reportDeliveryReturn"
  | "decideOrderReturn"
  | "recordReturnCodRefund";
type Pending = { operation: Kind; body: any };
export function ReturnControls({
  order,
  store = false,
  updated,
}: {
  order: Order;
  store?: boolean;
  updated: (order: Order) => void;
}) {
  const { session } = useAuth(),
    access = useStoreAccess();
  const key = `pbl6_return_${session?.context?.user_id}_${order.id}`;
  const [pending, setPending] = useState<Pending | undefined>(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(key) ?? "null");
      return v &&
        [
          "requestOrderReturn",
          "reportDeliveryReturn",
          "decideOrderReturn",
          "recordReturnCodRefund",
        ].includes(v.operation) &&
        v.body?.operation_id
        ? v
        : undefined;
    } catch {
      return undefined;
    }
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [stale, setStale] = useState(false),
    [reason, setReason] = useState(""),
    [received, setReceived] = useState(false),
    [resale, setResale] = useState(""),
    [cash, setCash] = useState(false),
    [amount, setAmount] = useState("");
  const flight = useRef(false);
  const freeze = !!pending || busy || stale;
  const r = order.return_case;
  const clear = () => {
    setPending(undefined);
    try {
      sessionStorage.removeItem(key);
    } catch {}
  };
  async function send(operation: Kind, body: any) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    const current = pending ?? {
      operation,
      body: { ...body, operation_id: crypto.randomUUID() },
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(current));
    } catch {}
    try {
      const result = await callOperation(current.operation, {
        path: { id: order.id },
        body: current.body,
      });
      clear();
      setReason("");
      setReceived(false);
      setCash(false);
      updated(result);
    } catch (e) {
      setError(e);
      if (
        !(e instanceof ApiError) ||
        e.status === 0 ||
        e.status === 408 ||
        e.status >= 500
      )
        setPending(current);
      else {
        clear();
        setStale(true);
      }
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  const decide = (action: "APPROVE" | "REJECT" | "RECEIVE") =>
    void send("decideOrderReturn", {
      action,
      reason: reason.trim(),
      expected_version: r!.version,
      expected_order_version: order.version,
      ...(action === "RECEIVE" ? { restock: resale === "YES" } : {}),
    });
  const canRequest =
    !r &&
    (!store
      ? order.status === "COMPLETED"
      : access.owner && order.status === "SHIPPED");
  return (
    <section className="boot-card market-return-panel">
      <h3>Trả hàng / Hàng giao không thành công</h3>
      {r ? (
        <>
          <p>
            {r.kind === "DELIVERY_FAILED"
              ? "Giao thất bại, trả về Store"
              : "Khách yêu cầu trả hàng"}{" "}
            ·{" "}
            <strong>
              {
                {
                  REQUESTED: "Chờ duyệt",
                  APPROVED: "Đã duyệt, chờ nhận hàng",
                  REJECTED: "Đã từ chối",
                  RECEIVED: "Đã nhận hàng trả",
                }[r.status]
              }
            </strong>
          </p>
          <p>Lý do: {r.reason}</p>
          <p>Đề nghị lúc: {timeLabel(r.requested_at)}</p>
          {r.decided_at && (
            <p>
              Quyết định lúc: {timeLabel(r.decided_at)} · {r.decision_reason}
            </p>
          )}
          {r.received_at && (
            <>
              <p>Nhận hàng thực tế: {timeLabel(r.received_at)}</p>
              <p>
                {r.stock_state === "RESTOCKED"
                  ? "Đã nhập lại kho"
                  : r.stock_state === "QUARANTINED"
                    ? "Hàng không đủ điều kiện bán lại; không cộng kho"
                    : "Đang chờ hệ thống xác nhận nhập lại kho"}
              </p>
            </>
          )}
          {r.cash_refund_due_vnd > 0 && (
            <p>
              Cần hoàn tiền mặt COD: {formatMoney(r.cash_refund_due_vnd)}. Chưa
              ghi nhận đã hoàn.
            </p>
          )}
        </>
      ) : (
        <p>
          {order.status === "SHIPPED"
            ? "Store báo giao thất bại và xác nhận hàng thực sự về sau."
            : "Khách có thể gửi đề nghị trả toàn bộ đơn sau khi đơn hoàn tất."}
        </p>
      )}
      {error != null && <ErrorView error={error} />}
      {stale && <p>Tải lại chi tiết đơn trước khi thực hiện tiếp.</p>}
      {pending && (
        <div role="status">
          <p>
            Kết quả chưa rõ. Kiểm tra lại sẽ dùng đúng mã và dữ liệu trước đó.
          </p>
          <button
            disabled={busy}
            onClick={() => void send(pending.operation, pending.body)}
          >
            Kiểm tra lại yêu cầu trả hàng
          </button>
        </div>
      )}
      {(canRequest ||
        (store &&
          access.owner &&
          r &&
          ["REQUESTED", "APPROVED"].includes(r.status))) && (
        <>
          <label>
            Lý do xử lý trả hàng
            <textarea
              required
              maxLength={500}
              disabled={freeze}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {canRequest && (
            <button
              disabled={freeze || !reason.trim()}
              onClick={() =>
                void send(
                  store ? "reportDeliveryReturn" : "requestOrderReturn",
                  {
                    reason: reason.trim(),
                    expected_order_version: order.version,
                  },
                )
              }
            >
              {store
                ? "Báo giao thất bại / chờ hàng về"
                : "Gửi đề nghị trả hàng"}
            </button>
          )}
          {store && access.owner && r?.status === "REQUESTED" && (
            <>
              <button
                disabled={freeze || !reason.trim()}
                onClick={() => decide("APPROVE")}
              >
                Duyệt yêu cầu trả hàng
              </button>
              <button
                disabled={freeze || !reason.trim()}
                onClick={() => decide("REJECT")}
              >
                Từ chối trả hàng
              </button>
            </>
          )}
          {store && access.owner && r?.status === "APPROVED" && (
            <>
              <label>
                Kiểm tra tình trạng hàng
                <select
                  value={resale}
                  disabled={freeze}
                  onChange={(e) => setResale(e.target.value)}
                >
                  <option value="">Chọn kết quả kiểm tra</option>
                  <option value="YES">Có thể bán lại — nhập lại kho</option>
                  <option value="NO">
                    Hỏng / không bán lại — không cộng kho
                  </option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={received}
                  disabled={freeze}
                  onChange={(e) => setReceived(e.target.checked)}
                />
                Tôi là chủ gian hàng, đã nhận đủ hàng của đơn và kiểm tra thực
                tế.
              </label>
              <button
                disabled={freeze || !received || !resale || !reason.trim()}
                onClick={() => decide("RECEIVE")}
              >
                Xác nhận đã nhận hàng trả
              </button>
            </>
          )}
        </>
      )}
      {store &&
        access.owner &&
        r?.status === "RECEIVED" &&
        r.cash_refund_due_vnd > 0 && (
          <>
            <label>
              Số tiền mặt đã trả khách
              <input
                type="number"
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                value={amount}
                disabled={freeze}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={cash}
                disabled={freeze}
                onChange={(e) => setCash(e.target.checked)}
              />
              Tôi đã thực sự hoàn tiền mặt cho khách.
            </label>
            <button
              disabled={
                freeze || !cash || Number(amount) !== r.cash_refund_due_vnd
              }
              onClick={() =>
                void send("recordReturnCodRefund", {
                  expected_order_version: order.version,
                  amount_vnd: Number(amount),
                  cash_repaid: true,
                })
              }
            >
              Ghi nhận đã hoàn tiền COD
            </button>
          </>
        )}
    </section>
  );
}
