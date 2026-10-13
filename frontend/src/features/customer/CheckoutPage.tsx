import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { callOperation } from '../../api/operations';
import type { OperationInputs, OperationOutputs } from '../../api/operations.generated';
import { ApiError } from '../../api/client';
import { ErrorView, Loading } from '../../bootstrap/components';
import { loadCart } from './cart-data';
type Request = OperationInputs['quoteCheckout']['body'];
type Quote = OperationOutputs['quoteCheckout'];
export function CheckoutPage() {
  const location = useLocation();
  const ids: string[] = Array.isArray(location.state?.selectedCartItemIds) ? location.state.selectedCartItemIds : [];
  const selection = JSON.stringify(ids);
  const [addresses, setAddresses] = useState<OperationOutputs['listAddresses']['items']>([]);
  const [methods, setMethods] = useState<Request['payment_methods']>({});
  const [address, setAddress] = useState('');
  const [quote, setQuote] = useState<{ value: Quote; request: Request; signature: string; key: string }>();
  const [result, setResult] = useState<OperationOutputs['confirmCheckout']>();
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [retry, setRetry] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const inFlight = useRef(false);
  const signature = JSON.stringify([selection, address, methods]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(undefined); setQuote(undefined); setResult(undefined); setAddress('');
    Promise.all([callOperation('listAddresses', { query: { page: 1, size: 100 } }), loadCart()]).then(([data, cart]) => {
      if (!active) return;
      const selected = JSON.parse(selection) as string[];
      const items = cart.filter(item => item.id && selected.includes(item.id));
      if (!selected.length || selected.length > 100 || items.length !== new Set(selected).size || items.some(item => !item.store_id))
        throw new ApiError(409, 'CART_CHANGED', 'Giỏ hàng đã thay đổi. Vui lòng chọn lại sản phẩm.');
      setMethods(Object.fromEntries(items.map(item => [item.store_id!, 'COD' as const])));
      setAddresses(data.items);
      setAddress((data.items.find(item => item.is_default && item.id) ?? data.items.find(item => item.id))?.id ?? '');
    }).catch(value => { if (active) setError(value); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selection, retry]);
  useEffect(() => {
    let active = true;
    setQuote(undefined);
    if (!address || !Object.keys(methods).length || loading) { setQuoting(false); return; }
    setQuoting(true); setError(undefined);
    const request: Request = { cart_item_ids: JSON.parse(selection), address_id: address, payment_methods: methods };
    callOperation('quoteCheckout', { body: request }).then(value => {
      if (active) setQuote({ value, request, signature, key: crypto.randomUUID() });
    }).catch(value => { if (active) setError(value); }).finally(() => { if (active) setQuoting(false); });
    return () => { active = false; };
  }, [signature, loading]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const expired = !quote || Date.parse(quote.value.expires_at) <= clock;
  const confirm = async () => {
    if (!quote || quote.signature !== signature || quoting || inFlight.current || result) return;
    if (Date.parse(quote.value.expires_at) <= Date.now()) { setError(new ApiError(409, 'QUOTE_EXPIRED', 'Quote đã hết hạn. Vui lòng tải lại.')); return; }
    inFlight.current = true; setBusy(true); setError(undefined);
    try {
      const value = await callOperation('confirmCheckout', { headers: { 'idempotency-key': quote.key },
        body: { ...quote.request, quote_id: quote.value.quote_id, expected_payable_total_vnd: quote.value.payable_total_vnd } });
      setResult(value);
    } catch (value) {
      setError(value);
      // An uncertain transport failure keeps the same request and key for a manual retry.
      if (value instanceof ApiError && value.status === 409) setQuote(undefined);
    } finally { inFlight.current = false; setBusy(false); }
  };
  if (!ids.length) return <section className="boot-card"><p>Chọn sản phẩm từ giỏ hàng để thanh toán.</p><Link to="/cart">Giỏ hàng</Link></section>;
  if (loading) return <Loading />;
  if (result) return <section className="boot-card"><h1>Đã tạo nhóm đơn hàng</h1><p>Mã nhóm: {result.purchase_group_id}</p>
    {result.orders.map(order => <p key={order.id}>{order.id}: {order.status} · {order.payment_status ?? 'Chưa xác nhận thanh toán'}</p>)}</section>;
  return <section className="boot-card"><h1>Thanh toán đơn hàng</h1>
    {error != null && <ErrorView error={error} />}
    <button disabled={busy || quoting} onClick={() => setRetry(value => value + 1)}>Tải lại báo giá</button>
    <h2>Địa chỉ nhận hàng</h2>
    {!addresses.length && error == null && <p>Bạn chưa có địa chỉ giao hàng.</p>}
    {addresses.filter(item => item.id).map(item => <label key={item.id}><input type="radio" name="address" disabled={busy}
      checked={address === item.id} onChange={() => setAddress(item.id!)} />{item.recipient_name} ({item.phone}) · {item.line1}, {item.ward}, {item.district}, {item.city}</label>)}
    {quoting && <Loading />}
    {quote && quote.signature === signature && <p>Tổng thanh toán: {quote.value.payable_total_vnd.toLocaleString('vi-VN')} ₫</p>}
    {quote && expired && <p>Quote đã hết hạn. Vui lòng tải lại báo giá.</p>}
    <button disabled={!quote || quote.signature !== signature || expired || quoting || busy} onClick={confirm}>{busy ? 'Đang xử lý…' : 'Xác nhận đặt hàng'}</button>
    <Link to="/cart">Quay lại giỏ hàng</Link>
  </section>;
}
