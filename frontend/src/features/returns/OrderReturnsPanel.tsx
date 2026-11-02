import { ReturnPolicyNotice } from "../../components/OrderPresentation";
import { FormEvent, useRef, useState, useId } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ErrorView, Loading } from "../../bootstrap/components";
import { ReturnRequestView } from "./ReturnRequestView";
import { ReturnActions } from "./ReturnActions";
import { ProgressSteps } from "../../components/ui/ProgressSteps";
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
  if (order.status !== "COMPLETED") return null;
  return <Panel key={order.id} order={order} />;
}
function Panel({ order }: { order: OperationOutputs["getOwnOrder"] }) {
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
      <ReturnPolicyNotice policy={order.return_policy_snapshot} />
      {order.completed_at && order.return_policy_snapshot && (
        <p>
          Hạn gửi yêu cầu:{" "}
          {new Date(
            new Date(order.completed_at).getTime() + 168 * 3600000,
          ).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}{" "}
          (giờ Việt Nam).
        </p>
      )}
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
        <form className="return-create-form" onSubmit={submit}>
          <ProgressSteps
            label="Chuẩn bị yêu cầu"
            steps={[
              "Đọc phạm vi",
              "Chọn phương án và lý do",
              "Gửi để cửa hàng xem xét",
            ]}
            current={reason.trim() ? 2 : 1}
          />
          <p>
            Yêu cầu áp dụng cho toàn bộ đơn hàng, chưa hỗ trợ trả một phần. Gian
            hàng sẽ xem xét lý do và hướng dẫn gửi lại hàng. Chỉ gửi hàng sau
            khi được chấp thuận.
          </p>
          <label htmlFor={fieldId + "-type"}>Loại yêu cầu</label>
          <select
            id={fieldId + "-type"}
            disabled={busy || !!pending}
            value={type}
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
            maxLength={2000}
            disabled={busy || !!pending}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button disabled={busy || (!pending && !reason.trim())}>
            {busy
              ? "Đang gửi…"
              : pending
                ? "Gửi lại yêu cầu"
                : "Gửi yêu cầu đổi trả"}
          </button>
        </form>
      )}
      {error !== undefined && <ErrorView error={error} />}{" "}
      {pending && !busy && (
        <p>
          Chưa xác định được kết quả; gửi lại sẽ giữ nguyên nội dung yêu cầu.
        </p>
      )}
      <Link to="/customer/returns">Theo dõi yêu cầu đổi trả</Link>
    </section>
  );
}
