import { useProductBatch } from "./useProductBatch";
import { Pagination } from "../../bootstrap/components";
import { PurchaseActionBar } from "../../components/PurchaseActionBar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, isUncertainMutation } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { useAuth } from "../../api/auth-context";
import { StoreLabel } from "../../live/StoreLabel";
import { CartProduct } from "../../live/CartProduct";
import { Button as UiButton } from "../../components/ui/Button";
import { clearBuyNow, checkoutState, variantLabel } from "./checkout-intent";
import { formatMoney } from "../../live/useLiveData";
import { ContactStoreButton } from "./ContactStoreButton";
import { VoucherPicker } from "./VoucherPicker";
import { Ticket, Truck } from "lucide-react";

interface CartItem {
  id: string;
  variant_id: string;
  product_id: string;
  store_id: string;
  quantity: number;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 200;

const getSelectionKey = (userId?: string) =>
  userId ? `pbl6_checkout_selection_${userId}` : null;

async function fetchAllCartItems(
  onProgress: (loaded: number, total: number) => void,
): Promise<CartItem[]> {
  const byId = new Map<string, CartItem>();
  let total = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await callOperation("listCartItems", {
      query: { page, size: PAGE_SIZE },
    });
    total = data.total;
    for (const item of data.items) {
      if (item.id) byId.set(item.id, item as CartItem);
    }
    onProgress(byId.size, total);
    if (byId.size >= total || data.items.length === 0) break;
  }

  if (byId.size < total) {
    throw new Error(
      `Không thể tải đầy đủ giỏ hàng (${byId.size}/${total} mục). Vui lòng thử lại.`,
    );
  }
  return Array.from(byId.values());
}

const describe = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.correlationId
      ? `${error.message} (${error.correlationId})`
      : error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Đã xảy ra lỗi không xác định.";
};

const shortId = (id: string) => id.slice(-8);

