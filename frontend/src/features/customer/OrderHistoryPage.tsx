import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, Truck, Store, ArrowRight } from "lucide-react";
import { callOperation } from "../../api/operations";
import { Empty, ErrorView, Loading, Pagination } from "../../bootstrap/components";
import {
  OrderStatusTabs,
  OrderListIdentity,
  OrderStoreLabel,
  useOrderListFilters,
  refundStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "../../components/OrderListTools";
import {
  orderStatusLabel,
  OrderNextStep,
} from "../../components/OrderPresentation";
import { canStartOrderPayment } from "../../components/order-actions";
import { CustomerSubNav } from "./CustomerSubNav";
import { useProductBatch } from "./useProductBatch";
import { ContactStoreButton } from "./ContactStoreButton";

export function OrderHistoryPage() {
  const filters = useOrderListFilters(),
    location = useLocation(),
    navigate = useNavigate(),
    cache = useQueryClient();
  const [repurchasingId, setRepurchasingId] = useState<string | null>(null);
  const [repurchaseNotice, setRepurchaseNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(filters.query.q ?? "");

  useEffect(() => {
    setSearchQuery(filters.query.q ?? "");
  }, [filters.query.q]);

  const handleRepurchase = async (order: NonNullable<typeof query.data>["items"][number]) => {
    if (!order.items?.length) return;
    setRepurchasingId(order.id);
    setRepurchaseNotice(null);
    let addedCount = 0;
    try {
      for (const item of order.items) {
        if (item.product_id && item.variant_id) {
          await callOperation("addCartItem", {
            body: {
              product_id: String(item.product_id),
              variant_id: String(item.variant_id),
              quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
            },
          });
          addedCount++;
        }
      }
      await cache.invalidateQueries({ queryKey: ["cart-summary"] });
      navigate("/cart");
    } catch {
      if (addedCount > 0) {
        await cache.invalidateQueries({ queryKey: ["cart-summary"] });
        navigate("/cart");
      } else {
        setRepurchaseNotice("Một số sản phẩm trong đơn đã hết hàng hoặc ngừng kinh doanh.");
      }
    } finally {
      setRepurchasingId(null);
    }
  };

  const query = useQuery({
    queryKey: ["customer-orders", filters.query],
    staleTime: 0,
    queryFn: ({ signal }) =>
      callOperation("listOwnOrders", { query: filters.query }, { signal }),
  });

  useEffect(() => {
    if (
      query.data &&
      !query.isFetching &&
      !query.error &&
      filters.page > Math.max(1, Math.ceil(query.data.total / query.data.size))
    )
      filters.set(
        "page",
        String(Math.max(1, Math.ceil(query.data.total / query.data.size))),
        { replace: true },
      );
  }, [query.data, query.isFetching, query.error, filters.page]);

  const state = { ordersReturnTo: location.pathname + location.search };
  const { q, status, payment_status, refund_status } = filters.query;
  const hasExtraFilters = !!(q || payment_status || refund_status);
  const hasFilters = hasExtraFilters || !!status;
  const emptyMessage = !hasFilters ? "Bạn chưa có đơn hàng."
    : !hasExtraFilters && status === "SHIPPED" ? "Không có đơn đang giao."
    : !hasExtraFilters && status === "COMPLETED" ? "Không có đơn đã hoàn tất."
    : "Không có đơn hàng phù hợp.";
  const products = useProductBatch((query.data?.items ?? []).flatMap(order => order.items ?? []).map(item => item.product_id).filter((id): id is string => typeof id === "string"));
  const images = new Map<string, string>();
  if (!products.error) for (const product of products.data ?? []) {
    if (product.id && product.images?.[0]?.image_url) images.set(product.id, product.images[0].image_url);
  }

  return (
    <section className="boot-card order-history-page">
      <CustomerSubNav />
      <div className="seller-products-toolbar">
        <h1>Lịch sử đơn hàng</h1>
        <Link className="ui-button ui-button-secondary" to="/">
          Tiếp tục mua sắm
        </Link>
      </div>

      <OrderStatusTabs filters={filters} returns />

      {/* Shopee-style Inline Search Bar */}
      <form
        className="order-inline-search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          filters.set("q", searchQuery.trim());
        }}
      >
        <div className="order-search-input-wrap">
          <Search size={17} className="order-search-icon" />
          <input
            type="search"
            maxLength={200}
            placeholder="Bạn có thể tìm kiếm theo tên Shop, ID đơn hàng hoặc Tên Sản phẩm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="order-search-clear-btn"
              onClick={() => {
                setSearchQuery("");
                filters.set("q", "");
              }}
              aria-label="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button type="submit" className="ui-button ui-button-primary order-search-submit-btn">
          Tìm đơn hàng
        </button>
      </form>

      {repurchaseNotice && (
        <div role="status" className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg my-2">
          {repurchaseNotice}
        </div>
      )}

      {hasExtraFilters && (
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-3 bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
          <span>Đang lọc: {q ? `Từ khóa "${q}"` : ""} {payment_status ? `Thanh toán: ${paymentStatusLabel(payment_status)}` : ""} {refund_status ? `Hoàn tiền: ${refundStatusLabel(refund_status)}` : ""}</span>
          <button
            type="button"
            className="text-xs text-indigo-600 hover:underline font-medium ml-auto"
            onClick={filters.reset}
          >
            Bỏ lọc
          </button>
        </div>
      )}

      {query.error ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.items.length && (
              <Empty>
                <p>{query.data.total === 0 ? emptyMessage : "Không có đơn hàng ở trang này."}</p>
                {hasFilters && (
                  <Link className="ui-button ui-button-secondary" to="/customer/orders">Xem tất cả đơn</Link>
                )}
              </Empty>
            )}
            {query.data.items.map((order) => {
              const quantities = (order.items ?? []).map(item => item.quantity);
              const totalQuantity = quantities.length && quantities.every(quantity => typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity > 0)
                ? quantities.reduce<number>((total, quantity) => total + (quantity as number), 0) : undefined;
              const isDelivered = order.status === "COMPLETED" || Boolean(order.shipping_delivered_at);
              const isShipping = order.status === "SHIPPED" && !order.shipping_delivered_at;

              return (
                <article className="boot-card order-history-card" key={order.id}>
                  {/* Shopee-style Card Header */}
                  <div className="order-history-header">
                    <div className="order-header-store-section">
                      <OrderStoreLabel id={order.store_id} compact />
                      <ContactStoreButton storeId={order.store_id} orderId={order.id} compact />
                      <Link
                        to={`/stores/${order.store_id}`}
                        className="order-view-store-link"
                      >
                        <Store size={13} />
                        <span>Xem Shop</span>
                      </Link>
                      <span className="text-slate-300">·</span>
                      <Link
                        state={state}
                        to={"/customer/orders/" + order.id}
                        className="text-xs text-slate-500 hover:text-indigo-600 font-mono font-medium"
                      >
                        Đơn #{order.id.slice(-8).toUpperCase()}
                      </Link>
                    </div>

                    <div className="order-header-status-section">
                      {isDelivered ? (
                        <span className="order-delivery-milestone is-delivered">
                          <Truck size={14} /> Giao hàng thành công ⓘ
                          <span className="text-slate-300 ml-1.5 mr-0.5">·</span>
                        </span>
                      ) : isShipping ? (
                        <span className="order-delivery-milestone is-shipping">
                          <Truck size={14} /> ĐVVC lấy hàng thành công ⓘ
                          <span className="text-slate-300 ml-1.5 mr-0.5">·</span>
                        </span>
                      ) : null}
                      <span
                        className={`order-status-tag status-${order.status.toLowerCase()}`}
                      >
                        {orderStatusLabel(order.status).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Product Rows with Price */}
                  <OrderListIdentity order={order} compact currentImages={images} showPrice />

                  {["UNKNOWN", "RECOVERING", "PREPARING"].includes(
                    order.payment_status ?? "",
                  ) || ["RECOVERING", "PREPARING"].includes(order.status) ? (
                    <OrderNextStep order={order} />
                  ) : null}

                  {/* Total Payment Row (Shopee Typography) */}
                  <div className="order-history-total-row">
                    <span className="order-total-label">Tổng thanh toán{totalQuantity === undefined ? '' : ` (${totalQuantity} sản phẩm)`}:</span>
                    <span className="order-total-price-highlight">
                      {order.amounts.payable_vnd.toLocaleString("vi-VN")}
                      <span className="order-currency">₫</span>
                    </span>
                  </div>

                  {/* Card Footer with Microcopy and Dynamic Action Buttons */}
                  <div className="order-history-footer">
                    <div className="order-footer-microcopy">
                      {order.status === "SHIPPED" ? (
                        <p className="order-microcopy-hint">
                          Vui lòng chỉ nhấn &quot;Đã nhận được hàng&quot; khi đơn hàng đã được giao đến bạn và sản phẩm nhận được không có vấn đề nào.
                        </p>
                      ) : order.status === "CANCELLED" ? (
                        <p className="order-microcopy-hint">
                          Đã hủy đơn hàng. {order.refund_status && `· Lệnh hoàn tiền: ${refundStatusLabel(order.refund_status)}`}
                        </p>
                      ) : order.refund_status ? (
                        <p className="order-microcopy-refund">
                          Lệnh hoàn tiền: {refundStatusLabel(order.refund_status)}
                        </p>
                      ) : (
                        <p className="order-microcopy-payment">
                          {paymentMethodLabel(order.payment_method)} ·{" "}
                          {paymentStatusLabel(
                            order.payment_status,
                            order.amounts.payable_vnd,
                          )}
                        </p>
                      )}
                    </div>

                    <div className="order-footer-actions">
                      {order.status === "SHIPPED" && (
                        <>
                          <Link
                            state={state}
                            to={`/customer/orders/${order.id}`}
                            className="ui-button ui-button-primary order-btn-highlight"
                          >
                            Đã nhận hàng
                          </Link>
                          <Link
                            state={state}
                            to={`/customer/orders/${order.id}#returns`}
                            className="ui-button ui-button-secondary"
                          >
                            Yêu cầu trả hàng/hoàn tiền
                          </Link>
                        </>
                      )}

                      {order.status === "COMPLETED" && (
                        <>
                          <button
                            type="button"
                            className="ui-button ui-button-primary order-btn-highlight"
                            disabled={repurchasingId === order.id}
                            onClick={() => handleRepurchase(order)}
                          >
                            {repurchasingId === order.id ? "Đang thêm giỏ..." : "Mua lại"}
                          </button>
                          <Link
                            state={state}
                            to={`/customer/orders/${order.id}#order-items`}
                            className="ui-button ui-button-secondary"
                          >
                            Đánh giá
                          </Link>
                          <Link
                            state={state}
                            to={`/customer/orders/${order.id}#returns`}
                            className="ui-button ui-button-secondary"
                          >
                            Yêu cầu đổi trả
                          </Link>
                        </>
                      )}

                      {order.status === "CANCELLED" && (
                        <>
                          <button
                            type="button"
                            className="ui-button ui-button-primary order-btn-highlight"
                            disabled={repurchasingId === order.id}
                            onClick={() => handleRepurchase(order)}
                          >
                            {repurchasingId === order.id ? "Đang thêm giỏ..." : "Mua lại"}
                          </button>
                          <Link
                            state={state}
                            to={`/customer/orders/${order.id}`}
                            className="ui-button ui-button-secondary"
                          >
                            {order.refund_status ? "Xem thông tin hoàn tiền" : "Xem chi tiết hủy đơn"}
                          </Link>
                        </>
                      )}

                      {order.status === "AWAITING_PAYMENT" && (
                        <>
                          <Link
                            state={state}
                            to={`/orders/${order.id}/pay`}
                            className="ui-button ui-button-primary order-btn-highlight"
                          >
                            Thanh toán ngay →
                          </Link>
                          <Link
                            state={state}
                            to={`/customer/orders/${order.id}#cancel`}
                            className="ui-button ui-button-secondary"
                          >
                            Hủy đơn
                          </Link>
                        </>
                      )}

                      {["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status) && (
                        <Link
                          state={state}
                          to={`/customer/orders/${order.id}#cancel`}
                          className="ui-button ui-button-secondary"
                        >
                          Hủy đơn
                        </Link>
                      )}

                      <Link
                        className="ui-button ui-button-secondary"
                        state={state}
                        to={"/customer/orders/" + order.id}
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
            <Pagination
              page={filters.page}
              size={query.data.size}
              total={query.data.total}
              onPage={(page) => filters.set("page", String(page))}
            />
          </>
        )
      )}
    </section>
  );
}
export default OrderHistoryPage;
