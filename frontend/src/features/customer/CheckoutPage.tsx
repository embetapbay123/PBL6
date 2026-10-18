import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, request } from '../../api/client';

interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
}

interface CartList {
  items: CartItem[];
}

interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  city: string;
  is_default?: boolean;
}

interface Quote {
  quote_id: string;
  payable_total_vnd: number;
  expires_at: string;
}

const SELECTION_KEY = 'pbl6_checkout_selection';
const idempotencyStorageKey = (quoteId: string) => `pbl6_checkout_idem_${quoteId}`;

const describe = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId ? `${error.message} (${error.correlationId})` : error.message;
  }
  return 'Đã xảy ra lỗi không xác định.';
};

const shortId = (id: string) => id.slice(0, 8);
const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;

const newUuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

// One key per quote: retrying the same confirmation (even after a reload) reuses it,
// so the backend can deduplicate. A new quote gets a new key.
const idempotencyKeyFor = (quoteId: string): string => {
  try {
    const saved = sessionStorage.getItem(idempotencyStorageKey(quoteId));
    if (saved) return saved;
    const key = newUuid();
    sessionStorage.setItem(idempotencyStorageKey(quoteId), key);
    return key;
  } catch {
    return newUuid();
  }
};

const readSelection = (state: unknown): string[] => {
  const fromState = (state as { cartItemIds?: unknown } | null)?.cartItemIds;
  if (Array.isArray(fromState) && fromState.length > 0) {
    return fromState.filter((value): value is string => typeof value === 'string');
  }
  try {
    const raw = sessionStorage.getItem(SELECTION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

export const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const [selectedIds] = useState<string[]>(() => readSelection(location.state));

  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>('');
  const [quote, setQuote] = useState<Quote | null>(null);

  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [quoteTick, setQuoteTick] = useState(0);

  // Every Store in the selection is paid by COD, keyed by Store id.
  const paymentMethods = useMemo(
    () =>
      items.reduce<Record<string, 'COD'>>((acc, item) => {
        acc[item.store_id] = 'COD';
        return acc;
      }, {}),
    [items],
  );

  const storeGroups = useMemo(() => {
    const groups = new Map<string, CartItem[]>();
    items.forEach((item) => groups.set(item.store_id, [...(groups.get(item.store_id) ?? []), item]));
    return Array.from(groups.entries());
  }, [items]);

  // 1) Load the selected cart items and the address book.
  useEffect(() => {
    if (selectedIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setQuote(null);
      setQuoteError(null);
      try {
        const [cart, book] = await Promise.all([
          request<CartList>('/cart/items?page=1&size=100'),
          request<{ items: Address[] }>('/me/addresses?page=1&size=100'),
        ]);
        if (cancelled) return;
        const chosen = cart.items.filter((item) => selectedIds.includes(item.id));
        if (chosen.length === 0) {
          setLoadError('Các sản phẩm đã chọn không còn trong giỏ hàng.');
          return;
        }
        if (book.items.length === 0) {
          setLoadError('Bạn chưa có địa chỉ nhận hàng. Hãy thêm địa chỉ trước khi thanh toán.');
          return;
        }
        setItems(chosen);
        setAddresses(book.items);
        setAddressId((prev) =>
          prev && book.items.some((a) => a.id === prev)
            ? prev
            : (book.items.find((a) => a.is_default) ?? book.items[0]).id,
        );
      } catch (error) {
        if (!cancelled) setLoadError(describe(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIds, reloadTick]);

  // 2) Ask the backend for a quote whenever the items or address change.
  useEffect(() => {
    if (items.length === 0 || !addressId) return;
    let cancelled = false;
    setQuote(null);
    setQuoteError(null);
    setQuoting(true);
    request<Quote>('/checkout/quotes', {
      method: 'POST',
      body: JSON.stringify({
        cart_item_ids: items.map((item) => item.id),
        address_id: addressId,
        payment_methods: paymentMethods,
      }),
    })
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch((error) => {
        if (!cancelled) setQuoteError(describe(error));
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [items, addressId, paymentMethods, quoteTick]);

  const confirmOrder = async () => {
    if (!quote || !addressId || submitting) return;
    setSubmitting(true);
    setConfirmError(null);
    const key = idempotencyKeyFor(quote.quote_id);
    try {
      await request('/orders/batches', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: JSON.stringify({
          cart_item_ids: items.map((item) => item.id),
          address_id: addressId,
          payment_methods: paymentMethods,
          quote_id: quote.quote_id,
          expected_payable_total_vnd: quote.payable_total_vnd,
        }),
      });
      try {
        sessionStorage.removeItem(idempotencyStorageKey(quote.quote_id));
        sessionStorage.removeItem(SELECTION_KEY);
      } catch {
        /* ignore */
      }
      setCreated(true);
    } catch (error) {
      // Keep the same key and payload so the next click is a true retry.
      setConfirmError(describe(error));
    } finally {
      setSubmitting(false);
    }
  };

  const error = confirmError ?? loadError ?? quoteError;

  if (created) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">Đã tạo nhóm đơn hàng</h1>
        <p className="text-gray-600">Đơn hàng của bạn đã được ghi nhận.</p>
        <Link to="/customer/orders" className="text-indigo-600 hover:underline">
          Xem đơn hàng
        </Link>
      </div>
    );
  }

  if (selectedIds.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">Thanh toán đơn hàng (Checkout)</h1>
        <p className="text-gray-600">Chưa có sản phẩm nào được chọn để thanh toán.</p>
        <Link to="/cart" className="text-indigo-600 hover:underline">
          &larr; Quay lại giỏ hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/cart" className="text-indigo-600 hover:underline mb-4 inline-block text-sm">
        &larr; Quay lại giỏ hàng
      </Link>
      <h1 className="text-2xl font-bold mb-6">Thanh toán đơn hàng (Checkout)</h1>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {loading && <p className="text-gray-500">Đang tải thông tin thanh toán...</p>}

      {!loading && loadError && (
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => setReloadTick((n) => n + 1)} className="text-indigo-600 hover:underline">
            Thử lại
          </button>
          <Link to="/customer/addresses" className="text-indigo-600 hover:underline">
            Quản lý địa chỉ
          </Link>
        </div>
      )}

      {!loading && !loadError && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-3">1. Địa chỉ nhận hàng</h2>
              <select
                aria-label="Địa chỉ nhận hàng"
                value={addressId}
                onChange={(event) => {
                  setConfirmError(null);
                  setAddressId(event.target.value);
                }}
                className="w-full border rounded p-2 text-sm"
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {`${a.recipient_name} (${a.phone}) — ${a.line1}, ${a.ward}, ${a.district}, ${a.city}`}
                  </option>
                ))}
              </select>
              <Link to="/customer/addresses" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                Quản lý địa chỉ
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow space-y-4">
              <h2 className="text-lg font-bold mb-1">2. Sản phẩm từ các cửa hàng</h2>
              {storeGroups.map(([storeId, storeItems]) => (
                <div key={storeId} className="border-t pt-3">
                  <h3 className="font-semibold text-indigo-700 text-sm mb-2">Cửa hàng {shortId(storeId)}</h3>
                  {storeItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <span>Sản phẩm {shortId(item.product_id)}</span>
                      <span className="text-gray-500">Số lượng: {item.quantity}</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">Thanh toán: COD</p>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-3">3. Phương thức thanh toán</h2>
              <p className="text-sm font-medium">Thanh toán khi nhận hàng (COD)</p>
              <p className="text-xs text-gray-500">Áp dụng cho từng cửa hàng trong đơn.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow h-fit space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Tóm tắt thanh toán</h2>

            {quoting && <p className="text-sm text-gray-500">Đang tính báo giá...</p>}

            {quote && (
              <div className="text-sm space-y-2">
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Tổng thanh toán</span>
                  <span className="text-indigo-600">{formatVnd(quote.payable_total_vnd)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Báo giá hết hạn lúc {new Date(quote.expires_at).toLocaleTimeString('vi-VN')}
                </p>
              </div>
            )}

            {quoteError && !quoting && (
              <button
                type="button"
                onClick={() => setQuoteTick((n) => n + 1)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Tính lại báo giá
              </button>
            )}

            <button
              type="button"
              onClick={() => void confirmOrder()}
              disabled={!quote || quoting || submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-bold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {submitting ? 'Đang xử lý đơn hàng...' : 'Xác nhận đặt hàng'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
