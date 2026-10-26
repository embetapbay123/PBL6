import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const PAGE_SIZE = 100;
const MAX_PAGES = 200;

const getSelectionKey = (userId?: string) => (userId ? `pbl6_checkout_selection_${userId}` : null);

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

const describe = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId ? `${error.message} (${error.correlationId})` : error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Đã xảy ra lỗi không xác định.';
};

const shortId = (id: string) => id.slice(0, 8);

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.context?.user_id;

  const [items, setItems] = useState<CartItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      const all = await fetchAllCartItems();
      setItems(all);
      setSelected(new Set(all.map((item) => item.id)));
    } catch (error) {
      setItems(null);
      setLoadError(describe(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeQuantity = async (item: CartItem, delta: number) => {
    const quantity = item.quantity + delta;
    if (quantity < 1 || busyId) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      await request(`/cart/items/${item.id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
      setItems((prev) => prev && prev.map((i) => (i.id === item.id ? { ...i, quantity } : i)));
    } catch (error) {
      setActionError(describe(error));
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (busyId) return;
    setBusyId(item.id);
    setActionError(null);
    try {
      await request(`/cart/items/${item.id}`, { method: 'DELETE' });
      setItems((prev) => prev && prev.filter((i) => i.id !== item.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } catch (error) {
      setActionError(describe(error));
    } finally {
      setBusyId(null);
    }
  };

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = !!items && items.length > 0 && items.every((item) => selected.has(item.id));

  const toggleAll = () => {
    if (!items) return;
    setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  };

  const goCheckout = () => {
    const cartItemIds = Array.from(selected);
    if (cartItemIds.length === 0) return;
    const key = getSelectionKey(userId);
    if (key) {
      try {
        sessionStorage.setItem(key, JSON.stringify(cartItemIds));
      } catch {
        /* storage can be unavailable */
      }
    }
    navigate('/checkout', { state: { cartItemIds } });
  };

  const selectedQuantity = (items ?? [])
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng của bạn (Cart)</h1>

      {loading && <p className="text-gray-500">Đang tải giỏ hàng...</p>}

      {!loading && loadError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg space-y-3">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {!loading && !loadError && items && items.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow text-center space-y-4">
          <p className="text-gray-500 text-lg">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/"
            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-md font-medium hover:bg-indigo-700 transition"
          >
            Quay lại mua sắm
          </Link>
        </div>
      )}

      {!loading && !loadError && items && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {actionError && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                {actionError}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Chọn tất cả
            </label>

            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Chọn sản phẩm ${shortId(item.product_id)}`}
                    checked={selected.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-800">Sản phẩm {shortId(item.product_id)}</h3>
                    <p className="text-xs text-gray-500">
                      Biến thể {shortId(item.variant_id)} · Cửa hàng {shortId(item.store_id)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 border rounded p-1">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      onClick={() => void changeQuantity(item, -1)}
                      disabled={busyId !== null || item.quantity <= 1}
                      className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      onClick={() => void changeQuantity(item, 1)}
                      disabled={busyId !== null}
                      className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeItem(item)}
                    disabled={busyId !== null}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-lg shadow h-fit space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Tóm tắt đơn hàng</h2>
            <div className="text-sm space-y-1 text-gray-600">
              <p>Sản phẩm đã chọn: {selected.size}</p>
              <p>Tổng số lượng: {selectedQuantity}</p>
              <p className="text-xs text-gray-400">Giá cuối cùng được tính ở bước thanh toán.</p>
            </div>
            <button
              type="button"
              onClick={goCheckout}
              disabled={selected.size === 0}
              className="block w-full bg-indigo-600 text-white text-center py-2.5 rounded-md font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              Tiến hành thanh toán
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;