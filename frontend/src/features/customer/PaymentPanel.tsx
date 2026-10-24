import React, { useEffect, useState } from 'react';
import { callOperation } from '../../api/operations';
import { ApiError } from '../../api/client';
import type { OperationOutputs } from '../../api/operations.generated';
import { usePaymentStatus } from './usePaymentStatus';

type Attempt = OperationOutputs['createPaymentAttempt'];
type Order = OperationOutputs['getOwnOrder'];

export function describePaymentError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 503) return 'Cổng thanh toán hiện chưa được bật. Vui lòng thử lại sau.';
    if (e.status === 409) return 'Giao dịch cần được đối soát. Đừng thanh toán lại, hãy liên hệ hỗ trợ.';
    if (e.status === 422) return 'Yêu cầu thanh toán không hợp lệ.';
    if (e.status === 401 || e.status === 403) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  return 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.';
}

const formatVnd = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const formatClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function PaymentPanel({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [setupError, setSetupError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // Đọc Order mới nhất rồi tạo attempt (server dùng lại attempt/QR cũ nếu gọi ซ้ำ)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSetupError(null);
    setAttempt(null);
    (async () => {
      try {
        const o = await callOperation('getOwnOrder', { path: { id: orderId } });
        if (cancelled) return;
        setOrder(o);
        if (o.status !== 'AWAITING_PAYMENT' || o.payment_method !== 'SANDBOX') return;
        const a = await callOperation('createPaymentAttempt', {
          path: { id: orderId },
          body: { expected_order_version: o.version },
        });
        if (!cancelled) setAttempt(a);
      } catch (e) {
        if (!cancelled) setSetupError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, round]);

  // TODO: xác nhận với Công ว่า id của getPayment là attempt.id hay Payment id
  const { phase, rawStatus, lastError } = usePaymentStatus({
    enabled: !!attempt,
    expiresAt: attempt?.expires_at,
    fetchStatus: () => callOperation('getPayment', { path: { id: attempt!.id } }),
  });

  useEffect(() => {
    if (!attempt?.expires_at || phase !== 'waiting') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [attempt?.expires_at, phase]);

  if (loading) return <p data-testid="payment-loading">Đang tạo mã thanh toán...</p>;

  if (setupError) {
    const blocked = setupError instanceof ApiError && setupError.status === 409;
    return (
      <div role="alert" data-testid="payment-setup-error">
        <p>{describePaymentError(setupError)}</p>
        {!blocked && <button onClick={() => setRound(r => r + 1)}>Thử lại</button>}
      </div>
    );
  }

  if (!attempt) {
    return (
      <p data-testid="payment-not-awaiting">
        Đơn hàng không ở trạng thái chờ thanh toán{order ? ` (${order.status})` : ''}.
      </p>
    );
  }

  const remaining = attempt.expires_at ? Date.parse(attempt.expires_at) - now : null;

  switch (phase) {
    case 'succeeded':
      return <p data-testid="payment-succeeded">Đã nhận thanh toán.</p>;
    case 'failed':
      return (
        <div role="alert" data-testid="payment-failed">
          <p>Thanh toán không thành công.</p>
          <button onClick={() => setRound(r => r + 1)}>Tạo mã mới</button>
        </div>
      );
    case 'unknown':
      return (
        <div role="alert" data-testid="payment-unknown">
          Chưa xác nhận được kết quả thanh toán. Đừng thanh toán lại; giao dịch đang được đối soát.
        </div>
      );
    case 'expired':
      return (
        <div role="alert" data-testid="payment-expired">
          <p>Mã thanh toán đã hết hạn.</p>
          <button onClick={() => setRound(r => r + 1)}>Tạo mã mới</button>
        </div>
      );
    case 'error':
      return (
        <div role="alert" data-testid="payment-poll-error">
          <p>{describePaymentError(lastError)}</p>
          <button onClick={() => window.location.reload()}>Tải lại trang</button>
        </div>
      );
    default:
      return (
        <div data-testid="payment-waiting">
          {attempt.qr_url && <img src={attempt.qr_url} alt="Mã QR thanh toán" width={240} height={240} />}
          {attempt.payment_code && <p>Nội dung chuyển khoản: <b>{attempt.payment_code}</b></p>}
          {order && <p>Số tiền: <b>{formatVnd(order.amounts.payable_vnd)}</b></p>}
          {remaining !== null && <p>Còn lại: <span data-testid="payment-countdown">{formatClock(remaining)}</span></p>}
          <p>Đang chờ xác nhận thanh toán{rawStatus ? ` (${rawStatus})` : ''}...</p>
        </div>
      );
  }
}