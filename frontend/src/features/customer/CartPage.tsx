import { useProductBatch } from "./useProductBatch";
import { Pagination } from "../../bootstrap/components";
import { PurchaseActionBar } from "../../components/PurchaseActionBar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import { useAuth } from "../../api/auth-context";
import { StoreLabel } from "../../live/StoreLabel";
import { CartProduct } from "../../live/CartProduct";
import { clearBuyNow, checkoutState, variantLabel } from "./checkout-intent";

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
          Kết nối bị gián đoạn khi cập nhật. Hãy kiểm tra giỏ trước khi thay đổi
          tiếp.{" "}
          <button type="button" disabled={!!busyId} onClick={() => void load()}>
            Đọc lại giỏ hàng
          </button>{" "}
          trước khi tiếp tục; không gửi lại thao tác cũ.
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
        <div className="cart-layout">
          <div className="cart-store-groups">
            {actionError && (
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

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              Chọn tất cả
            </label>

            {Array.from(new Set(visibleItems.map((item) => item.store_id))).map(
              (storeId) => (
                <section className="cart-store-group" key={storeId}>
                  <StoreLabel id={storeId} />
                  {visibleItems
                    .filter((item) => item.store_id === storeId)
                    .map((item) => (
                      <div
                        key={item.id}
                        role="group"
                        aria-label={"Dòng giỏ: " + itemLabel(item)}
                        className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
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
                          />
                          <div>
                            <div id={"cart-details-" + item.id}>
                              <CartProduct
                                metadataProvided
                                metadataLoading={batch.isPending}
                                metadataError={batch.error}
                                metadata={productFor(item)}
                                productId={item.product_id}
                                variantId={item.variant_id}
                                quantity={item.quantity}
                              />
                            </div>
                            <p className="text-sm mt-2">
                              {busyId !== null || needsReconcile ? (
                                <span>
                                  Chọn phân loại khác sau khi đọc lại kết quả
                                  cập nhật giỏ.
                                </span>
                              ) : (
                                <Link to={"/products/" + item.product_id}>
                                  Chọn phân loại khác
                                </Link>
                              )}
                              <br />
                              Thêm lựa chọn mới, sau đó xóa dòng cũ trong giỏ.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 border rounded p-1">
                            <button
                              type="button"
                              aria-label="Giảm số lượng"
                              aria-describedby={"cart-details-" + item.id}
                              onClick={() => void changeQuantity(item, -1)}
                              disabled={
                                busyId !== null ||
                                needsReconcile ||
                                item.quantity <= 1
                              }
                              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Tăng số lượng"
                              aria-describedby={"cart-details-" + item.id}
                              onClick={() => void changeQuantity(item, 1)}
                              disabled={busyId !== null || needsReconcile}
                              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-describedby={"cart-details-" + item.id}
                            onClick={() => void removeItem(item)}
                            disabled={busyId !== null || needsReconcile}
                            className="text-sm text-red-600 hover:underline disabled:opacity-50"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                </section>
              ),
            )}
            <Pagination
              page={cartPage}
              size={25}
              total={items.length}
              onPage={setCartPage}
            />
          </div>

          <div className="purchase-summary space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">
              Tóm tắt đơn hàng
            </h2>
            <div className="text-sm space-y-1 text-gray-600">
              <p>Sản phẩm đã chọn: {selected.size}</p>
              <p>Tổng số lượng: {selectedQuantity}</p>
              <p aria-live="polite" aria-atomic="true">
                Tạm tính tiền hàng:{" "}
                {subtotal !== null && Number.isSafeInteger(subtotal)
                  ? subtotal.toLocaleString("vi-VN") + " ₫"
                  : batch.isFetching
                    ? "Đang cập nhật giá…"
                    : "Chưa đủ thông tin để tính"}
              </p>
              <p className="text-xs text-gray-400">
                Tạm tính chỉ gồm tiền hàng, chưa gồm phí giao hàng và ưu đãi.
                Tổng cuối cùng được xác nhận ở bước thanh toán.
              </p>
            </div>
            <PurchaseActionBar
              summary={selected.size + " sản phẩm"}
              label="Đã chọn"
              onAction={goCheckout}
              disabled={
                selected.size === 0 ||
                busyId !== null ||
                needsReconcile ||
                loading
              }
            >
              Tiến hành thanh toán
            </PurchaseActionBar>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
