import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';
import { ErrorView, Loading } from '../../bootstrap/components';
import { loadCart } from './cart-data';
export function CartPage() {
  const [items, setItems] = useState<OperationOutputs['listCartItems']['items']>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [retry, setRetry] = useState(0);
  const locked = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    setLoading(true); setError(undefined);
    loadCart().then(value => { if (active) { setItems(value); setSelected(previous => previous.filter(id => value.some(item => item.id === id))); } })
      .catch(value => { if (active) setError(value); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const mutate = async (id: string, quantity?: number) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(undefined);
    try {
      if (quantity === undefined) await callOperation('removeCartItem', { path: { id } });
      else await callOperation('updateCartItem', { path: { id }, body: { quantity } });
      setRetry(value => value + 1);
    } catch (value) { setError(value); }
    finally { locked.current = false; setBusy(false); }
  };
  if (loading) return <Loading />;
  return <section className="boot-card"><h1>Giỏ hàng của bạn</h1>
    {error != null && <ErrorView error={error} onRetry={() => setRetry(value => value + 1)} />}
    {!items.length && error == null && <p>Giỏ hàng của bạn đang trống.</p>}
    {items.map(item => <div key={item.id ?? item.variant_id}>
      <label><input type="checkbox" disabled={!item.id || busy} checked={!!item.id && selected.includes(item.id)}
        onChange={() => setSelected(previous => previous.includes(item.id!) ? previous.filter(id => id !== item.id) : [...previous, item.id!])} />
        Store {item.store_id} · Sản phẩm {item.product_id} · Variant {item.variant_id}</label>
      <p>Giá cuối cùng sẽ lấy từ báo giá checkout.</p>
      <button aria-label="Giảm số lượng" disabled={!item.id || busy || item.quantity <= 1} onClick={() => mutate(item.id!, item.quantity - 1)}>−</button>
      <span>{item.quantity}</span>
      <button aria-label="Tăng số lượng" disabled={!item.id || busy || item.quantity >= 2147483647} onClick={() => mutate(item.id!, item.quantity + 1)}>+</button>
      <button disabled={!item.id || busy} onClick={() => mutate(item.id!)}>Xóa</button>
    </div>)}
    <button disabled={!selected.length || selected.length > 100 || busy || error != null} onClick={() => navigate('/checkout', { state: { selectedCartItemIds: selected } })}>Tiến hành thanh toán</button>
    <Link to="/">Khám phá sản phẩm</Link>
  </section>;
}
