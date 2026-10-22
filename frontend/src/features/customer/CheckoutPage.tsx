import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, request } from '../../api/client';
import { useAuth } from '../../api/auth-context';

interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
}

interface CartList {
  items: CartItem[];
  page: number;
  size: number;
  total: number;
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

interface ConfirmPayload {
  cart_item_ids: string[];
  address_id: string;
  payment_methods: Record<string, 'COD'>;
  quote_id: string;
  expected_payable_total_vnd: number;
}

interface Attempt {
  quote: Quote;
  payload: ConfirmPayload;
  key: string;
  items: CartItem[];
  addressLabel: string;
  userId?: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 200;

const getAttemptKey = (userId?: string) => (userId ? `pbl6_checkout_attempt_${userId}` : null);
const getSelectionKey = (userId?: string) => (userId ? `pbl6_checkout_selection_${userId}` : null);

const describe = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId ? `${error.message} (${error.correlationId})` : error.message;
  }
  return 'Đã xảy ra lỗi không xác định.';
};

const shortId = (id: string) => id.slice(0, 8);
const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const formatAddress = (a: Address) =>
  `${a.recipient_name} (${a.phone}) — ${a.line1}, ${a.ward}, ${a.district}, ${a.city}`;

const newUuid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

const readAttempt = (userId?: string): Attempt | null => {
  if (!userId) return null;
  try {
    const key = getAttemptKey(userId);
    if (!key) return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<Attempt> | null;
    if (
      a &&
      a.quote &&
      a.payload &&
      Array.isArray(a.payload.cart_item_ids) &&
      typeof a.key === 'string' &&
      Array.isArray(a.items) &&
      typeof a.addressLabel === 'string' &&
      (!a.userId || a.userId === userId)
    ) {
      return a as Attempt;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const persistAttempt = (userId: string | undefined, attempt: Attempt) => {
  if (!userId) return;
  try {
    const key = getAttemptKey(userId);
    if (key) {
      sessionStorage.setItem(key, JSON.stringify({ ...attempt, userId }));
    }
  } catch {
    /* ignore */
  }
};

const clearAttempt = (userId?: string) => {
  if (!userId) return;
  try {
    const key = getAttemptKey(userId);
    if (key) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const isQuoteConflict = (error: unknown): error is ApiError =>
  error instanceof ApiError &&
  error.status === 409 &&
  (error.code === 'QUOTE_CHANGED' || error.code === 'QUOTE_EXPIRED');

const isUncertain = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 0) return true;
  return error.status >= 500 || error.status === 408 || error.status === 409;
};

async function fetchAllCartItems(): Promise<CartItem[]> {
  const byId = new Map<string, CartItem>();
  let total = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await request<CartList>(`/cart/items?page=${page}&size=${PAGE_SIZE}`);
    total = data.total;
    for (const item of data.items) byId.set(item.id, item);
    if (byId.size >= total || data.items.length === 0) break;
  }
  if (byId.size < total) {
    throw new Error(`Không thể tải đầy đủ giỏ hàng (${byId.size}/${total} mục). Vui lòng thử lại.`);
  }
  return Array.from(byId.values());
}

const readSelection = (userId?: string, state?: unknown): string[] => {
  const fromState = (state as { cartItemIds?: unknown } | null)?.cartItemIds;
  if (Array.isArray(fromState) && fromState.length > 0) {
    return fromState.filter((value): value is string => typeof value === 'string');
  }
  if (!userId) return [];
  try {
    const key = getSelectionKey(userId);
    if (!key) return [];
    const raw = sessionStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

export const CheckoutPage: React.FC = () => {
  const { session } = useAuth();
  const userId = session?.context?.user_id;

  return <CheckoutInner key={userId} userId={userId} />;
};

interface InnerProps {
  userId?: string;
}

const CheckoutInner: React.FC<InnerProps> = ({ userId }) => {
  const location = useLocation();

  const [attempt, setAttempt] = useState<Attempt | null>(() => readAttempt(userId));
  const hasAttempt = attempt !== null;
  const [selectedIds] = useState<string[]>(() =>
    attempt ? attempt.payload.cart_item_ids : readSelection(userId, location.state),
  );

  const [items, setItems] = useState<CartItem[]>(() => attempt?.items ?? []);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>(() => attempt?.payload.address_id ?? '');
  const [quote, setQuote] = useState<Quote | null>(null);

  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [staleTotal, setStaleTotal] = useState<number | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [quoteTick, setQuoteTick] = useState(0);

  const inFlight = useRef(false);

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

  useEffect(() => {
    if (!userId || hasAttempt || selectedIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setQuote(null);
      setQuoteError(null);
      try {
        const [cart, book] = await Promise.all([
          fetchAllCartItems(),
          request<{ items: Address[] }>('/me/addresses?page=1&size=100'),
        ]);
        if (cancelled) return;
        const wanted = new Set(selectedIds);
        const chosen = cart.filter((item) => wanted.has(item.id));
        if (chosen.length !== wanted.size) {
          setLoadError(
            `${wanted.size - chosen.length} sản phẩm đã chọn không còn trong giỏ hàng. Vui lòng quay lại giỏ hàng và chọn lại.`,
          );
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
        if (!cancelled) setLoadError(error instanceof Error && !(error instanceof ApiError) ? error.message : describe(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, hasAttempt, selectedIds, reloadTick]);

  useEffect(() => {
    if (hasAttempt || items.length === 0 || !addressId) return;
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
  }, [hasAttempt, items, addressId, paymentMethods, quoteTick]);

  const dropAttempt = () => {
    clearAttempt(userId);
    setAttempt(null);
    setItems([]);
    setQuote(null);
  };

  const confirmOrder = async () => {
    if (inFlight.current || !userId) return;

    let current = attempt;
    if (!current) {
      if (!quote || !addressId) return;
      if (Date.parse(quote.expires_at) <= Date.now()) {
        setStaleTotal(quote.payable_total_vnd);
        setConflictNotice('Báo giá đã hết hạn. Đang tính lại, vui lòng kiểm tra tổng mới rồi xác nhận lại.');
        setQuote(null);
        setQuoteTick((n) => n + 1);
        return;
      }
      const address = addresses.find((a) => a.id === addressId);
      current = {
        quote,
        key: newUuid(),
        items,
        addressLabel: address ? formatAddress(address) : addressId,
        userId,
        payload: {
          cart_item_ids: items.map((item) => item.id),
          address_id: addressId,
          payment_methods: paymentMethods,
          quote_id: quote.quote_id,
          expected_payable_total_vnd: quote.payable_total_vnd,
        },
      };
      persistAttempt(userId, current);
      setAttempt(current);
    }

    inFlight.current = true;
    setSubmitting(true);
    setConfirmError(null);
    setConflictNotice(null);
    setStaleTotal(null);
    try {
      await request('/orders/batches', {
        method: 'POST',
        headers: { 'Idempotency-Key': current.key },
        body: JSON.stringify(current.payload),
      });
      clearAttempt(userId);
      const selKey = getSelectionKey(userId);
      if (selKey) {
        try {
          sessionStorage.removeItem(selKey);
        } catch {
          /* ignore */
        }
      }
      setCreated(true);
    } catch (error) {
      if (isQuoteConflict(error)) {
        setStaleTotal(current.quote.payable_total_vnd);
        setConflictNotice(
          error.code === 'QUOTE_EXPIRED'
            ? 'Báo giá đã hết hạn. Đã tính lại, vui lòng kiểm tra tổng mới rồi xác nhận lại.'
            : 'Giá hoặc tồn kho đã thay đổi. Đã tính lại, vui lòng kiểm tra tổng mới rồi xác nhận lại.',
        );
        dropAttempt();
      } else if (isUncertain(error)) {
        setConfirmError(
          `${describe(error)} Chưa xác định được đơn hàng đã được tạo hay chưa. ` +
            'Nhấn "Xác nhận đặt hàng" để thử lại: hệ thống dùng cùng mã idempotency nên sẽ không tạo đơn trùng.',
        );
      } else {
        setConfirmError(describe(error));
        dropAttempt();
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const shownQuote = attempt ? attempt.quote : quote;
  const error = confirmError ?? loadError ?? quoteError;

  if (created) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <h1 className="text-2xl font-bold">Đã tạo nhóm đơn hàng</h1>
        <p className="text-gray-600">Đơn hàng của bạn đã được ghi nhận.</p>
        <Link to="/" className="text-indigo-600 hover:underline">
          Tiếp tục mua sắm
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

      {hasAttempt && !confirmError && (
        <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">
          Có một lần xác nhận đặt hàng trước đó chưa rõ kết quả. Nhấn &quot;Xác nhận đặt hàng&quot; để kiểm tra
        </div>
      )}

      {conflictNotice && !hasAttempt && (
        <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded mb-4 text-sm">
          {conflictNotice}
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
              {attempt ? (
                <p className="text-sm text-gray-700">{attempt.addressLabel}</p>
              ) : (
                <>
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
                        {formatAddress(a)}
                      </option>
                    ))}
                  </select>
                  <Link to="/customer/addresses" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                    Quản lý địa chỉ
                  </Link>
                </>
              )}
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

            {shownQuote && (
              <div className="text-sm space-y-2">
                {staleTotal !== null && staleTotal !== shownQuote.payable_total_vnd && (
                  <p className="text-xs text-amber-700">
                    Tổng cũ {formatVnd(staleTotal)} &rarr; tổng mới {formatVnd(shownQuote.payable_total_vnd)}
                  </p>
                )}
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Tổng thanh toán</span>
                  <span className="text-indigo-600">{formatVnd(shownQuote.payable_total_vnd)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Báo giá hết hạn lúc {new Date(shownQuote.expires_at).toLocaleTimeString('vi-VN')}
                </p>
              </div>
            )}

            {!hasAttempt && !quoting && (quoteError || conflictNotice) && (
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
              disabled={submitting || (!hasAttempt && (!quote || quoting))}
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