type Variant = NonNullable<OperationOutputs["getProduct"]["variants"]>[number];
function CartVariantPicker({ item, variants, disabled, onChange }: {
  item: CartItem;
  variants?: Variant[];
  disabled: boolean;
  onChange: (variantId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const alternatives = variants?.filter((variant) => variant.id
    && variant.id !== item.variant_id
    && (!variant.status || variant.status === "ACTIVE")
    && (variant.available_quantity === undefined || variant.available_quantity >= item.quantity));
  if (!alternatives?.length) return null;
  const value = alternatives.some((variant) => variant.id === choice) ? choice : "";

  if (!open) {
    return (
      <div className="cart-variant-toggle mt-1">
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0 inline-flex items-center gap-1"
          disabled={disabled}
          onClick={() => setOpen(true)}
        >
          Đổi phân loại
        </button>
      </div>
    );
  }

  return (
    <form className="flex flex-wrap items-center gap-2 mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded text-xs" onSubmit={(event) => {
      event.preventDefault();
      if (value) {
        onChange(value);
        setChoice("");
        setOpen(false);
      }
    }}>
      <div className="min-w-0 max-w-full">
        <label htmlFor={`cart-variant-${item.id}`} className="sr-only">Đổi phân loại</label>
        <select id={`cart-variant-${item.id}`} aria-label="Đổi phân loại" className="block max-w-full text-xs p-1 border rounded bg-white" value={value} disabled={disabled} onChange={(event) => setChoice(event.target.value)}>
          <option value="">Chọn phân loại khác</option>
          {alternatives.map((variant) => (
            <option value={variant.id} key={variant.id}>
              {variantLabel(variant.variant_values, variant.sku)} · {variant.price_vnd.toLocaleString("vi-VN")} ₫
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <UiButton type="submit" size="sm" variant="secondary" disabled={disabled || !value}>Đổi</UiButton>
        <button
          type="button"
          className="text-xs text-slate-500 hover:underline px-1 py-0.5"
          onClick={() => { setOpen(false); setChoice(""); }}
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

function QuantityInput({
  quantity,
  disabled,
  onChangeQuantity,
  onDirectQuantity,
  detailsId,
}: {
  quantity: number;
  disabled: boolean;
  onChangeQuantity: (delta: number) => void;
  onDirectQuantity: (qty: number) => void;
  detailsId: string;
}) {
  const [val, setVal] = useState(String(quantity));

  useEffect(() => {
    setVal(String(quantity));
  }, [quantity]);

  const commit = () => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed !== quantity) {
      onDirectQuantity(parsed);
    } else {
      setVal(String(quantity));
    }
  };

  return (
    <div className="cart-qty-control">
      <button
        type="button"
        aria-label="Giảm số lượng"
        aria-describedby={detailsId}
        onClick={() => onChangeQuantity(-1)}
        disabled={disabled || quantity <= 1}
      >
        −
      </button>
      <input
        type="number"
        min={1}
        max={999}
        value={val}
        disabled={disabled}
        aria-label="Số lượng sản phẩm"
        aria-describedby={detailsId}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
      <button
        type="button"
        aria-label="Tăng số lượng"
        aria-describedby={detailsId}
        onClick={() => onChangeQuantity(1)}
        disabled={disabled}
      >
        +
      </button>
    </div>
  );
}

function StoreGroupHeader({
  storeId,
  isSomeStoreSelected,
  isAllStoreSelected,
  toggleStore,
}: {
  storeId: string;
  isSomeStoreSelected: boolean;
  isAllStoreSelected: boolean;
  toggleStore: (storeId: string) => void;
}) {
  const storeQuery = useQuery({
    queryKey: ["public-store", storeId],
    queryFn: () => callOperation("getPublicStore", { path: { id: storeId } }),
    retry: false,
  });
  const storeName = storeQuery.data?.name?.trim();
  const label = storeName
    ? `Chọn tất cả sản phẩm của gian hàng ${storeName}`
    : `Chọn tất cả sản phẩm của gian hàng`;

  return (
    <div className="flex items-center gap-2.5 py-2.5 px-4 bg-white border-b border-slate-100 text-xs">
      <input
        type="checkbox"
        id={"select-store-" + storeId}
        aria-label={label}
        ref={(el) => {
          if (el) el.indeterminate = isSomeStoreSelected;
        }}
        checked={isAllStoreSelected}
        onChange={() => toggleStore(storeId)}
        className="shopee-cart-checkbox"
      />
      <span className="order-store-badge">Yêu thích</span>
      <StoreLabel
        id={storeId}
        iconSize={15}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-[#ee4d2d] no-underline"
      />
      <ContactStoreButton storeId={storeId} compact />
    </div>
  );
}

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.context?.user_id;
  const cache = useQueryClient(),
    mutationInFlight = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null),
    choices = useRef(new Map<string, HTMLInputElement>());
  const focusAfterRemove = useRef<string | null | undefined>(undefined);

  const [cartPage, setCartPage] = useState(1),
    [loadProgress, setLoadProgress] = useState("");
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [needsReconcile, setNeedsReconcile] = useState(false);
  const [notice, setNotice] = useState("");
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);

  useEffect(() => {
    if (focusAfterRemove.current === undefined) return;
    const next = focusAfterRemove.current;
    focusAfterRemove.current = undefined;
    (next ? choices.current.get(next) : heading.current)?.focus();
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    try {
      const all = await fetchAllCartItems((loaded, total) =>
        setLoadProgress(`${loaded}/${total} món`),
      );
      setItems(all);
      // A readback also settles a DELETE whose acknowledgement was lost. Publish
      // the complete read to the header instead of leaving its cached count stale.
      cache.setQueryData(["cart-summary"], {
        items: all.slice(0, 1),
        page: 1,
        size: 1,
        total: all.length,
      });
      let previous: string[] | undefined;
      try {
        const raw = sessionStorage.getItem(getSelectionKey(userId) ?? "");
        if (raw !== null) {
          const values = JSON.parse(raw);
          if (Array.isArray(values))
            previous = values.filter((x) => typeof x === "string");
        }
      } catch {
        /* Select defaults only when no valid saved choice exists. */
      }
      setSelected(
        new Set(
          previous
            ? all
                .filter((item) => previous!.includes(item.id))
                .map((item) => item.id)
            : all.map((item) => item.id),
        ),
      );
      setNeedsReconcile(false);
    } catch (error) {
      setItems(null);
      setLoadError(describe(error));
    } finally {
      setLoading(false);
    }
  }, [userId, cache]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (items !== null && !loading && userId)
      try {
        sessionStorage.setItem(
          getSelectionKey(userId)!,
          JSON.stringify([...selected]),
        );
      } catch {
        /* Optional storage. */
      }
  }, [items, selected, loading, userId]);

  const changeQuantity = async (item: CartItem, delta: number) => {
    const quantity = item.quantity + delta;
    if (quantity < 1 || mutationInFlight.current || needsReconcile) return;
    mutationInFlight.current = true;
    setBusyId(item.id);
    setActionError(null);
    try {
      await callOperation("updateCartItem", {
        path: { id: item.id },
        body: { quantity },
      });
      setItems(
        (prev) =>
          prev && prev.map((i) => (i.id === item.id ? { ...i, quantity } : i)),
      );
      setNotice(`Đã cập nhật ${itemLabel(item)}. Số lượng: ${quantity}.`);
    } catch (error) {
      setActionError(describe(error));
      if (
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status === 408 ||
        error.status >= 500
      )
        setNeedsReconcile(true);
    } finally {
      mutationInFlight.current = false;
      setBusyId(null);
    }
  };

  const setDirectQuantity = async (item: CartItem, newQty: number) => {
    const quantity = Math.max(1, Math.min(999, Math.floor(newQty)));
    if (quantity === item.quantity || isNaN(quantity) || mutationInFlight.current || needsReconcile) return;
    mutationInFlight.current = true;
    setBusyId(item.id);
    setActionError(null);
    try {
      await callOperation("updateCartItem", {
        path: { id: item.id },
        body: { quantity },
      });
      setItems(
        (prev) =>
          prev && prev.map((i) => (i.id === item.id ? { ...i, quantity } : i)),
      );
      setNotice(`Đã cập nhật ${itemLabel(item)}. Số lượng: ${quantity}.`);
    } catch (error) {
      setActionError(describe(error));
      if (
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status === 408 ||
        error.status >= 500
      )
        setNeedsReconcile(true);
    } finally {
      mutationInFlight.current = false;
      setBusyId(null);
    }
  };

  const changeVariant = async (item: CartItem, variantId: string) => {
    if (!items || mutationInFlight.current || needsReconcile) return;
    mutationInFlight.current = true;
    setBusyId(item.id);
    setActionError(null);
    setNotice("");
    let replacement: CartItem | undefined;
    let added = false;
    let removed = false;
    try {
      // Add first so a stock error leaves the original line intact.
      const result = await callOperation("addCartItem", {
        body: { product_id: item.product_id, variant_id: variantId, quantity: item.quantity },
      });
      added = true;
      if (!result.id) throw new Error("Chưa nhận được mã dòng giỏ mới.");
      replacement = { ...item, id: result.id, variant_id: result.variant_id, quantity: result.quantity };
      try {
        await callOperation("removeCartItem", { path: { id: item.id } });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
      removed = true;
    } catch (error) {
      if (added || isUncertainMutation(error)) {
        setNeedsReconcile(true);
        setActionError(replacement
          ? "Đã thêm phân loại mới nhưng chưa xác nhận xóa được dòng cũ. Kiểm tra cả hai dòng sau khi làm mới giỏ."
          : "Chưa rõ kết quả đổi phân loại. Kiểm tra giỏ trước khi đổi lại.");
      } else setActionError(describe(error));
    } finally {
      if (replacement) {
        const line = replacement;
        const existing = items.some((row) => row.id === line.id);
        const next = items.flatMap((row) => {
          if (row.id === line.id) return [line];
          if (row.id !== item.id) return [row];
          if (removed) return existing ? [] : [line];
          return existing ? [row] : [row, line];
        });
        if (removed) {
          setCartPage(1 + Math.floor(next.findIndex((row) => row.id === line.id) / 25));
          focusAfterRemove.current = line.id;
          setSelected((previous) => {
            const updated = new Set(previous);
            if (updated.delete(item.id)) updated.add(line.id);
            return updated;
          });
          setNotice(`Đã đổi sang ${itemLabel(line)}. Số lượng: ${line.quantity}.`);
        }
        setItems(next);
      }
      if (added) void cache.invalidateQueries({ queryKey: ["cart-summary"] });
      mutationInFlight.current = false;
      setBusyId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (mutationInFlight.current || needsReconcile) return;
    mutationInFlight.current = true;
    setBusyId(item.id);
    setActionError(null);
    try {
      await callOperation("removeCartItem", { path: { id: item.id } });
      const remaining = (items ?? []).filter((i) => i.id !== item.id),
        index = (items ?? []).findIndex((i) => i.id === item.id);
      focusAfterRemove.current =
        remaining[Math.min(index, remaining.length - 1)]?.id ?? null;
      setItems((prev) => prev && prev.filter((i) => i.id !== item.id));
      setNotice(
        `Đã xóa ${itemLabel(item)} khỏi giỏ. Bạn có thể chọn lại tại trang sản phẩm.`,
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      await cache.invalidateQueries({ queryKey: ["cart-summary"] });
    } catch (error) {
      setActionError(describe(error));
      if (
        !(error instanceof ApiError) ||
        error.status === 0 ||
        error.status === 408 ||
        error.status >= 500
      )
        setNeedsReconcile(true);
    } finally {
      mutationInFlight.current = false;
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

  const allSelected =
    !!items && items.length > 0 && items.every((item) => selected.has(item.id));

  const toggleAll = () => {
    if (!items) return;
    setSelected(
      allSelected ? new Set() : new Set(items.map((item) => item.id)),
    );
  };

  const toggleStore = (storeId: string) => {
    if (!items) return;
    const storeItems = items.filter((item) => item.store_id === storeId);
    const allStoreSelected = storeItems.length > 0 && storeItems.every((item) => selected.has(item.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of storeItems) {
        if (allStoreSelected) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
      }
      return next;
    });
  };

  const goCheckout = () => {
    if (!userId || mutationInFlight.current || needsReconcile || loading)
      return;
    const cartItemIds = Array.from(selected);
    if (cartItemIds.length === 0) return;
    clearBuyNow(userId);
    const key = getSelectionKey(userId);
    if (key) {
      try {
        sessionStorage.setItem(key, JSON.stringify(cartItemIds));
      } catch {
        /* storage can be unavailable */
      }
    }
    navigate("/checkout", { state: checkoutState(userId, { cartItemIds }) });
  };

  const selectedQuantity = (items ?? [])
    .filter((item) => selected.has(item.id))
    .reduce((sum, item) => sum + item.quantity, 0);
  const productIds = [...new Set((items ?? []).map((item) => item.product_id))];
  const batch = useProductBatch(productIds),
    metadata = [batch];
  const productFor = (item: CartItem) =>
    batch.error
      ? undefined
      : batch.data?.find((product) => product.id === item.product_id);
  const pages = Math.max(1, Math.ceil((items?.length ?? 0) / 25));
  useEffect(() => {
    if (cartPage > pages) setCartPage(pages);
  }, [cartPage, pages]);
  const visibleItems = (items ?? []).slice((cartPage - 1) * 25, cartPage * 25);
  function itemLabel(item: CartItem) {
    const product = productFor(item),
      variant = product?.variants?.find((v) => v.id === item.variant_id);
    return `${product?.title ?? "Sản phẩm mã " + shortId(item.product_id)} · ${variant ? variantLabel(variant.variant_values) : "Phân loại mã " + shortId(item.variant_id)}`;
  }
  const selectedRows = (items ?? []).filter((item) => selected.has(item.id));
  const values = selectedRows.map(
    (item) =>
      productFor(item)?.variants?.find((v) => v.id === item.variant_id)
        ?.price_vnd,
  );
  const subtotal = values.some((value) => value === undefined)
    ? null
    : values.reduce<number>(
        (sum, value, index) => sum + value! * selectedRows[index].quantity,
        0,
      );

  return (
    <div className="cart-page">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold mb-6">
        Giỏ hàng
      </h1>
      <p
        role="status"
        className={notice ? "mb-4 text-sm text-slate-700" : "sr-only"}
      >
        {notice}
      </p>

      {loading && (
        <p className="text-gray-500">Đang tải giỏ hàng… {loadProgress}</p>
      )}
      {needsReconcile && (
        <p role="alert">
          {actionError ?? "Chưa rõ kết quả cập nhật. Kiểm tra giỏ trước khi tiếp tục."}{" "}
          <button type="button" disabled={!!busyId} onClick={() => void load()}>
            Làm mới
          </button>
        </p>
      )}

      {!loading && loadError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg space-y-3"
        >
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
        <div className="shopee-cart-layout w-full space-y-4">
          <div className="cart-store-groups space-y-3">
            {actionError && !needsReconcile && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm"
              >
                {actionError}
              </div>
            )}
            {metadata.some((result) => result.error) && (
              <p role="alert">
                Chưa đọc đủ thông tin hàng để tính tạm tính.{" "}
                <button
                  type="button"
                  disabled={metadata.some((result) => result.isFetching)}
                  onClick={() => {
                    for (const result of metadata)
                      if (result.error) void result.refetch();
                  }}
                >
                  Đọc lại thông tin hàng
                </button>
              </p>
            )}

            {/* Shopee-style Table Header */}
            <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-sm items-center">
              <div className="col-span-5 flex items-center">
                <label htmlFor="cart-select-all" className="shopee-cart-select-all-label">
                  <input
                    type="checkbox"
                    id="cart-select-all"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="shopee-cart-checkbox"
                  />
                  <span>Sản phẩm ({items.length} món)</span>
                </label>
              </div>
              <div className="col-span-2 text-right">Đơn giá</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-2 text-right">Số tiền</div>
              <div className="col-span-1 text-center">Thao tác</div>
            </div>

            <div className="sm:hidden flex items-center bg-white p-3 rounded-lg border shadow-sm">
              <label htmlFor="cart-select-all-mobile" className="shopee-cart-select-all-label">
                <input
                  type="checkbox"
                  id="cart-select-all-mobile"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="shopee-cart-checkbox"
                />
                <span>Chọn tất cả ({items.length} món)</span>
              </label>
            </div>

            {Array.from(new Set(visibleItems.map((item) => item.store_id))).map(
              (storeId) => {
                const storeItems = visibleItems.filter((item) => item.store_id === storeId);
                const storeSelectedCount = storeItems.filter((item) => selected.has(item.id)).length;
                const isAllStoreSelected = storeItems.length > 0 && storeSelectedCount === storeItems.length;
                const isSomeStoreSelected = storeSelectedCount > 0 && storeSelectedCount < storeItems.length;

                return (
                  <section className="cart-store-group bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm" key={storeId}>
                    <StoreGroupHeader
                      storeId={storeId}
                      isSomeStoreSelected={isSomeStoreSelected}
                      isAllStoreSelected={isAllStoreSelected}
                      toggleStore={toggleStore}
                    />
                    <div className="divide-y divide-slate-100">
                      {visibleItems
                        .filter((item) => item.store_id === storeId)
                        .map((item) => {
                          const prod = productFor(item);
                          const variant = prod?.variants?.find((v) => v.id === item.variant_id);
                          return (
                            <div
                              key={item.id}
                              role="group"
                              aria-label={"Dòng giỏ: " + itemLabel(item)}
                              className="p-3.5 flex flex-col sm:grid sm:grid-cols-12 sm:gap-3 sm:items-center hover:bg-slate-50/50 transition-colors"
                            >
                              <div className="sm:col-span-5 flex items-start sm:items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  ref={(element) => {
                                    if (element)
                                      choices.current.set(item.id, element);
                                    else choices.current.delete(item.id);
                                  }}
                                  aria-label={"Chọn " + itemLabel(item)}
                                  checked={selected.has(item.id)}
                                  onChange={() => toggleItem(item.id)}
                                  className="shopee-cart-checkbox"
                                />
                                <div className="min-w-0 flex-1">
                                  <div id={"cart-details-" + item.id}>
                                    <CartProduct
                                      metadataProvided
                                      metadataLoading={batch.isPending}
                                      metadataError={batch.error}
                                      metadata={prod}
                                      productId={item.product_id}
                                      variantId={item.variant_id}
                                      quantity={item.quantity}
                                      hideInlinePrices
                                    />
                                  </div>
                                  <CartVariantPicker
                                    item={item}
                                    variants={prod?.variants}
                                    disabled={busyId !== null || needsReconcile}
                                    onChange={(variantId) => void changeVariant(item, variantId)}
                                  />
                                </div>
                              </div>

                              {/* Unit price */}
                              <div className="sm:col-span-2 sm:text-right text-xs my-1 sm:my-0">
                                <span className="sm:hidden text-slate-500 mr-1">Đơn giá:</span>
                                <span className="text-slate-700 font-medium whitespace-nowrap">
                                  {variant ? formatMoney(variant.price_vnd) : "—"}
                                </span>
                              </div>

                              {/* Quantity */}
                              <div className="sm:col-span-2 flex sm:justify-center my-1 sm:my-0">
                                <QuantityInput
                                  quantity={item.quantity}
                                  disabled={busyId !== null || needsReconcile}
                                  onChangeQuantity={(delta) => void changeQuantity(item, delta)}
                                  onDirectQuantity={(qty) => void setDirectQuantity(item, qty)}
                                  detailsId={"cart-details-" + item.id}
                                />
                              </div>

                              {/* Total line price in Shopee Orange */}
                              <div className="sm:col-span-2 sm:text-right text-sm font-bold text-[#ee4d2d] my-1 sm:my-0 whitespace-nowrap">
                                <span className="sm:hidden text-slate-500 mr-1 font-normal text-xs">Thành tiền:</span>
                                {variant ? formatMoney(variant.price_vnd * item.quantity) : "—"}
                              </div>

                              {/* Actions */}
                              <div className="sm:col-span-1 sm:text-center mt-1 sm:mt-0">
                                <button
                                  type="button"
                                  aria-describedby={"cart-details-" + item.id}
                                  onClick={() => void removeItem(item)}
                                  disabled={busyId !== null || needsReconcile}
                                  className="text-xs text-slate-600 hover:text-[#ee4d2d] hover:underline disabled:opacity-50 font-medium cursor-pointer transition-colors"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Shopee-style Store Footer */}
                    <div className="shopee-cart-store-footer py-2.5 px-4 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Ticket size={14} className="text-[#ee4d2d]" />
                        <span>Voucher giảm giá của Shop</span>
                        <Link to={`/stores/${storeId}`} className="text-indigo-600 hover:underline ml-1">
                          Xem thêm voucher &gt;
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <Truck size={14} />
                        <span>Miễn phí vận chuyển cho đơn hàng</span>
                      </div>
                    </div>
                  </section>
                );
              },
            )}

            {pages > 1 && (
              <Pagination
                page={cartPage}
                size={25}
                total={items.length}
                onPage={setCartPage}
              />
            )}
          </div>

          {/* Shopee-style Full-width Sticky Bottom Payment Bar */}
          <div className="shopee-cart-sticky-bar">
            {/* Top Voucher Sub-row */}
            <div className="shopee-cart-sticky-voucher-row">
              <div
                className="flex items-center gap-2 text-xs text-slate-700 ml-auto cursor-pointer group"
                onClick={() => setVoucherModalOpen(true)}
              >
                <Ticket size={15} className="text-[#ee4d2d]" />
                <span className="font-semibold text-slate-800">Shopee Voucher</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-[#2563eb] group-hover:underline">
                  Chọn hoặc nhập mã &gt;
                </span>
              </div>
            </div>

            {/* Main Action Bar */}
            <div className="shopee-cart-sticky-main-row">
              <div className="shopee-cart-sticky-actions">
                <label className="shopee-cart-select-all-label">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="shopee-cart-checkbox"
                  />
                  <span>Chọn Tất Cả ({items.length})</span>
                </label>

                {selected.size > 0 && (
                  <>
                    <span className="shopee-cart-divider">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        for (const item of items) {
                          if (selected.has(item.id)) {
                            void removeItem(item);
                          }
                        }
                      }}
                      disabled={busyId !== null || needsReconcile}
                      className="shopee-cart-clear-btn"
                    >
                      Xóa ({selected.size})
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-6 ml-auto">
                <div className="text-right">
                  <div className="flex items-baseline gap-2 justify-end">
                    <span className="text-sm text-slate-700">
                      Tổng thanh toán ({selectedQuantity.toLocaleString("vi-VN")} sản phẩm):
                    </span>
                    <span className="shopee-cart-total-price">
                      {subtotal !== null && Number.isSafeInteger(subtotal)
                        ? subtotal.toLocaleString("vi-VN") + " ₫"
                        : batch.isFetching
                          ? "..."
                          : "0 ₫"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 m-0">
                    Tiết kiệm &amp; ưu đãi áp dụng tại bước thanh toán
                  </p>
                </div>

                <button
                  type="button"
                  className="shopee-cart-checkout-btn"
                  onClick={goCheckout}
                  disabled={
                    selected.size === 0 ||
                    busyId !== null ||
                    needsReconcile ||
                    loading
                  }
                >
                  Mua Hàng
                </button>
              </div>
            </div>
          </div>

          {/* Shopee-style Voucher Modal */}
          {voucherModalOpen && (
            <VoucherPicker
              storeIds={Array.from(new Set(items.map((it) => it.store_id)))}
              onClose={() => setVoucherModalOpen(false)}
              onPick={(storeId, code) => {
                alert(`Đã chọn voucher: ${code}. Bạn có thể kiểm tra chiết khấu tại bước thanh toán.`);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CartPage;
