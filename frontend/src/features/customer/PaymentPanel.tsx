import { CopyButton } from "../../components/CopyButton";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { LoadingState } from "../../components/ui/Skeleton";
import React, { useEffect, useState } from "react";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
import { usePaymentStatus } from "./usePaymentStatus";
import { canStartOrderPayment } from "../../components/order-actions";

type Attempt = OperationOutputs["createPaymentAttempt"];
type Order = OperationOutputs["getOwnOrder"];

export function describePaymentError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503)
      return "Cổng thanh toán hiện chưa được bật. Vui lòng thử lại sau.";
    if (e.status === 409)
      return "Giao dịch cần được đối soát. Đừng thanh toán lại, hãy liên hệ hỗ trợ.";
    if (e.status === 422) return "Yêu cầu thanh toán không hợp lệ.";
    if (e.status === 401 || e.status === 403)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  return "Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.";
}

const formatVnd = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    v,
  );

const formatClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function PaymentPanel({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [setupError, setSetupError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Đọc Order mới nhất rồi tạo attempt (server dùng lại attempt/QR cũ nếu gọi ซ้ำ)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSetupError(null);
    setAttempt(null);
    (async () => {
      try {
        const o = await callOperation("getOwnOrder", { path: { id: orderId } });
        if (cancelled) return;
        setOrder(o);
        if (!canStartOrderPayment(o) || readOnly) return;
        const a = await callOperation("createPaymentAttempt", {
          path: { id: orderId },
          body: { expected_order_version: o.version },
        });
        if (!cancelled) {
          setNow(Date.now());
          setAttempt(a);
        }
      } catch (e) {
        if (!cancelled) setSetupError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, round, readOnly]);

  const { phase, rawStatus, lastError, refresh } = usePaymentStatus({
    enabled: !!attempt,
    expiresAt: attempt?.expires_at,
    fetchStatus: (signal) =>
      callOperation(
        "getPayment",
        { path: { id: attempt!.payment_id } },
        { signal },
      ),
  });

  useEffect(() => {
    if (!attempt?.expires_at || phase !== "waiting") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [attempt?.expires_at, phase]);

  if (loading)
    return (
      <div data-testid="payment-loading">
        <LoadingState label="Đang tạo mã thanh toán..." />
      </div>
    );

  if (setupError) {
    const blocked = setupError instanceof ApiError && setupError.status === 409;
    return (
      <Alert
        level={blocked ? "warning" : "error"}
        title={
          blocked ? "Cần kiểm tra giao dịch" : "Chưa thể tạo mã thanh toán"
        }
        data-testid="payment-setup-error"
      >
        <p>{describePaymentError(setupError)}</p>
        {!blocked && (
          <Button variant="secondary" onClick={() => setRound((r) => r + 1)}>
            Thử lại
          </Button>
        )}
        {setupError instanceof ApiError && setupError.correlationId && (
          <div className="ui-error-support">
            <span>Mã yêu cầu</span>
            <code>{setupError.correlationId}</code>
            <CopyButton
              value={setupError.correlationId}
              label="Sao chép mã yêu cầu"
              compact
            />
          </div>
        )}
      </Alert>
    );
  }

  if (order?.amounts.payable_vnd === 0)
    return (
      <p data-testid="payment-not-required">
        Đơn 0đ không cần chuyển tiền. Theo dõi xử lý hàng trong chi tiết đơn;
        không có giao dịch thu hoặc hoàn tiền.
      </p>
    );

  if (!attempt) {
    if (order?.payment_status === "UNKNOWN")
      return (
        <Alert
          level="warning"
          title="Chưa rõ kết quả thanh toán"
          data-testid="payment-unknown"
        >
          <p>
            Chưa xác nhận được kết quả thanh toán. Đừng thanh toán lại; giao
            dịch đang được đối soát.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setReadOnly(true);
              setRound((r) => r + 1);
            }}
          >
            Đọc lại đơn và kết quả thanh toán
          </Button>
        </Alert>
      );
    if (order?.payment_status === "SUCCEEDED")
      return (
        <Alert level="success" data-testid="payment-succeeded">
          Đã nhận thanh toán.
        </Alert>
      );
    if (
      order?.payment_status === "REFUNDED" ||
      order?.refund_status === "SUCCEEDED"
    )
      return (
        <Alert level="success" data-testid="payment-refunded">
          Đã hoàn tiền.
        </Alert>
      );
    if (order && readOnly && canStartOrderPayment(order))
      return (
        <div>
          <p>
            Đơn hiện cho phép thanh toán. Nếu đã chuyển tiền nhưng chưa được ghi
            nhận, liên hệ hỗ trợ trước khi trả thêm.
          </p>
          <Button
            onClick={() => {
              setReadOnly(false);
              setRound((r) => r + 1);
            }}
          >
            Tạo mã thanh toán
          </Button>
        </div>
      );
    return (
      <p data-testid="payment-not-awaiting">
        Đơn hàng không ở trạng thái chờ thanh toán
        {order ? ` (${order.status})` : ""}.
        {order?.refund_status &&
          " Yêu cầu hoàn tiền đang được đối soát; chưa xác nhận hoàn tiền."}
      </p>
    );
  }

  const remaining = attempt.expires_at
    ? Date.parse(attempt.expires_at) - now
    : null;

  switch (phase) {
    case "succeeded":
      return (
        <Alert level="success" data-testid="payment-succeeded">
          Đã nhận thanh toán.
        </Alert>
      );
    case "refunded":
      return (
        <Alert level="success" data-testid="payment-refunded">
          Đã hoàn tiền.
        </Alert>
      );
    case "failed":
      return (
        <Alert
          level="error"
          title="Thanh toán thất bại"
          data-testid="payment-failed"
        >
          <p>Thanh toán không thành công.</p>
          <Button variant="secondary" onClick={() => setRound((r) => r + 1)}>
            Tạo mã mới
          </Button>
        </Alert>
      );
    case "unknown":
      return (
        <Alert
          level="warning"
          title="Chưa rõ kết quả thanh toán"
          data-testid="payment-unknown"
        >
          <p>
            Chưa xác nhận được kết quả thanh toán. Đừng thanh toán lại; giao
            dịch đang được đối soát.
          </p>
          <Button variant="secondary" onClick={refresh}>
            Đối soát lại trạng thái
          </Button>
        </Alert>
      );
    case "expired":
      return (
        <Alert
          level="warning"
          title="Mã QR không còn hiệu lực"
          data-testid="payment-expired"
        >
          <p>Mã thanh toán đã hết hạn.</p>
          <p>Không thanh toán bằng mã đã hết hạn. Hãy kiểm tra lại đơn hàng.</p>
          <Button variant="secondary" onClick={refresh}>
            Đọc lại trạng thái thanh toán
          </Button>
        </Alert>
      );
    case "error":
      return (
        <Alert
          level="error"
          title="Chưa đọc được trạng thái thanh toán"
          data-testid="payment-poll-error"
        >
          <p>{describePaymentError(lastError)}</p>
          <Button variant="secondary" onClick={refresh}>
            Thử đọc lại trạng thái
          </Button>
        </Alert>
      );
    default:
      return (
        <div data-testid="payment-waiting">
          {attempt.provider === "INTEGRATION" && (
            <p role="status">
              Môi trường mô phỏng kiểm thử. Không chuyển tiền thật; kết quả được
              cấp bởi adapter kiểm thử riêng.
            </p>
          )}
          {attempt.qr_url && (
            <img
              src={attempt.qr_url}
              alt="Mã QR thanh toán"
              width={320}
              height={320}
              className="w-full max-w-[320px] h-auto"
            />
          )}
          {attempt.payment_code && (
            <div>
              <p>
                {attempt.provider === "INTEGRATION"
                  ? "Mã mô phỏng:"
                  : "Nội dung chuyển khoản:"}{" "}
                <b>{attempt.payment_code}</b>
              </p>
              <CopyButton value={attempt.payment_code} />
            </div>
          )}
          {order && (
            <p>
              Số tiền: <b>{formatVnd(order.amounts.payable_vnd)}</b>
            </p>
          )}
          {remaining !== null && (
            <p
              className={
                remaining < 120000 ? "text-red-700 font-semibold" : undefined
              }
            >
              Mã QR hết hạn sau:{" "}
              <span data-testid="payment-countdown">
                {formatClock(remaining)}
              </span>
            </p>
          )}
          <LoadingState label="Đang chờ xác nhận thanh toán..." />
        </div>
      );
  }
}
