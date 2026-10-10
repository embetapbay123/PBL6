import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';
import { ApiError } from '../../api/client';
import { useAuth } from '../../api/auth-context';
import { ErrorView, Loading } from '../../bootstrap/components';
type Product = OperationOutputs['getProduct'];
export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [product, setProduct] = useState<Product>();
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [retry, setRetry] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setProduct(undefined); setVariantId(''); setQuantity(1); setError(undefined); setSuccess(false);
    if (!id) { setLoading(false); return; }
    callOperation('getProduct', { path: { id } }).then(value => {
      if (!active) return;
      setProduct(value);
      const variants = value.variants?.filter(item => item.id && item.status === 'ACTIVE') ?? [];
      setVariantId((variants.find(item => item.is_default) ?? variants[0])?.id ?? '');
    }).catch(value => { if (active) setError(value); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);
  const variant = product?.variants?.find(item => item.id === variantId);
  const available = product?.id === id && product?.status === 'ACTIVE' && !!variant?.id && variant.status === 'ACTIVE';
  const add = async () => {
    if (!available || !session || inFlight.current || !product?.id || !variant?.id) return;
    inFlight.current = true; setBusy(true); setError(undefined); setSuccess(false);
    try { await callOperation('addCartItem', { body: { product_id: product.id, variant_id: variant.id, quantity } }); setSuccess(true); }
    catch (value) { setError(value); }
    finally { inFlight.current = false; setBusy(false); }
  };
  if (loading || (product && product.id !== id)) return <Loading />;
  if (!product) return <section className="boot-card">{error instanceof ApiError && error.status === 404 && <h1>404 - Không tìm thấy sản phẩm</h1>}
    {error != null && <ErrorView error={error} onRetry={() => setRetry(value => value + 1)} />}<Link to="/">Quay lại danh sách sản phẩm</Link></section>;
  return <section className="boot-card"><h1>{product.title}</h1><p>{product.description ?? 'Không có mô tả sản phẩm.'}</p>
    {product.images?.map(image => <img key={image.id ?? image.image_url} src={image.image_url} alt={product.title} style={{maxWidth:'100%'}} />)}
    {variant && <p>{variant.price_vnd.toLocaleString('vi-VN')} ₫</p>}
    {!available && <p>Sản phẩm hoặc phân loại này hiện không được bán.</p>}
    {product.variants?.map(item => <button key={item.id ?? item.sku} disabled={!item.id || item.status !== 'ACTIVE' || busy}
      aria-pressed={variantId === item.id} onClick={() => setVariantId(item.id!)}>SKU: {item.sku}</button>)}
    <label>Số lượng<input type="number" min={1} max={2147483647} value={quantity} disabled={!available || busy}
      onChange={event => setQuantity(Math.min(2147483647, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))} /></label>
    {session ? <button disabled={!available || busy} onClick={add}>{busy ? 'Đang xử lý…' : 'Thêm vào giỏ hàng'}</button> : <Link to="/login">Đăng nhập để thêm vào giỏ hàng</Link>}
    {success && <p role="status">Đã thêm sản phẩm vào giỏ hàng.</p>}
    {error != null && <ErrorView error={error} />}
    <Link to="/cart">Giỏ hàng</Link><Link to="/">Quay lại danh sách sản phẩm</Link>
  </section>;
}
