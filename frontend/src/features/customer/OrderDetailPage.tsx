import { useConfirm } from "../../components/ConfirmDialog";
import { ContactStoreButton } from "./ContactStoreButton";
import { OwnDeliveryReturn } from "../returns/DeliveryReturnsPage";
import { CustomerShippingPanel } from '../shipping/ShippingPanel';
import {
  OrderItemIdentity,
  OrderNextStep,
  OrderTimeline,
  OrderProgressTracker,
  OrderDeliveryAddress,
  ReturnPolicyNotice,
  orderStatusLabel,
} from "../../components/OrderPresentation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { StarPicker } from "../../components/StarRating";
import { useAuth } from "../../api/auth-context";
import { ApiError, isUncertainMutation } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ErrorView, Loading } from "../../bootstrap/components";
import { OrderReturnsPanel } from "../returns/OrderReturnsPanel";
import { canStartOrderPayment } from "../../components/order-actions";
import {
  OrderStoreLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  refundStatusLabel,
} from "../../components/OrderListTools";
import { RotateCw, MapPin, Truck, Store, ArrowLeft } from "lucide-react";
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>(),
    { session } = useAuth();
  return (
    <Detail key={(session?.context?.user_id ?? "guest") + ":" + id} id={id} />
  );
}
function Detail({ id }: { id?: string }) {
  const { confirm, dialog } = useConfirm();
  const location = useLocation(),
    navigate = useNavigate(),
    cache = useQueryClient(),
    candidate = location.state?.ordersReturnTo;
  const returnTo =
    typeof candidate === "string" &&
    (candidate === "/customer/orders" ||
      candidate.startsWith("/customer/orders?"))
      ? candidate
      : "/customer/orders";
  const [data, setData] = useState<OperationOutputs["getOwnOrder"]>(),
    [error, setError] = useState<unknown>(),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [stale, setStale] = useState(false),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState(""),
    [reload, setReload] = useState(0);

  // States for Cancel Modal & Repurchase & In-page Review
  const [repurchasing, setRepurchasing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReasonPreset, setCancelReasonPreset] = useState("Muốn thay đổi địa chỉ nhận hàng");
  const [reviewingItem, setReviewingItem] = useState<NonNullable<OperationOutputs["getOwnOrder"]["items"]>[number] | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewedItemIds, setReviewedItemIds] = useState<Set<string>>(new Set());

  const alive = useRef(true),
    flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(undefined);
    setError(undefined);
    if (!id) {
      setError(new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng."));
      setLoading(false);
      return;
    }
    callOperation("getOwnOrder", { path: { id } })
      .then((v) => {
        if (active) {
          setData(v);
          setStale(false);
          if (v.purchase_group_id) {
            callOperation("getPurchaseGroupOrders", {
              path: { id: v.purchase_group_id },
            }).catch(() => {});
          }
          callOperation("getOrderRefund", { path: { id } }).catch(() => {});
        }
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  useEffect(() => {
    if (location.hash && !loading && data) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.hash, loading, data]);

  const handleRepurchase = async () => {
    if (!data?.items?.length) return;
    setRepurchasing(true);
    let addedCount = 0;
    try {
      for (const item of data.items) {
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
        setNotice("Một số sản phẩm trong đơn đã hết hàng hoặc ngừng kinh doanh.");
      }
    } finally {
      setRepurchasing(false);
    }
  };

  async function performCancel(reasonText: string) {
    if (!id || !data || flight.current || stale) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      const value = await callOperation("cancelOwnOrder", {
        path: { id },
        body: {
          expected_version: data.version,
          ...(reasonText.trim() ? { reason: reasonText.trim() } : {}),
        },
      });
      if (alive.current) {
        setData(value);
        setShowCancelModal(false);
        setNotice("Đã hủy đơn hàng thành công. Khoản hoàn (nếu có) được xử lý riêng.");
      }
    } catch (e) {
      if (alive.current) {
        setError(e);
        if (
          isUncertainMutation(e) ||
          (e instanceof ApiError && e.status === 409)
        )
          setStale(true);
      }
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function cancel(event: FormEvent) {
    event.preventDefault();
    const finalReason = cancelReasonPreset === "Khác"
      ? reason.trim()
      : (reason.trim() ? `${cancelReasonPreset}: ${reason.trim()}` : cancelReasonPreset);
    await performCancel(finalReason);
  }

  const submitItemReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewingItem || !reviewingItem.id || reviewBusy) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      await callOperation("createReview", {
        body: {
          order_item_id: String(reviewingItem.id),
          rating: reviewRating,
          body: reviewBody.trim(),
        },
      });
      setReviewedItemIds((prev) => new Set([...prev, String(reviewingItem.id)]));
      setReviewingItem(null);
      setReviewBody("");
      setReviewRating(5);
      setNotice("Đã gửi đánh giá sản phẩm thành công! Cảm ơn bạn.");
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : "Không thể gửi đánh giá lúc này.");
    } finally {
      setReviewBusy(false);
    }
  };
  const money = (v: number) => v.toLocaleString("vi-VN") + " ₫";
  const canCancel =
    data &&
    ["AWAITING_PAYMENT", "PENDING", "CONFIRMED"].includes(data.status) &&
    data.payment_status !== "UNKNOWN";
  return (
    <section className="boot-card order-detail-page">
      {dialog}

      {/* Shopee-style Top Bar */}
      <div className="order-detail-topbar">
        <Link to={returnTo} className="order-detail-back-link">
          <ArrowLeft size={16} />
          <span>TRỞ LẠI</span>
        </Link>
        <div className="order-detail-topbar-meta">
          <span className="order-detail-id-label">
            MÃ ĐƠN HÀNG: #{id ? id.slice(-8).toUpperCase() : ""}
          </span>
          {data && (
            <>
              <span className="text-slate-300">|</span>
              <span className={`order-status-tag status-${data.status.toLowerCase()}`}>
                {orderStatusLabel(data.status).toUpperCase()}
              </span>
            </>
          )}
          <button
            type="button"
            className="order-detail-refresh-btn"
            title="Làm mới trạng thái đơn"
            disabled={loading || busy}
            onClick={() => setReload((n) => n + 1)}
          >
            <RotateCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {error != null && (
        <ErrorView error={error} onRetry={() => setReload((n) => n + 1)} />
      )}

      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            {/* Step Progress Tracker */}
            <OrderProgressTracker order={data} />

            {/* Warnings or Next Step hints */}
            <OrderNextStep order={data} />

            {/* Logistics & Address Info Card (2 columns on desktop) */}
            <div className="order-detail-info-grid">
              <div className="order-detail-info-card">
                <div className="order-detail-card-header">
                  <MapPin size={16} className="text-[#ee4d2d]" />
                  <h3>Địa Chỉ Nhận Hàng</h3>
                </div>
                <div className="order-detail-address-body">
                  <OrderDeliveryAddress order={data} />
                </div>
              </div>

              <div className="order-detail-info-card">
                <div className="order-detail-card-header">
                  <Truck size={16} className="text-[#0284c7]" />
                  <h3>Thông Tin Vận Chuyển</h3>
                </div>
                <div className="order-detail-shipping-body">
                  {['GHN','PLATFORM'].includes(data.shipping_mode ?? '') ? (
                    <CustomerShippingPanel orderId={data.id} />
                  ) : (
                    <p className="text-xs text-slate-500 mb-2">
                      Đơn hàng được vận chuyển theo hình thức tiêu chuẩn của người bán.
                    </p>
                  )}
                  <OrderTimeline order={data} />
                </div>
              </div>
            </div>

            {/* Order Items with Store Header */}
            <div className="order-detail-items-card">
              <div className="order-history-header">
                <div className="order-header-store-section">
                  <OrderStoreLabel id={data.store_id} compact />
                  <ContactStoreButton storeId={data.store_id} orderId={data.id} compact />
                  <Link
                    to={`/stores/${data.store_id}`}
                    className="order-view-store-link"
                  >
                    <Store size={13} />
                    <span>Xem Shop</span>
                  </Link>
                </div>
              </div>

              <div className="order-detail-items-list">
                {data.items?.length ? (
                  data.items.map((item, i) => (
                    <article key={typeof item.id === "string" ? item.id : i} className="order-detail-item-row">
                      <div className="order-detail-item-identity-wrap">
                        <OrderItemIdentity item={item} />
                      </div>
                      <div className="order-detail-item-action-wrap">
                        {typeof item.product_id === "string" && (
                          <Link to={"/products/" + item.product_id} className="text-xs text-indigo-600 hover:underline">
                            Xem sản phẩm
                          </Link>
                        )}
                        {data.status === "COMPLETED" && typeof item.id === "string" && (
                          reviewedItemIds.has(String(item.id)) ? (
                            <span className="text-xs text-emerald-600 font-semibold px-2 py-1 bg-emerald-50 rounded">
                              ✓ Đã gửi đánh giá
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="ui-button ui-button-secondary text-xs"
                              onClick={() => {
                                setReviewingItem(item);
                                setReviewRating(5);
                                setReviewBody("");
                                setReviewError(null);
                              }}
                            >
                              Viết đánh giá
                            </button>
                          )
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-4">Chưa tải được danh sách sản phẩm.</p>
                )}
              </div>
            </div>

            {/* Shopee-style Bill Summary Card at Bottom */}
            <div className="order-detail-bill-card">
              <div className="order-detail-bill-content">
                <div className="order-bill-row">
                  <span className="order-bill-label">Tổng tiền hàng:</span>
                  <span className="order-bill-value">{money(data.amounts.goods_vnd)}</span>
                </div>
                {data.amounts.store_discount_vnd > 0 && (
                  <div className="order-bill-row text-emerald-700">
                    <span className="order-bill-label">Giảm giá từ Shop:</span>
                    <span className="order-bill-value">-{money(data.amounts.store_discount_vnd)}</span>
                  </div>
                )}
                {data.amounts.platform_discount_vnd > 0 && (
                  <div className="order-bill-row text-emerald-700">
                    <span className="order-bill-label">Giảm giá từ Sàn:</span>
                    <span className="order-bill-value">-{money(data.amounts.platform_discount_vnd)}</span>
                  </div>
                )}
                <div className="order-bill-row">
                  <span className="order-bill-label">Phí vận chuyển:</span>
                  <span className="order-bill-value">{money(data.amounts.shipping_vnd)}</span>
                </div>
                <div className="order-bill-row order-bill-total-row">
                  <span className="order-bill-label font-medium">Tổng thanh toán:</span>
                  <span className="order-total-price-highlight">
                    {money(data.amounts.payable_vnd)}
                  </span>
                </div>
                <div className="order-bill-row order-bill-payment-method">
                  <span className="order-bill-label">Phương thức thanh toán:</span>
                  <span className="order-bill-value text-slate-700">
                    {paymentMethodLabel(data.payment_method)} ({paymentStatusLabel(data.payment_status, data.amounts.payable_vnd)})
                  </span>
                </div>
              </div>
            </div>

            {/* Shopee-style Bottom Sticky / Direct Action Bar */}
            <div className="order-detail-action-footer">
              <div className="order-footer-microcopy">
                {data.refund_status && (
                  <p className="order-microcopy-refund">
                    Lệnh hoàn tiền: {refundStatusLabel(data.refund_status)}
                  </p>
                )}
                {data.status !== "COMPLETED" && (
                  <details className="return-policy-details text-xs text-slate-500 mt-1">
                    <summary className="cursor-pointer hover:underline text-slate-600">Xem chính sách đổi trả đã chốt</summary>
                    <div className="p-2 mt-1 bg-slate-50 border border-slate-200 rounded">
                      <ReturnPolicyNotice policy={data.return_policy_snapshot} />
                    </div>
                  </details>
                )}
              </div>

              <div className="order-footer-actions">
                {canCancel && (
                  <button
                    type="button"
                    className="ui-button ui-button-secondary text-rose-600 border-rose-300 hover:bg-rose-50"
                    disabled={busy || stale}
                    onClick={() => setShowCancelModal(true)}
                  >
                    Hủy đơn hàng
                  </button>
                )}
                {canStartOrderPayment(data) && (
                  <Link
                    to={"/orders/" + data.id + "/pay"}
                    className="ui-button ui-button-primary order-btn-highlight"
                  >
                    Thanh toán ngay
                  </Link>
                )}
                {(data.status === "COMPLETED" || data.status === "CANCELLED") && (
                  <button
                    type="button"
                    className="ui-button ui-button-primary order-btn-highlight"
                    disabled={repurchasing}
                    onClick={handleRepurchase}
                  >
                    {repurchasing ? "Đang thêm giỏ..." : "Mua lại"}
                  </button>
                )}
                {data.status === "COMPLETED" && (
                  <Link to="/customer/reviews" className="ui-button ui-button-secondary">
                    Đánh giá của tôi
                  </Link>
                )}
              </div>
            </div>

            <OwnDeliveryReturn order={data} />
            {stale && (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-3">
                Đơn đã thay đổi hoặc cần đối soát. Bấm Làm mới để kiểm tra trước khi thực hiện tiếp.
              </p>
            )}
            {notice && <p role="status" className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 mt-3">{notice}</p>}
            {data && <OrderReturnsPanel order={data} />}

            {/* Cancel Order Modal */}
            {showCancelModal && (
              <Modal label="Hủy đơn hàng" onClose={() => setShowCancelModal(false)}>
                <header className="modal-section-header">
                  <h2>Hủy đơn hàng #{data.id.slice(-8).toUpperCase()}</h2>
                </header>
                <form onSubmit={cancel} className="space-y-4 my-2">
                  <p className="text-xs text-slate-600">
                    Vui lòng chọn lý do hủy để cửa hàng và sàn nâng cao chất lượng phục vụ:
                  </p>
                  <div className="space-y-2">
                    {[
                      "Muốn thay đổi địa chỉ nhận hàng",
                      "Muốn thay đổi sản phẩm / phân loại",
                      "Tìm thấy giá tốt hơn ở nơi khác",
                      "Đổi ý, không muốn mua nữa",
                      "Khác",
                    ].map((reasonOpt) => (
                      <label key={reasonOpt} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reasonOpt}
                          checked={cancelReasonPreset === reasonOpt}
                          onChange={() => setCancelReasonPreset(reasonOpt)}
                        />
                        <span>{reasonOpt}</span>
                      </label>
                    ))}
                  </div>
                  {cancelReasonPreset === "Khác" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Chi tiết lý do</label>
                      <input
                        className="w-full text-xs p-2 border border-slate-300 rounded"
                        placeholder="Nhập lý do cụ thể..."
                        maxLength={200}
                        value={reason}
                        disabled={busy || stale}
                        onChange={(e) => setReason(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      className="ui-button ui-button-secondary text-xs"
                      onClick={() => setShowCancelModal(false)}
                      disabled={busy}
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="ui-button ui-button-primary bg-rose-600 hover:bg-rose-700 text-xs text-white"
                      disabled={busy || stale}
                    >
                      {busy ? "Đang hủy..." : "Xác nhận hủy đơn"}
                    </button>
                  </div>
                </form>
              </Modal>
            )}

            {/* In-page Review Modal */}
            {reviewingItem && (
              <Modal label="Đánh giá sản phẩm" onClose={() => setReviewingItem(null)}>
                <header className="modal-section-header">
                  <h2>Đánh giá sản phẩm đã mua</h2>
                </header>
                <form onSubmit={submitItemReview} className="space-y-4 my-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <strong className="block text-xs text-slate-800">{String(reviewingItem.title_snapshot ?? "")}</strong>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Chất lượng sản phẩm:</label>
                    <StarPicker
                      value={reviewRating}
                      disabled={reviewBusy}
                      onChange={setReviewRating}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung đánh giá:</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs p-2 border border-slate-300 rounded"
                      placeholder="Hãy chia sẻ trải nghiệm về sản phẩm để giúp người mua khác..."
                      maxLength={2000}
                      value={reviewBody}
                      disabled={reviewBusy}
                      onChange={(e) => setReviewBody(e.target.value)}
                      required
                    />
                  </div>
                  {reviewError && (
                    <p className="text-xs text-rose-600">{reviewError}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      className="ui-button ui-button-secondary text-xs"
                      onClick={() => setReviewingItem(null)}
                      disabled={reviewBusy}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="ui-button ui-button-primary text-xs"
                      disabled={reviewBusy || !reviewBody.trim()}
                    >
                      {reviewBusy ? "Đang gửi..." : "Gửi đánh giá"}
                    </button>
                  </div>
                </form>
              </Modal>
            )}
          </>
        )
      )}
    </section>
  );
}
export default OrderDetailPage;
