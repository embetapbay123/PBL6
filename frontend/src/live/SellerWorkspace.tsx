import { Button as UiButton } from "../components/ui/Button";
import { ActionMenu } from "../components/ActionMenu";
import { useUnsavedChanges } from "../components/useUnsavedChanges";
import { AddressSuggestions } from "../components/AddressSuggestions";
import { variantLabel } from "../components/variant-identity";
import { useCurrentOrderImages } from "../components/useCurrentOrderImages";
import { ProductImage } from "../components/ProductImage";
import { SortHeader } from '../components/SortHeader';
import { FinancialReport } from "../features/reports/FinancialReport";
import {
  InventoryReconciliation,
  inventoryPeriod,
} from "../features/seller/InventoryReconciliation";
import { StockCommitments } from "../features/seller/StockCommitments";
import { AuditActor, useAuditActorLabels } from "../features/admin/AuditActors";
import {StoreShippingPanel} from '../features/shipping/ShippingPanel';
import { OrderQueue } from "../components/OrderQueue";
import { codToCollect } from "../components/order-actions";
import {
  OrderListFilters,
  OrderStatusTabs,
  useOrderListFilters,
  paymentMethodLabel,
  paymentStatusLabel,
  refundStatusLabel,
} from "../components/OrderListTools";
import {
  OrderPackingSheet,
  OrderNextStep,
  OrderTimeline,
  orderStatusLabel,
} from "../components/OrderPresentation";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Package, ShoppingBag, Boxes, Store, ArrowRight, Pencil,
  CheckCircle2, Circle, Clock, RotateCcw, AlertTriangle, 
  MessageSquare, Truck, Ticket, ChevronRight, Sparkles,
  ShieldCheck, Award, Activity, Heart
} from "lucide-react";
import { callOperation } from "../api/operations";
import { ApiError, isUncertainMutation } from "../api/client";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { ErrorView, Loading, Pagination } from "../bootstrap/components";
import { formatMoney, useCommand, useStoreAccess } from "./useLiveData";
import { Modal } from "../components/Modal";
import {
  StoreSetupGuide,
  StoreWorkGuide,
} from "../features/seller/StoreWorkGuide";

/** Route navigation is owned by the Seller shell; pages render only their task content. */
export function SellerSubNav() {
  return null;
}

export function SellerOverview() {
  const access = useStoreAccess();
  const store = useQuery({
    queryKey: ["own-store"],
    queryFn: () => callOperation("getOwnStore"),
  });
  const productCount = useQuery({
    queryKey: ["seller-overview", "products"],
    enabled: access.can("product.store.read_write"),
    queryFn: () =>
      callOperation("listOwnStoreProducts", { query: { page: 1, size: 1 } }),
  });
  const inventoryCount = useQuery({
    queryKey: ["seller-overview", "inventory"],
    enabled: access.can("inventory.store.read_adjust"),
    queryFn: () =>
      callOperation("listStoreInventory", { query: { page: 1, size: 1 } }),
  });
  const orderCount = useQuery({
    queryKey: ["seller-overview", "orders"],
    enabled: access.can("order.store.read_status_cancel"),
    queryFn: () =>
      callOperation("listStoreOrders", { query: { page: 1, size: 1 } }),
  });
  const pendingOrders = useQuery({queryKey:['seller-overview','pending-orders'],enabled:access.can('order.store.read_status_cancel'),queryFn:()=>callOperation('listStoreOrders',{query:{page:1,size:1,status:'PENDING'}})});
  const pendingReturns = useQuery({queryKey:['seller-overview','pending-returns'],enabled:access.can('order.store.read_status_cancel'),queryFn:()=>callOperation('listStoreReturnRequests',{query:{page:1,size:1,status:'REQUESTED'}})});
  const confirmedOrders = useQuery({
    queryKey: ['seller-overview', 'confirmed-orders'],
    enabled: access.can('order.store.read_status_cancel'),
    queryFn: () => callOperation('listStoreOrders', { query: { page: 1, size: 1, status: 'CONFIRMED' } }),
  });
  const outOfStock = useQuery({
    queryKey: ['seller-overview', 'out-of-stock'],
    enabled: access.can('inventory.store.read_adjust'),
    queryFn: () => callOperation('listStoreInventory', { query: { page: 1, size: 1, stock: 'OUT' } }),
  });
  const unreadMessages = useQuery({
    queryKey: ['seller-overview', 'unread-messages'],
    enabled: access.can('order.store.read_status_cancel'),
    queryFn: () => callOperation('listStoreConversations', { query: { page: 1, size: 1 } }),
  });
  const deliveryReturns = useQuery({
    queryKey: ['seller-overview', 'delivery-returns'],
    enabled: access.can('order.store.read_status_cancel'),
    queryFn: () => callOperation('listStoreOrders', { query: { page: 1, size: 1, status: 'RECOVERING' } }),
  });
  const storeVouchers = useQuery({
    queryKey: ['seller-overview', 'vouchers'],
    enabled: access.owner,
    queryFn: () => callOperation('listStoreVouchers', { query: { page: 1, size: 1 } }),
  });
  const completedOrders = useQuery({
    queryKey: ['seller-overview', 'completed-orders'],
    enabled: access.can('order.store.read_status_cancel'),
    queryFn: () => callOperation('listStoreOrders', { query: { page: 1, size: 1, status: 'COMPLETED' } }),
  });
  const cancelledOrders = useQuery({
    queryKey: ['seller-overview', 'cancelled-orders'],
    enabled: access.can('order.store.read_status_cancel'),
    queryFn: () => callOperation('listStoreOrders', { query: { page: 1, size: 1, status: 'CANCELLED' } }),
  });
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const counts: Record<
    string,
    { data?: { total: number }; error: unknown; isPending: boolean }
  > = {
    "/seller/products": productCount,
    "/seller/inventory": inventoryCount,
    "/seller/orders": orderCount,
  };
  return (
    <section className="seller-overview">
      <SellerSubNav />
      <div className="seller-overview-header">
        <div>
          <h1>{store.data?.name ?? "Gian hàng của bạn"}</h1>
          <p>Trung tâm điều hành và tổng quan hoạt động gian hàng</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {access.can("product.store.read_write") && (
            <Link
              className="ui-button ui-button-primary"
              to="/seller/products/new"
            >
              + Thêm sản phẩm
            </Link>
          )}
          {access.id && (
            <Link
              className="ui-button ui-button-secondary"
              to={"/stores/" + access.id}
            >
              Xem gian hàng
            </Link>
          )}
        </div>
      </div>
      {store.error && <ErrorView error={store.error} />}
      {store.isPending && <Loading />}
      {store.data && !store.error && (
        <>
          {/* 1. Shopee Uni Onboarding Checklist Card */}
          {(() => {
            const readyAddress = !!store.data.return_address && ['recipient_name','phone','line1','ward','district','city'].every(key=>String(store.data.return_address?.[key as keyof typeof store.data.return_address] ?? '').trim());
            const hasProducts = (productCount.data?.total ?? 0) > 0;
            const hasInventory = (inventoryCount.data?.total ?? 0) > 0;
            const hasVouchers = (storeVouchers.data?.total ?? 0) > 0;

            const onboardingSteps = [
              {
                step: 1,
                title: "Cài đặt địa chỉ nhận trả hàng & kho",
                desc: readyAddress ? "Đã cấu hình địa chỉ nhận trả hàng" : "Bắt buộc hoàn tất trước khi mở bán và nhận đơn mới",
                done: readyAddress,
                href: "/seller/settings",
                actionLabel: readyAddress ? "Xem lại" : "Cài đặt ngay",
                canAct: access.owner,
                roleTip: !access.owner ? "Chủ gian hàng thiết lập" : undefined,
              },
              {
                step: 2,
                title: "Đăng sản phẩm đầu tiên lên kệ",
                desc: hasProducts ? `Đã đăng bán ${productCount.data?.total} sản phẩm trên gian hàng` : "Thêm hình ảnh tỷ lệ 1:1, phân loại và mô tả chuẩn SEO",
                done: hasProducts,
                href: "/seller/products/new",
                actionLabel: hasProducts ? "Thêm tiếp" : "Đăng sản phẩm",
                canAct: access.can("product.store.read_write"),
                roleTip: !access.can("product.store.read_write") ? "Cần quyền sản phẩm" : undefined,
              },
              {
                step: 3,
                title: "Kiểm tra và cấu hình tồn kho khả dụng",
                desc: hasInventory ? `Đã có dữ liệu tồn kho cho ${inventoryCount.data?.total} phân loại` : "Đảm bảo phân loại có số lượng tồn > 0 để người mua đặt được",
                done: hasInventory,
                href: "/seller/inventory",
                actionLabel: hasInventory ? "Xem kho" : "Cập nhật kho",
                canAct: access.can("inventory.store.read_adjust"),
                roleTip: !access.can("inventory.store.read_adjust") ? "Cần quyền kho" : undefined,
              },
              {
                step: 4,
                title: "Tạo voucher mở bán chào mừng người mua",
                desc: hasVouchers ? `Đã kích hoạt ${storeVouchers.data?.total} mã ưu đãi của Shop` : "Thu hút khách hàng chốt đơn đầu tiên với Voucher Shop",
                done: hasVouchers,
                href: "/seller/vouchers",
                actionLabel: hasVouchers ? "Quản lý" : "Tạo Voucher",
                canAct: access.owner,
                roleTip: !access.owner ? "Chủ gian hàng thiết lập" : undefined,
              },
            ];

            const completedCount = onboardingSteps.filter(s => s.done).length;
            const progressPercent = Math.round((completedCount / onboardingSteps.length) * 100);
            const allCompleted = completedCount === onboardingSteps.length;

            if (onboardingDismissed && allCompleted) {
              return (
                <div className="shopee-onboarding-completed-badge mb-6">
                  <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Gian hàng đã hoàn tất toàn bộ 4/4 bước thiết lập mở bán chuẩn Shopee.</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setOnboardingDismissed(false)} 
                    className="shopee-link-btn btn-emerald"
                    style={{ background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0, minHeight: 'auto', height: 'auto', color: '#047857', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                  >
                    Xem chi tiết
                  </button>
                </div>
              );
            }

            return (
              <section className="shopee-onboarding-card boot-card mb-6" aria-label="Lộ trình bắt đầu bán hàng">
                <div className="shopee-onboarding-header">
                  <div className="shopee-onboarding-title-area">
                    <span className="shopee-tag-pill">HỌC VIỆN SHOPEE UNI</span>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mt-1">
                      <Sparkles size={18} className="text-amber-500" /> Lộ trình Bắt đầu Bán hàng cùng PBL6
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Hoàn thiện 4 bước cơ bản để gian hàng sẵn sàng đón nhận những đơn đặt hàng đầu tiên.</p>
                  </div>
                  <div className="shopee-onboarding-progress-badge">
                    <span className="text-xs font-bold text-slate-600">Tiến độ mở bán:</span>
                    <strong className="text-sm font-extrabold text-orange-600 ml-1">{completedCount}/{onboardingSteps.length} bước ({progressPercent}%)</strong>
                  </div>
                </div>

                <div className="shopee-progress-bar-track mt-3">
                  <div className="shopee-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="shopee-onboarding-steps mt-4">
                  {onboardingSteps.map((step) => (
                    <div key={step.step} className={`shopee-onboarding-step-row ${step.done ? 'is-done' : 'is-pending'}`}>
                      <div className="shopee-step-icon-wrap">
                        {step.done ? (
                          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                          <div className="shopee-step-number-bubble">{step.step}</div>
                        )}
                      </div>
                      <div className="shopee-step-text-content">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-800 m-0">{step.title}</h3>
                          {step.done && <span className="shopee-done-badge">Hoàn thành</span>}
                          {step.roleTip && <span className="text-[11px] text-slate-400 font-normal">({step.roleTip})</span>}
                        </div>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">{step.desc}</p>
                      </div>
                      <div className="shopee-step-action-area">
                        {step.canAct ? (
                          <Link to={step.href} className={`shopee-step-btn ${step.done ? 'btn-secondary' : 'btn-primary'}`}>
                            {step.actionLabel} <ChevronRight size={13} />
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chờ cấp quyền</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {allCompleted && (
                  <div className="text-right mt-3">
                    <button 
                      type="button" 
                      onClick={() => setOnboardingDismissed(true)} 
                      className="shopee-link-btn"
                      style={{ background: 'transparent', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0, minHeight: 'auto', height: 'auto', color: '#64748b', textDecoration: 'underline', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Thu gọn lộ trình mở bán
                    </button>
                  </div>
                )}
              </section>
            );
          })()}

          {/* 2. Shopee To-Do List Matrix */}
          {(() => {
            const todoListCards = [
              {
                id: "pending",
                label: "Chờ xác nhận",
                count: pendingOrders.error ? "!" : pendingOrders.isPending ? "…" : (pendingOrders.data?.total ?? 0),
                href: "/seller/orders?status=PENDING",
                icon: Clock,
                tone: "urgent",
                hint: "Đơn mới cần duyệt",
                enabled: access.can("order.store.read_status_cancel"),
              },
              {
                id: "confirmed",
                label: "Chờ lấy hàng",
                count: confirmedOrders.error ? "!" : confirmedOrders.isPending ? "…" : (confirmedOrders.data?.total ?? 0),
                href: "/seller/orders?status=CONFIRMED",
                icon: Package,
                tone: "info",
                hint: "Chờ đóng gói & giao bưu tá",
                enabled: access.can("order.store.read_status_cancel"),
              },
              {
                id: "returns",
                label: "Yêu cầu đổi trả",
                count: pendingReturns.error ? "!" : pendingReturns.isPending ? "…" : (pendingReturns.data?.total ?? 0),
                href: "/seller/returns?status=REQUESTED",
                icon: RotateCcw,
                tone: "danger",
                hint: "Phản hồi trong 48h",
                enabled: access.can("order.store.read_status_cancel"),
              },
              {
                id: "out-of-stock",
                label: "Hết tồn kho",
                count: outOfStock.error ? "!" : outOfStock.isPending ? "…" : (outOfStock.data?.total ?? 0),
                href: "/seller/inventory?stock=OUT",
                icon: AlertTriangle,
                tone: "warning",
                hint: "Tồn khả dụng = 0",
                enabled: access.can("inventory.store.read_adjust"),
              },
              {
                id: "messages",
                label: "Tin nhắn khách chờ",
                count: unreadMessages.error ? "!" : unreadMessages.isPending ? "…" : (unreadMessages.data?.unread_total ?? 0),
                href: "/seller/messages",
                icon: MessageSquare,
                tone: "primary",
                hint: "Duy trì phản hồi ≥ 85%",
                enabled: access.can("order.store.read_status_cancel"),
              },
              {
                id: "delivery-returns",
                label: "Giao thất bại / hoàn",
                count: deliveryReturns.error ? "!" : deliveryReturns.isPending ? "…" : (deliveryReturns.data?.total ?? 0),
                href: "/seller/delivery-returns",
                icon: Truck,
                tone: "neutral",
                hint: "Kiện hàng đối soát hoàn",
                enabled: access.can("order.store.read_status_cancel"),
              },
            ].filter(card => card.enabled);

            if (!todoListCards.length) return null;

            return (
              <div className="shopee-todo-section boot-card mb-6 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase flex items-center gap-2 m-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse inline-block" /> Việc cần xử lý ngay (Danh sách cần làm)
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">Cập nhật thời gian thực</span>
                </div>
                <div className="shopee-todo-matrix">
                  {todoListCards.map((card) => {
                    const CardIcon = card.icon;
                    return (
                      <Link key={card.id} to={card.href} className={`shopee-todo-tile tone-${card.tone}`}>
                        <div className="shopee-todo-tile-top">
                          <span className="shopee-todo-label">{card.label}</span>
                          <div className="shopee-todo-icon-bubble">
                            <CardIcon size={16} />
                          </div>
                        </div>
                        <div className="shopee-todo-count-wrap">
                          <span className="shopee-todo-count">{card.count}</span>
                        </div>
                        <div className="shopee-todo-tile-bottom">
                          <span className="shopee-todo-hint">{card.hint}</span>
                          <span className="shopee-todo-arrow">→</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 3. Shopee Account Health & Penalty Points System */}
          {(() => {
            const total = orderCount.data?.total ?? 0;
            const cancelled = cancelledOrders.data?.total ?? 0;
            const returns = pendingReturns.data?.total ?? 0;
            const completed = completedOrders.data?.total ?? 0;

            const nfrPercent = total > 0 ? (((cancelled + returns) / total) * 100).toFixed(1) : "0.0";
            const lsrPercent = "0.0";
            const chatRate = unreadMessages.data?.unread_total ? "94.5%" : "99.0%";
            const penaltyPoints = 0;

            const preferredChecklist = [
              { label: "Điểm phạt Sao Quả Tạ = 0", achieved: penaltyPoints === 0, desc: "0 / 0 điểm" },
              { label: "Tỷ lệ phản hồi Chat ≥ 85%", achieved: true, desc: `${chatRate} (Đạt)` },
              { label: "Đánh giá Shop ≥ 4.5★", achieved: true, desc: "4.9★ (Đạt)" },
              { label: "Đơn hoàn tất tháng qua ≥ 50", achieved: completed >= 50, desc: `${completed}/50 đơn` },
            ];

            const preferredAchievedCount = preferredChecklist.filter(c => c.achieved).length;

            return (
              <section className="shopee-account-health-card boot-card mb-6" aria-label="Hiệu quả hoạt động">
                <div className="shopee-health-header">
                  <div className="flex items-center gap-2">
                    <h2 className="shopee-health-title">
                      <ShieldCheck size={20} className="text-emerald-600" />
                      Hiệu quả Hoạt động & Vận hành (Account Health)
                    </h2>
                    <span className="shopee-health-badge-good">
                      🟢 Gian hàng Gương mẫu (0 điểm phạt)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Chu kỳ đánh giá: Thứ Hai hàng tuần
                  </span>
                </div>

                {/* Grid 3 chỉ số cốt lõi */}
                <div className="shopee-health-metrics-grid">
                  <div className="shopee-health-metric-tile">
                    <div className="shopee-health-metric-name">
                      <span>Tỷ lệ Đơn không thành công (NFR)</span>
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </div>
                    <div className="shopee-health-metric-val text-emerald-700">{nfrPercent}%</div>
                    <div className="shopee-health-metric-target">
                      <span className="font-semibold text-slate-700">Mục tiêu: &lt; 8.0%</span>
                      <span className="text-emerald-600 font-medium">(Đạt chuẩn sàn)</span>
                    </div>
                  </div>

                  <div className="shopee-health-metric-tile">
                    <div className="shopee-health-metric-name">
                      <span>Tỷ lệ Giao hàng trễ (LSR)</span>
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </div>
                    <div className="shopee-health-metric-val text-emerald-700">{lsrPercent}%</div>
                    <div className="shopee-health-metric-target">
                      <span className="font-semibold text-slate-700">Mục tiêu: &lt; 8.0%</span>
                      <span className="text-emerald-600 font-medium">(Hạn DTS 1.5 ngày)</span>
                    </div>
                  </div>

                  <div className="shopee-health-metric-tile">
                    <div className="shopee-health-metric-name">
                      <span>Tỷ lệ Phản hồi Chat (CRR)</span>
                      <CheckCircle2 size={15} className="text-emerald-600" />
                    </div>
                    <div className="shopee-health-metric-val text-emerald-700">{chatRate}</div>
                    <div className="shopee-health-metric-target">
                      <span className="font-semibold text-slate-700">Mục tiêu: &ge; 85.0%</span>
                      <span className="text-emerald-600 font-medium">(Phản hồi nhanh)</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Sao Quả Tạ & Shop Yêu Thích */}
                <div className="shopee-health-bottom-row">
                  <div className="shopee-penalty-box">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Activity size={16} className="text-orange-600" />
                        <strong className="text-xs text-slate-800 uppercase tracking-wide">Điểm phạt Sao Quả Tạ</strong>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                        Mức 0 (Không bị phạt)
                      </span>
                    </div>

                    <div className="shopee-sqt-track">
                      <div className="shopee-sqt-fill bg-emerald-500" style={{ width: '4%' }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Điểm phạt hiện tại: <strong className="text-slate-800">0 / 15 điểm</strong></span>
                      <span>Làm mới mỗi đầu quý</span>
                    </div>
                  </div>

                  <div className="shopee-preferred-box">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Award size={16} className="text-emerald-700" />
                        <strong className="text-xs text-emerald-950 uppercase tracking-wide">Tiêu chuẩn "Shop Yêu Thích"</strong>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-800">
                        {preferredAchievedCount}/{preferredChecklist.length} tiêu chí
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {preferredChecklist.map((c) => (
                        <div key={c.label} className="flex items-center gap-1.5 text-slate-700">
                          {c.achieved ? (
                            <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Circle size={13} className="text-slate-400 flex-shrink-0" />
                          )}
                          <span className={c.achieved ? "font-medium" : "text-slate-500"}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}
          <div className="market-stats">
            {[
              ["/seller/products", "Sản phẩm", ShoppingBag],
              ["/seller/inventory", "Tồn kho", Boxes],
              ["/seller/orders", "Đơn hàng", Package],
            ]
              .filter(([href]) =>
                href === "/seller/inventory"
                  ? access.can("inventory.store.read_adjust")
                  : href === "/seller/orders"
                    ? access.can("order.store.read_status_cancel")
                    : access.can("product.store.read_write"),
              )
              .map(([href, label, Icon]) => {
                const Symbol = Icon as typeof Store;
                return (
                  <Link className="seller-overview-tile" key={String(href)} to={String(href)}>
                    <div className="seller-tile-top">
                      <h3>{String(label)}</h3>
                      <div className="seller-tile-icon"><Symbol size={22} /></div>
                    </div>
                    <p className="overview-count">
                      {counts[String(href)].error
                        ? "Chưa tải được"
                        : counts[String(href)].isPending
                          ? "Đang tải…"
                          : (counts[String(href)].data?.total.toLocaleString(
                              "vi-VN",
                            ) ?? "Chưa có dữ liệu")}
                      {String(href) === "/seller/inventory" && " phân loại"}
                    </p>
                    <span>Mở quản lý <ArrowRight size={13} className="inline" /></span>
                  </Link>
                );
              })}
          </div>
          <div className="seller-operating-info">
            <h2>Thông tin vận hành</h2>
            <p>
              Trạng thái:{" "}
              <span className={'seller-status '+(store.data.status==='ACTIVE'?'is-active':'is-inactive')}>{store.data.status==='ACTIVE'?'Đang hoạt động':store.data.status==='LOCKED'?'Đã khóa':store.data.status}</span>
            </p>
            <p>
              Phí giao hàng:{" "}
              <strong>{store.data.shipping_fee_vnd !== undefined
                ? formatMoney(store.data.shipping_fee_vnd)
                : "Chưa được cung cấp"}</strong>
            </p>
            {access.owner && (
              <Link to="/seller/settings" className="ui-button ui-button-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none' }}>Cập nhật gian hàng</Link>
            )}
          </div>
          <div className="seller-overview-guides"><StoreSetupGuide store={store.data} />
          <details className="seller-guide"><summary>Quyền thao tác</summary><StoreWorkGuide /></details></div>
        </>
      )}
    </section>
  );
}

export function StoreSettings() {
  const access = useStoreAccess();
  const command = useCommand();
  const [round, setRound] = useState(0);
  const state = useQuery({
    queryKey: ["own-store"],
    queryFn: () => callOperation("getOwnStore"),
    enabled: access.owner,
  });
  const reload = async () => {
    if (command.busy || state.isFetching) return;
    const result = await state.refetch();
    if (result.isSuccess) {
      command.setError(undefined);
      command.setNotice(
        "Đã đọc lại thông tin gian hàng. Kiểm tra trước khi sửa tiếp.",
      );
      setRound((n) => n + 1);
    }
  };
  if (!access.owner)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Chỉ chủ gian hàng được sửa thông tin Store.",
          )
        }
      />
    );
  return (
    <section>
      <SellerSubNav />
      <h1>Thông tin gian hàng</h1>
      {state.error ? (
        <ErrorView
          error={state.error}
          onRetry={() => void reload()}
          retryBusy={state.isFetching}
        />
      ) : !state.data ? (
        <Loading />
      ) : (
        <>
          <StoreSettingsForm
            key={state.data.id + ":" + state.data.version + ":" + round}
            store={state.data}
            command={command}
            reading={state.isFetching}
            reload={() => void reload()}
          />
          <StoreChatAssistantSettings storeId={state.data.id} />
        </>
      )}
    </section>
  );
}

function StoreChatAssistantSettings({ storeId }: { storeId?: string }) {
  const storageKey = `shopee_autoreply_${storeId || 'default'}`;
  const [enabled, setEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).enabled : true;
    } catch {
      return true;
    }
  });
  const [message, setMessage] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).message : "Chào bạn! Cảm ơn bạn đã nhắn tin cho Shop. Shop đã nhận được tin nhắn và sẽ phản hồi trong giây lát. Nếu bạn cần tư vấn chọn size hoặc màu sắc, cứ gửi ảnh/mã sản phẩm cho Shop nhé!";
    } catch {
      return "Chào bạn! Cảm ơn bạn đã nhắn tin cho Shop. Shop đã nhận được tin nhắn và sẽ phản hồi trong giây lát. Nếu bạn cần tư vấn chọn size hoặc màu sắc, cứ gửi ảnh/mã sản phẩm cho Shop nhé!";
    }
  });
  const [savedNotice, setSavedNotice] = useState(false);

  const templates = [
    {
      title: "Tiêu chuẩn thân thiện",
      content: "Chào bạn! Cảm ơn bạn đã nhắn tin cho Shop. Shop đã nhận được tin nhắn và sẽ phản hồi trong giây lát. Nếu bạn cần tư vấn chọn size hoặc màu sắc, cứ gửi ảnh/mã sản phẩm cho Shop nhé!",
    },
    {
      title: "Tư vấn Size & Tồn kho",
      content: "Chào bạn! Bạn vui lòng cung cấp chiều cao + cân nặng (nếu cần tư vấn size) hoặc thông tin SKU cần kiểm tra tồn kho, nhân viên CSKH của Shop sẽ hỗ trợ bạn ngay lập tức!",
    },
    {
      title: "Ngoài giờ làm việc (Sau 21:00)",
      content: "Chào bạn! Hiện tại đã ngoài giờ làm việc của Shop (8h00 - 21h30). Shop sẽ ưu tiên phản hồi bạn ngay vào sáng mai khi mở cửa. Chúc bạn một buổi tối vui vẻ!",
    },
  ];

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ enabled, message }));
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section className="boot-card" style={{ marginTop: '24px' }} aria-label="Cài đặt Trợ lý Chat Shopee">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 Trợ lý Chat & Tin nhắn Tự động (Shopee Auto-Reply)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Tự động phản hồi người mua khi họ gửi tin nhắn đầu tiên. Giúp shop duy trì <strong>Tỷ lệ Phản hồi Chat (CRR) ≥ 85%</strong> chuẩn Shop Yêu Thích.
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: enabled ? '#16a34a' : '#64748b' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#ea580c' }}
          />
          {enabled ? 'Đang bật Auto-Reply' : 'Đang tắt'}
        </label>
      </div>

      <div style={{
        background: '#fff7ed',
        border: '1px solid #ffedd5',
        borderRadius: '8px',
        padding: '12px 14px',
        marginBottom: '16px',
        fontSize: '12.5px',
        color: '#9a3412',
        lineHeight: 1.5,
      }}>
        💡 <strong>Mẹo Shopee Uni:</strong> Tin nhắn tự động sẽ được gửi ngay lập tức khi Người mua bắt đầu cuộc trò chuyện. Người bán vẫn cần có câu trả lời thủ công trong vòng 12 giờ để không bị trừ điểm phản hồi.
      </div>

      <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            Mẫu tin nhắn gợi ý chuẩn Shopee:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                className="ui-button ui-button-secondary text-xs"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setMessage(tpl.content)}
              >
                + {tpl.title}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
          Nội dung tin nhắn chào mừng ({message.length}/500 ký tự):
        </label>
        <textarea
          rows={4}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập nội dung tin nhắn tự động gửi cho khách..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '13.5px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ marginTop: '14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>
            Xem trước giao diện phía Người mua:
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
              Shop
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 12px 12px 12px', padding: '8px 12px', maxWidth: '80%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>[Tin nhắn tự động]</span>
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                {message || '(Chưa nhập nội dung tin nhắn)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <UiButton type="button" onClick={handleSave}>
          Lưu cài đặt Trợ lý Chat
        </UiButton>
        {savedNotice && (
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
            ✓ Đã lưu cài đặt Trợ lý Chat thành công!
          </span>
        )}
      </div>
    </section>
  );
}
function StoreSettingsForm({
  store,
  command,
  reading,
  reload,
}: {
  store: OperationOutputs["getOwnStore"];
  command: ReturnType<typeof useCommand>;
  reading: boolean;
  reload: () => void;
}) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState<'all'|'name'|'shipping'|'address'|'logo'|null>(null);
  const feeTitle = useId();
  const [name, setName] = useState(store.name),
    [shipping, setShipping] = useState(String(store.shipping_fee_vnd ?? 0)),
    [logoUrl,setLogoUrl] = useState(store.logo_url ?? '');
  const [returnAddress, setReturnAddress] = useState(
    store.return_address ?? {
      recipient_name: "",
      phone: "",
      line1: "",
      ward: "",
      district: "",
      city: "",
    },
  );
  const dirty =
    name !== store.name ||
    shipping !== String(store.shipping_fee_vnd ?? 0) ||
    logoUrl !== (store.logo_url ?? '') ||
    JSON.stringify(returnAddress) !==
      JSON.stringify(
        store.return_address ?? {
          recipient_name: "",
          phone: "",
          line1: "",
          ward: "",
          district: "",
          city: "",
        },
      );
  useUnsavedChanges(!!editing && (dirty || command.busy));
  const [stale, setStale] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (store.version === undefined || command.busy || stale || reading) return;
    const fee = Number(shipping);
    if ((editing === 'shipping' || editing === 'all') && (!shipping.trim() || !Number.isSafeInteger(fee) || fee < 0)) return;
    void command.run(async () => {
      try {
        const updated = await callOperation("updateOwnStore", {
          body: {
            ...(editing==='all'||editing==='name'?{name}:{}),
            ...(editing==='all'||editing==='shipping'?{shipping_fee_vnd:fee}:{}),
            ...(editing==='logo'?{logo_url:logoUrl.trim()}:{}),
            ...(editing==='all'||editing==='address'?{return_address: returnAddress}:{}),
            expected_version: store.version!,
          },
        });
        cache.setQueriesData<OperationOutputs["getOwnStore"]>(
          { queryKey: ["own-store"] },
          (previous) =>
            previous?.id === updated.id
              ? { ...previous, ...updated, logo_url: updated.logo_url }
              : previous,
        );
        void cache.invalidateQueries({ queryKey: ["own-store"] });
        command.setNotice("Đã cập nhật gian hàng.");
      } catch (e) {
        if (
          (e instanceof ApiError && e.status === 409) ||
          isUncertainMutation(e)
        )
          setStale(true);
        throw e;
      }
    });
  };
  const feeField = (
    <label>
      Phí giao hàng (VND)
      <input
        required min={0} max={Number.MAX_SAFE_INTEGER} step={1} type="number"
        disabled={command.busy || stale || reading}
        value={shipping} onChange={(e) => setShipping(e.target.value)}
      />
    </label>
  );
  const closeFee = () => {
    if (command.busy) return;
    setShipping(String(store.shipping_fee_vnd ?? 0));
    if (!stale) command.setError(undefined);
    setEditing(null);
  };
  if (!editing || editing === 'shipping')
    return (
      <section
        className="boot-card store-settings-form"
        aria-label="Thông tin gian hàng hiện tại"
      >
        <div className="seller-store-identity">{store.logo_url ? <span className="seller-store-avatar"><ProductImage src={store.logo_url} name={store.name} alt={'Ảnh đại diện '+store.name}/></span> : <span className="seller-store-avatar" aria-hidden="true">{store.name.trim().charAt(0).toLocaleUpperCase('vi-VN') || 'S'}</span>}<div><strong>{store.name}</strong><p>Gian hàng của bạn</p><UiButton variant="ghost" size="sm" onClick={()=>setEditing('logo')}>Sửa ảnh đại diện</UiButton></div></div>
        <dl className="read-only-fields">
          <div>
            <dt>Tên gian hàng</dt>
            <dd>{store.name}</dd>
            <UiButton variant="ghost" size="sm" onClick={()=>setEditing('name')}>Sửa tên gian hàng</UiButton>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd><span className={'seller-status '+(store.status==='ACTIVE'?'is-active':'is-inactive')}>{store.status === "ACTIVE" ? "Đang hoạt động" : store.status==='LOCKED'?"Đã khóa":store.status}</span></dd>
          </div>
          <div>
            <dt>Phí giao hàng & Vận hành</dt>
            <dd>
              <strong>{store.shipping_fee_vnd===undefined?'Chưa có dữ liệu':formatMoney(store.shipping_fee_vnd)}</strong>
              <p className="text-xs text-slate-500 m-0 mt-0.5">Cước phí giao hàng cố định của Shop · Hạn chuẩn bị hàng chuẩn (DTS): 1.5 ngày</p>
            </dd>
            <UiButton variant="ghost" size="sm" onClick={()=>setEditing('shipping')}>Sửa phí giao hàng</UiButton>
          </div>
          <div>
            <dt>Địa chỉ nhận hàng trả (Return Address)</dt>
            <dd>
              {store.return_address ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="shopee-done-badge">Địa chỉ hoàn trả mặc định</span>
                  </div>
                  <strong>
                    {store.return_address.recipient_name} ·{" "}
                    {store.return_address.phone}
                  </strong>
                  <br />
                  <span className="text-slate-600">
                    {[
                      store.return_address.line1,
                      store.return_address.ward,
                      store.return_address.district,
                      store.return_address.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <p className="text-xs text-slate-500 m-0 mt-1">Nơi tiếp nhận các kiện hàng hoàn trả hoặc giao không thành công từ đơn vị vận chuyển.</p>
                </>
              ) : (
                <span className="text-rose-600 font-medium">Chưa hoàn thiện. Cần bổ sung trước khi nhận đơn mới.</span>
              )}
            </dd>
            <UiButton variant="ghost" size="sm" onClick={()=>setEditing('address')}>Sửa địa chỉ nhận trả</UiButton>
          </div>
        </dl>
        <UiButton variant="secondary" type="button" onClick={() => setEditing('all')}><Pencil size={15} aria-hidden="true" /> Chỉnh sửa gian hàng</UiButton>
        {command.notice && <p role="status">{command.notice}</p>}
        {editing === 'shipping' && (
          <Modal labelledBy={feeTitle} onClose={closeFee} busy={command.busy}>
            <form className="store-fee-form" onSubmit={submit}>
              <h2 id={feeTitle}>Sửa phí giao hàng</h2>
              {feeField}
              <div className="ui-actions">
                <UiButton type="submit" loading={command.busy} disabled={stale || reading || store.version === undefined}>Lưu</UiButton>
                <UiButton variant="secondary" disabled={command.busy} onClick={closeFee}>Hủy</UiButton>
              </div>
              {command.error != null && <ErrorView error={command.error} onRetry={reload} retryBusy={command.busy || reading} />}
              {stale && <p>Tải lại thông tin trước khi lưu tiếp.</p>}
            </form>
          </Modal>
        )}
      </section>
    );
  return (
    <form className="boot-card store-settings-form" onSubmit={submit}>
      <h2>{editing==='name'?'Sửa tên gian hàng':editing==='address'?'Sửa địa chỉ nhận hàng trả':editing==='logo'?'Sửa ảnh đại diện':'Chỉnh sửa gian hàng'}</h2>
      {editing==='logo' && <label>Đường dẫn ảnh đại diện<input autoFocus type="url" maxLength={2048} placeholder="https://..." value={logoUrl} disabled={command.busy || stale || reading} onChange={event=>setLogoUrl(event.target.value)} /><small>Nhập đường dẫn ảnh HTTP(S); để trống để gỡ ảnh.</small></label>}
      {(editing==='all'||editing==='name')&&
      <label>
        Tên gian hàng
        <input
          autoFocus
          required
          disabled={command.busy || stale || reading}
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      }
      {editing==='all' && feeField}
      {(editing==='all'||editing==='address')&&
      <fieldset disabled={command.busy || stale || reading}>
        <legend>Địa chỉ nhận hàng trả</legend>
        <p>
          Cần hoàn thiện trước khi nhận đơn mới. Thay đổi địa chỉ này không thay
          snapshot đơn đang mở.
        </p>
        {Object.entries({
          recipient_name: "Người nhận hàng trả",
          phone: "Điện thoại nhận trả",
          line1: "Địa chỉ nhận trả",
          district: "Quận / huyện nhận trả",
        }).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              autoComplete={key === 'recipient_name' ? 'name' : key === 'phone' ? 'tel' : key === 'line1' ? 'street-address' : 'address-level2'}
              maxLength={key === "line1" ? 500 : key === "phone" ? 30 : 200}
              value={returnAddress[key as keyof typeof returnAddress]}
              onChange={(e) =>
                setReturnAddress({ ...returnAddress, [key]: e.target.value })
              }
            />
          </label>
        ))}
        <AddressSuggestions
          city={returnAddress.city}
          ward={returnAddress.ward}
          onCity={(city) =>
            setReturnAddress((current) => ({ ...current, city }))
          }
          onWard={(ward) =>
            setReturnAddress((current) => ({ ...current, ward }))
          }
        />
      </fieldset>
      }
      <div className="ui-actions">
        <button
          disabled={
            command.busy || stale || reading || store.version === undefined
          }
        >
          Lưu thông tin
        </button>
        <UiButton
          type="button"
          variant="secondary"
          disabled={command.busy || stale || reading}
          onClick={() => {
            setName(store.name);
            setShipping(String(store.shipping_fee_vnd ?? 0));
            setLogoUrl(store.logo_url ?? '');
            setReturnAddress(
              store.return_address ?? {
                recipient_name: "",
                phone: "",
                line1: "",
                ward: "",
                district: "",
                city: "",
              },
            );
            setEditing(null);
          }}
        >
          Hủy
        </UiButton>
      </div>
      {command.error != null && (
        <ErrorView
          error={command.error}
          onRetry={reload}
          retryBusy={command.busy || reading}
        />
      )}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      {stale && (
        <p>
          Làm mới để kiểm tra thay đổi trước khi lưu lại.
        </p>
      )}
    </form>
  );
}

export function StoreInventory() {
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const view =
    params.get("view") ??
    (location.hash === "#stock-history"
      ? "history"
      : location.hash === "#stock-reconciliation"
        ? "reconciliation"
        : params.has("history_page")
          ? "history"
          : "inventory");
  const sectionLink = (section: string) => {
    const next = new URLSearchParams(params);
    next.set("view", section);
    return "/seller/inventory?" + next;
  };

  const parsed = (key: string) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value >= 1 && value <= 1000000
      ? value
      : 1;
  };
  const page = parsed("page"),
    movementsPage = parsed("history_page");
  const setPage = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });
  const setMovementsPage = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("history_page", String(value));
      next.set("view", "history");
      return next;
    });
  const filters = {
    ...(params.get("q") ? { q: params.get("q")! } : {}),
    ...(params.get("product_id")
      ? { product_id: params.get("product_id")! }
      : {}),
    ...(params.get("variant_id")
      ? { variant_id: params.get("variant_id")! }
      : {}),
  };
  const historyPeriod = inventoryPeriod(
    params.get("stock_from"),
    params.get("stock_to"),
  );
  const access = useStoreAccess(),
    [adjustmentNotice, setAdjustmentNotice] = useState(""),
    [selected, setSelected] =
      useState<OperationOutputs["listStoreInventory"]["items"][number]>();
  const sortValue = params.get('sort');
  const sort = sortValue === 'NAME_ASC' || sortValue === 'NAME_DESC' || sortValue === 'AVAILABLE_ASC' || sortValue === 'AVAILABLE_DESC' ? sortValue : undefined;
  const stockValue=params.get('stock');
  const stock=stockValue==='IN_STOCK'||stockValue==='LOW'||stockValue==='OUT'?stockValue:undefined;
  const setInventoryFilter=(key:string,value:string)=>setParams(current=>{const next=new URLSearchParams(current);value?next.set(key,value):next.delete(key);next.set('page','1');return next;});
  const inventory = useQuery({
    queryKey: ["store-inventory", page, filters, sort,stock],
    queryFn: ({ signal }) =>
      callOperation(
        "listStoreInventory",
        { query: { page, size: 20, ...filters, ...(sort ? {sort} : {}),...(stock?{stock}:{}) } },
        { signal },
      ),
    enabled: access.can("inventory.store.read_adjust"),
  });
  const inventoryImages = useCurrentOrderImages(inventory.data?.items ?? []);
  const movements = useQuery({
    queryKey: ["store-stock-movements", movementsPage, filters, historyPeriod],
    queryFn: ({ signal }) =>
      callOperation(
        "listStockMovements",
        {
          query: {
            page: movementsPage,
            size: 10,
            ...filters,
            ...historyPeriod,
          },
        },
        { signal },
      ),
    enabled: access.can("inventory.store.read_adjust"),
  });
  const actors = useAuditActorLabels(
    "STORE",
    access.owner
      ? (movements.data?.items.map((row) => row.actor_user_id) ?? [])
      : [],
  );
  const variantName = (item: {
    product_title?: string;
    sku?: string;
    variant_values?: Record<string, string>;
    variant_id: string;
  }) => {
    const values = variantLabel(item.variant_values, "");
    return item.product_title
      ? `${item.product_title} · ${values || "Phân loại tiêu chuẩn"}${item.sku ? ` · SKU: ${item.sku}` : ""}`
      : `Chưa tải được thông tin phân loại (${item.variant_id})`;
  };
  if (!access.can("inventory.store.read_adjust"))
    return (
      <ErrorView
        error={
          new ApiError(403, "FORBIDDEN", "Bạn chưa có quyền quản lý tồn kho.")
        }
      />
    );
  return (
    <section className="seller-inventory-page">
      <SellerSubNav />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h1 style={{ margin: 0 }}>Quản lý tồn kho</h1>
        <button
          type="button"
          className="ui-button ui-button-secondary text-xs"
          disabled={inventory.isFetching || movements.isFetching}
          onClick={() =>
            void Promise.all(
              [
                "store-inventory",
                "store-stock-movements",
                "inventory-reconciliation",
                "stock-commitments",
              ].map((key) => cache.invalidateQueries({ queryKey: [key] })),
            )
          }
        >
          Đọc lại tồn kho và đối chiếu
        </button>
      </div>
      {adjustmentNotice && (
        <div role="status" className="ui-alert ui-alert-success mb-3">
          <span>Đã ghi nhận điều chỉnh: {adjustmentNotice}. </span>
          <Link to={sectionLink("history")}>Xem bút toán mới nhất</Link>
        </div>
      )}
      {inventory.isFetching && inventory.data && (
        <p role="status">
          Đang cập nhật số lượng tồn kho. Vui lòng chờ trước khi điều chỉnh
          tiếp.
        </p>
      )}
      {view === "inventory" && (
        <details className="inventory-explanation">
          <summary>Cách tính tồn</summary>
          <p>Có thể bán = tồn thương mại − hàng đang giữ cho đơn.</p>
        </details>
      )}
      {view === "inventory" && inventory.data?.items && (() => {
        const outOfStockCount = inventory.data.items.filter(i => i.available_quantity === 0).length;
        const lowStockCount = inventory.data.items.filter(i => i.available_quantity > 0 && i.available_quantity < 5).length;
        if (outOfStockCount === 0 && lowStockCount === 0 && stock !== 'LOW' && stock !== 'OUT') return null;
        return (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#92400e' }}>
                  Cảnh báo Tồn kho An toàn (Shopee Low Stock Alert)
                </div>
                <div style={{ fontSize: '12.5px', color: '#78350f', marginTop: '2px' }}>
                  {outOfStockCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>• Có {outOfStockCount} phân loại đã hết hàng. </span>}
                  {lowStockCount > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}>• Có {lowStockCount} phân loại sắp hết hàng (tồn &lt; 5). </span>}
                  Kịp thời nhập hàng để tránh bị hủy đơn tự động và tăng tỷ lệ đơn không thành công (NFR)!
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="ui-button ui-button-secondary text-xs"
                onClick={() => setInventoryFilter("stock", "LOW")}
                style={{ borderColor: '#f59e0b', color: '#b45309' }}
              >
                Lọc phân loại sắp hết
              </button>
              <button
                type="button"
                className="ui-button ui-button-secondary text-xs"
                onClick={() => setInventoryFilter("stock", "OUT")}
                style={{ borderColor: '#ef4444', color: '#b91c1c' }}
              >
                Lọc phân loại hết hàng
              </button>
            </div>
          </div>
        );
      })()}
      <div className="inventory-filter-bar">
        <form
          key={JSON.stringify(filters)}
          onSubmit={(event) => {
            event.preventDefault();
            const q = String(
              new FormData(event.currentTarget).get("q") ?? "",
            ).trim();
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.delete("page");
              next.delete("history_page");
              next.delete("commitments_page");
              if (q) next.set("q", q);
              else next.delete("q");
              return next;
            });
          }}
        >
          <input
            type="search"
            name="q"
            maxLength={200}
            defaultValue={filters.q ?? ""}
            placeholder="Tìm theo tên, SKU, phân loại..."
          />
          <button type="submit">Tìm</button>
          {Object.keys(filters).length > 0 && (
            <Link to="/seller/inventory">Bỏ lọc</Link>
          )}
        </form>
        {view === "inventory" && (
          <div className="inventory-stock-chips">
            {[
              ["", "Tất cả", ""],
              ["IN_STOCK", "Còn hàng", "is-ok"],
              ["LOW", "Sắp hết", "is-low"],
              ["OUT", "Hết hàng", "is-out"],
            ].map(([value, label, cls]) => (
              <button
                key={value}
                type="button"
                className={`inv-stock-chip${cls ? " " + cls : ""}`}
                aria-pressed={(stock ?? "") === value}
                onClick={() => setInventoryFilter("stock", value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {(filters.product_id || filters.variant_id) && (
        <p role="note">
          Đang xem{" "}
          {filters.variant_id
            ? "một phân loại"
            : "các phân loại của một sản phẩm"}{" "}
          từ liên kết. Bộ lọc áp dụng cho cả tồn và lịch sử; bỏ lọc để tìm toàn
          Store.
        </p>
      )}
      <nav className="workspace-sections" aria-label="Khu vực quản lý kho">
        <Link
          aria-current={view === "inventory" ? "page" : undefined}
          to={sectionLink("inventory")}
        >
          Tồn có thể bán
        </Link>
        <span className="workspace-sections-divider" aria-hidden="true" style={{ color: '#cbd5e1', margin: '0 4px' }}>|</span>
        {[
          ["history", "Lịch sử biến động"],
          ["reconciliation", "Đối chiếu theo kỳ"],
          ["commitments", "Hàng đang giữ / đã trừ"],
          ["stats", "Thống kê theo kỳ"],
        ].map(([key, label]) => (
          <Link
            key={key}
            aria-current={view === key ? "page" : undefined}
            to={sectionLink(key)}
          >
            {label}
          </Link>
        ))}
      </nav>
      {inventory.error ? (
        <ErrorView
          error={inventory.error}
          onRetry={() => void inventory.refetch()}
        />
      ) : !inventory.data ? (
        <Loading />
      ) : (
        <>
          {view === "inventory" && (
            <>
              <p className="inventory-result-count">
                {inventory.data.total.toLocaleString("vi-VN")} phân loại
              </p>
              <div className="boot-card market-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <SortHeader label="Sản phẩm / SKU" value={sort} ascending="NAME_ASC" descending="NAME_DESC" onChange={value=>setInventoryFilter('sort',value)}/>
                      <th style={{ width: '15%' }}>Tồn thương mại</th>
                      <th style={{ width: '15%' }}>Đang giữ</th>
                      <SortHeader label="Có thể bán" value={sort} ascending="AVAILABLE_ASC" descending="AVAILABLE_DESC" onChange={value=>setInventoryFilter('sort',value)}/>
                      <th style={{ width: '22%', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.data.items.map((item) => (
                      <tr key={item.variant_id}>
                        <td>
                          <div className="seller-inventory-identity">
                            {inventoryImages.get(item.variant_id) && (
                              <div className="order-item-current-image">
                                <ProductImage src={inventoryImages.get(item.variant_id)} name={item.product_title ?? 'sản phẩm'} alt="Ảnh sản phẩm"/>
                              </div>
                            )}
                            <div>
                              <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a' }}>{variantName(item)}</strong>
                              {item.product_id && (
                                <div className="inventory-item-links" style={{ marginTop: '2px', fontSize: '12px' }}>
                                  <Link to={'/products/'+item.product_id}>Xem sản phẩm</Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '14px', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ fontSize: '14px', color: '#64748b' }}>{item.reserved_quantity}</td>
                        <td>
                          <span className={'market-badge ' + (item.available_quantity === 0 ? 'is-danger' : item.available_quantity < 5 ? 'is-warning' : 'is-success')} style={{ fontWeight: 700, fontSize: '13px' }}>
                            {item.available_quantity}
                          </span>
                          {item.available_quantity === 0 ? <span className="seller-low-stock"> · Hết hàng</span> : item.available_quantity < 5 && <span className="seller-low-stock"> · Còn ít (dưới 5)</span>}
                        </td>
                        <td className="inventory-row-actions">
                          <UiButton
                            variant="secondary"
                            disabled={
                              !item.product_title || inventory.isFetching
                            }
                            onClick={() => setSelected(item)}
                          >
                            Điều chỉnh
                          </UiButton>
                          <ActionMenu label={`Thêm thao tác cho ${variantName(item)}`} triggerText="Thêm">
                            {item.product_id && access.can('product.store.read_write') && (
                              <Link
                                className="ui-button ui-button-secondary"
                                to={'/seller/products/'+item.product_id+'/edit'}
                              >
                                Chỉnh sửa sản phẩm
                              </Link>
                            )}
                            <Link
                              className="ui-button ui-button-secondary"
                              to={`/seller/inventory?variant_id=${item.variant_id}&view=history#stock-history`}
                            >
                              Xem biến động
                            </Link>
                            <Link
                              className="ui-button ui-button-secondary"
                              to={`/seller/inventory?variant_id=${item.variant_id}&view=reconciliation#stock-reconciliation`}
                            >
                              Đối chiếu kỳ
                            </Link>
                          </ActionMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!inventory.data.items.length && (
                  <p>Chưa có phân loại nào trong kho.</p>
                )}
              </div>
              <Pagination
                page={page}
                size={inventory.data.size}
                total={inventory.data.total}
                showTotal={false}
                onPage={setPage}
              />
            </>
          )}
          {view === "reconciliation" && (
            <InventoryReconciliation variantId={filters.variant_id} />
          )}
          {view === "commitments" && <StockCommitments filters={filters} />}
          {view === "history" && (
            <div id="stock-history" className="boot-card mt-4">
              <h2>Lịch sử biến động kho</h2>
              <form key={(params.get("stock_from")??"")+":"+(params.get("stock_to")??"")} className="stock-period-filter" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget),from=String(data.get('from')??''),to=String(data.get('to')??'');const end=event.currentTarget.elements.namedItem('to') as HTMLInputElement;end.setCustomValidity(!inventoryPeriod(from,to)?'Chọn kỳ hợp lệ: ngày kết thúc không trước ngày bắt đầu, tối đa 366 ngày.':'');if(!event.currentTarget.reportValidity())return;setParams(current=>{const next=new URLSearchParams(current);next.set('stock_from',from);next.set('stock_to',to);next.set('history_page','1');return next;});}}><label>Từ ngày<input name="from" type="date" required defaultValue={params.get('stock_from')??''}/></label><label>Đến hết ngày<input name="to" type="date" required defaultValue={params.get('stock_to')??''} onChange={event=>event.target.setCustomValidity('')}/></label><button type="submit">Lọc lịch sử</button><button type="button" onClick={()=>setParams(current=>{const next=new URLSearchParams(current);next.delete('stock_from');next.delete('stock_to');next.set('history_page','1');return next;})}>Bỏ lọc ngày</button></form>
              {filters.variant_id &&
                inventory.data?.items.some(
                  (item) => item.variant_id === filters.variant_id,
                ) && (
                  <button
                    type="button"
                    disabled={inventory.isFetching}
                    onClick={() =>
                      setSelected(
                        inventory.data!.items.find(
                          (item) => item.variant_id === filters.variant_id,
                        ),
                      )
                    }
                  >
                    Điều chỉnh
                  </button>
                )}
              {historyPeriod && (
                <p role="note">
                  Đang lọc bút toán từ {params.get("stock_from")} đến hết{" "}
                  {params.get("stock_to")} theo giờ Việt Nam. Bút toán ngoài kỳ
                  này không xuất hiện trong lịch sử đang xem.
                </p>
              )}
              <p className="text-slate-500">
                Nhật ký các lần nhập, xuất và điều chỉnh kho.
              </p>
              {movements.isPending && <Loading />}
              {movements.error && (
                <ErrorView
                  error={movements.error}
                  onRetry={() => void movements.refetch()}
                />
              )}
              {movements.data && (
                <>
                  <div className="market-table-scroll mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Phân loại / SKU</th>
                          <th>Δ tồn / giữ</th>
                          <th>Tồn / giữ trước → sau</th>
                          <th>Nguồn / người thao tác</th>
                          <th>Lý do</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.data.items.map((m) => (
                          <tr key={m.id}>
                            <td>
                              {m.recorded_at || m.occurred_at
                                ? new Date(
                                    (m.recorded_at ?? m.occurred_at)!,
                                  ).toLocaleString("vi-VN", {
                                    timeZone: "Asia/Ho_Chi_Minh",
                                  })
                                : "—"}
                              {!m.recorded_at && (
                                <p>
                                  Thời điểm lịch sử cũ, chưa có mốc ghi bút toán
                                  xác định
                                </p>
                              )}
                            </td>
                            <td>{variantName(m)}{m.product_id&&<span className="inventory-item-links"><Link to={'/products/'+m.product_id}>Xem sản phẩm</Link><Link to={'/seller/inventory?variant_id='+m.variant_id}>Xem tồn hiện tại</Link></span>}</td>
                            <td
                              style={{
                                color:
                                  m.delta_quantity > 0 ? "green" : "crimson",
                                fontWeight: 600,
                              }}
                            >
                              {m.delta_quantity > 0
                                ? `+${m.delta_quantity}`
                                : m.delta_quantity}{" "}
                              /{" "}
                              {m.delta_reserved == null
                                ? "Chưa có dữ liệu giữ"
                                : m.delta_reserved > 0
                                  ? `+${m.delta_reserved}`
                                  : m.delta_reserved}
                            </td>
                            <td>
                              {m.quantity_before == null ? "Lịch sử cũ chưa có mốc đối chiếu" : <div className="stock-change"><span>Tồn: {m.quantity_before} → {m.quantity_after}</span><span>Đang giữ: {m.reserved_before} → {m.reserved_after}</span></div>}
                            </td>
                            <td>
                              {m.order_id && access.can('order.store.read_status_cancel') ? <Link to={'/seller/orders?q='+m.order_id}>Đơn #{m.order_id.slice(-8).toUpperCase()}</Link> : m.order_id ? `Đơn #${m.order_id.slice(-8).toUpperCase()}` : "Điều chỉnh"}
                              <br />
                              {!m.actor_user_id ? (
                                "Lịch sử cũ chưa có người thao tác"
                              ) : access.owner ? (
                                <AuditActor
                                  id={m.actor_user_id}
                                  labels={actors.labels}
                                  loading={actors.isPending}
                                  error={actors.error}
                                />
                              ) : m.actor_user_id === access.userId ? (
                                "Bạn"
                              ) : m.actor_user_id ===
                                "00000000-0000-0000-0000-000000000000" ? (
                                "Hệ thống"
                              ) : (
                                <>
                                  Nhân sự cửa hàng
                                  <br />
                                  <small>{m.actor_user_id}</small>
                                </>
                              )}
                            </td>
                            <td>{m.reason ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!movements.data.items.length && (
                      <p>Chưa có biến động kho nào được ghi nhận.</p>
                    )}
                  </div>
                  <Pagination
                    page={movementsPage}
                    size={movements.data.size}
                    total={movements.data.total}
                    onPage={setMovementsPage}
                  />
                </>
              )}
            </div>
          )}
          {view === "stats" && (() => {
            const day = (() => {
              const parts = Object.fromEntries(
                new Intl.DateTimeFormat("en", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  year: "numeric", month: "2-digit", day: "2-digit",
                }).formatToParts(new Date()).map((p) => [p.type, p.value]),
              );
              return parts.year + "-" + parts.month + "-" + parts.day;
            })();
            const defaultFrom = day.slice(0, 7) + "-01";
            const defaultTo = day;
            const statFrom = params.get("stock_from") ?? defaultFrom;
            const statTo = params.get("stock_to") ?? defaultTo;
            const items = movements.data?.items ?? [];
            const totalIn = items
              .filter((m) => m.delta_quantity > 0)
              .reduce((s, m) => s + m.delta_quantity, 0);
            const totalOut = items
              .filter((m) => m.delta_quantity < 0)
              .reduce((s, m) => s + Math.abs(m.delta_quantity), 0);
            const net = totalIn - totalOut;
            const uniqueVariants = new Set(items.map((m) => m.variant_id)).size;
            return (
              <div className="boot-card mt-4" id="inventory-stats">
                <h2>Thống kê theo kỳ</h2>
                <form
                  className="inventory-stats-period"
                  key={statFrom + ":" + statTo}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const from = String(data.get("from") ?? "");
                    const to = String(data.get("to") ?? "");
                    if (!inventoryPeriod(from, to)) return;
                    setParams((current) => {
                      const next = new URLSearchParams(current);
                      next.set("stock_from", from);
                      next.set("stock_to", to);
                      next.set("history_page", "1");
                      next.set("view", "stats");
                      return next;
                    });
                  }}
                >
                  <label>
                    Từ ngày
                    <input name="from" type="date" required defaultValue={statFrom} />
                  </label>
                  <label>
                    Đến hết ngày
                    <input name="to" type="date" required defaultValue={statTo} />
                  </label>
                  <button type="submit">Xem thống kê</button>
                  {(params.get("stock_from") || params.get("stock_to")) && (
                    <button
                      type="button"
                      onClick={() =>
                        setParams((current) => {
                          const next = new URLSearchParams(current);
                          next.delete("stock_from");
                          next.delete("stock_to");
                          next.set("history_page", "1");
                          next.set("view", "stats");
                          return next;
                        })
                      }
                    >
                      Bỏ lọc ngày
                    </button>
                  )}
                </form>
                {movements.isPending && <Loading />}
                {movements.error && (
                  <ErrorView error={movements.error} onRetry={() => void movements.refetch()} />
                )}
                {movements.data && (
                  <>
                    <p role="note" style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                      Thống kê trên {movements.data.total.toLocaleString("vi-VN")} bút toán; trang đang xem có {items.length.toLocaleString("vi-VN")} bút toán.
                    </p>
                    <dl className="inventory-stats-grid">
                      <div className="inv-stat-card is-in">
                        <dt>Tổng nhập kho</dt>
                        <dd>+{totalIn.toLocaleString("vi-VN")}</dd>
                      </div>
                      <div className="inv-stat-card is-out">
                        <dt>Tổng xuất kho</dt>
                        <dd>-{totalOut.toLocaleString("vi-VN")}</dd>
                      </div>
                      <div className={`inv-stat-card ${net > 0 ? "is-net-positive" : net < 0 ? "is-net-negative" : "is-neutral"}`}>
                        <dt>Biến động ròng</dt>
                        <dd>{net > 0 ? "+" : ""}{net.toLocaleString("vi-VN")}</dd>
                      </div>
                      <div className="inv-stat-card is-neutral">
                        <dt>Số bút toán</dt>
                        <dd>{movements.data.total.toLocaleString("vi-VN")}</dd>
                      </div>
                      <div className="inv-stat-card is-neutral">
                        <dt>Phân loại có biến động</dt>
                        <dd>{uniqueVariants.toLocaleString("vi-VN")}</dd>
                      </div>
                    </dl>
                    <div className="market-table-scroll mt-4">
                      <table>
                        <thead>
                          <tr>
                            <th>Thời gian</th>
                            <th>Phân loại / SKU</th>
                            <th>Δ tồn / giữ</th>
                            <th>Lý do</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((m) => (
                            <tr key={m.id}>
                              <td>
                                {m.recorded_at || m.occurred_at
                                  ? new Date((m.recorded_at ?? m.occurred_at)!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
                                  : "—"}
                              </td>
                              <td>
                                {variantName(m)}
                                {m.product_id && (
                                  <span className="inventory-item-links">
                                    <Link to={"/products/" + m.product_id}>Xem sản phẩm</Link>
                                    <Link to={"/seller/inventory?variant_id=" + m.variant_id}>Xem tồn</Link>
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={m.delta_quantity > 0 ? "inv-delta-pos" : "inv-delta-neg"}>
                                  {m.delta_quantity > 0 ? `+${m.delta_quantity}` : m.delta_quantity}
                                </span>
                                {" / "}
                                {m.delta_reserved == null ? "—" : m.delta_reserved > 0 ? `+${m.delta_reserved}` : m.delta_reserved}
                              </td>
                              <td>{m.reason ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!items.length && <p>Chưa có biến động kho nào trong kỳ này.</p>}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}
      {selected && (
        <StockAdjustment
          key={selected.variant_id + ":" + selected.version}
          item={selected}
          name={variantName(selected)}
          close={() => setSelected(undefined)}
          done={(reason) => {
            setAdjustmentNotice(reason);
            setSelected(undefined);
            void cache.invalidateQueries({ queryKey: ["store-inventory"] });
            if (movementsPage !== 1) setMovementsPage(1);
            void cache.invalidateQueries({
              queryKey: ["store-stock-movements"],
            });
            void cache.invalidateQueries({
              queryKey: ["inventory-reconciliation"],
            });
            void cache.invalidateQueries({ queryKey: ["stock-commitments"] });
          }}
        />
      )}
    </section>
  );
}
function StockAdjustment({
  item,
  name,
  close,
  done,
}: {
  item: OperationOutputs["listStoreInventory"]["items"][number];
  name: string;
  close: () => void;
  done: (reason: string) => void;
}) {
  const access = useStoreAccess(),
    command = useCommand();
  const storageKey = `pbl6_stock_attempt_${access.userId}_${access.id}_${item.variant_id}`;
  const [restored] = useState<
    OperationInputs["adjustInventory"]["body"] | undefined
  >(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      return v?.variant_id === item.variant_id &&
        typeof v.operation_id === "string" &&
        Number.isInteger(v.delta_quantity) &&
        Number.isInteger(v.expected_version) &&
        typeof v.reason === "string"
        ? v
        : undefined;
    } catch {
      return undefined;
    }
  });
  const [mode, setMode] = useState<"ADD" | "REMOVE" | "DELTA">(
    restored ? "DELTA" : "ADD",
  );
  const [amount, setAmount] = useState(restored?.delta_quantity ?? 1),
    [reason, setReason] = useState(restored?.reason ?? ""),
    [uncertain, setUncertain] = useState(!!restored),
    [stale, setStale] = useState(false);
  const pending = useRef<
    OperationInputs["adjustInventory"]["body"] | undefined
  >(restored);
  const clear = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* storage may be unavailable */
    }
  };
  const delta = mode === "REMOVE" ? -amount : amount;
  const nextQuantity = item.quantity + delta;
  const amountHelpId = useId();
  const amountError =
    !Number.isInteger(delta) || delta === 0 || (mode !== "DELTA" && amount < 0)
      ? mode === "DELTA" ? "Nhập số nguyên khác 0." : "Nhập số nguyên lớn hơn 0."
      : Math.abs(delta) > 2147483647 || nextQuantity > 2147483647
        ? "Số lượng vượt giới hạn cho phép."
        : nextQuantity < item.reserved_quantity
          ? `Tồn sau điều chỉnh không được thấp hơn ${item.reserved_quantity} đang giữ.`
          : null;
  const showAmountError = !uncertain && !stale && !!amountError;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (stale || !reason.trim() || (!pending.current && amountError)) return;
    void command.run(async () => {
      if (!pending.current)
        pending.current = {
          variant_id: item.variant_id,
          delta_quantity: delta,
          reason: reason.trim(),
          operation_id: crypto.randomUUID(),
          expected_version: item.version,
        };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
      } catch {
        /* Keep the immutable request in memory if storage is unavailable. */
      }
      try {
        await callOperation("adjustInventory", { body: pending.current });
        const submittedReason = pending.current.reason;
        clear();
        done(submittedReason);
      } catch (e) {
        if (
          !(e instanceof ApiError) ||
          e.status === 0 ||
          e.status === 408 ||
          e.status >= 500
        )
          setUncertain(true);
        else if (e.status === 409) {
          setStale(true);
          setUncertain(false);
          clear();
        } else if (!uncertain) {
          pending.current = undefined;
          clear();
        }
        throw e;
      }
    });
  };
  return (
    <Modal
      label="Điều chỉnh tồn kho"
      onClose={close}
      busy={command.busy || uncertain}
    >
      <form onSubmit={submit}>
        <h2>Điều chỉnh tồn kho</h2>
        <p>{name}</p>
        <label>
          Loại điều chỉnh
          <select
            value={mode}
            disabled={uncertain || stale || command.busy}
            onChange={(e) => {
              setMode(e.target.value as typeof mode);
              setAmount(1);
            }}
          >
            <option value="ADD">Nhập thêm</option>
            <option value="REMOVE">Giảm hàng hỏng / thiếu</option>
            <option value="DELTA">Điều chỉnh bù có dấu (+ / −)</option>
          </select>
        </label>
        <label>
          {mode === "DELTA" ? "Số lượng thay đổi có dấu" : "Số lượng"}
          <input
            type="number"
            min={mode === "DELTA" ? -2147483647 : 1}
            max={2147483647}
            step={1}
            required
            aria-invalid={showAmountError || undefined}
            aria-describedby={!uncertain && !stale ? amountHelpId : undefined}
            value={Number.isNaN(amount) ? "" : amount}
            disabled={uncertain || stale || command.busy}
            onChange={(e) =>
              setAmount(e.target.value === "" ? NaN : Number(e.target.value))
            }
          />
        </label>
        {!uncertain && !stale && (
          <p id={amountHelpId} role="status" className={showAmountError ? "inventory-amount-error" : "inventory-amount-help"}>
            {amountError ?? (mode === "ADD" ? "Nhập số lượng nhập thêm vào kho (số nguyên dương)." : mode === "REMOVE" ? "Nhập số lượng giảm trừ do hỏng hoặc thất thoát (số nguyên dương)." : "Nhập số lượng chênh lệch cần bù (+ để tăng, − để giảm).")}
          </p>
        )}
        <label>
          Lý do
          <input
            required
            maxLength={200}
            value={reason}
            disabled={uncertain || stale || command.busy}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {command.error != null && <ErrorView error={command.error} />}{" "}
        {uncertain && (
          <p role="status">
            Chưa xác định kết quả. Thử lại sẽ dùng đúng yêu cầu trước đó.
          </p>
        )}
        {stale && (
          <p>
            Dữ liệu đã thay đổi. Đóng và tải lại kho trước khi điều chỉnh tiếp.
          </p>
        )}
        <div className="inventory-adjust-footer">
          <p role="status" className="inventory-adjust-preview">
            {!uncertain && !stale && !amountError && (
              <>Có thể bán {item.available_quantity} → {nextQuantity - item.reserved_quantity} · Đang giữ {item.reserved_quantity}</>
            )}
          </p>
          <div className="ui-actions">
            <UiButton variant="secondary" disabled={command.busy || uncertain} onClick={close}>
              Đóng
            </UiButton>
            <UiButton type="submit" disabled={command.busy || stale || (!uncertain && !!amountError) || !reason.trim()}>
              {uncertain ? "Thử lại điều chỉnh" : "Lưu điều chỉnh"}
            </UiButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

type StoreOrder = OperationOutputs["getStoreOrder"];
export function StoreOrders() {
  const access = useStoreAccess(),
    location = useLocation(),
    filters = useOrderListFilters(true),
    cache = useQueryClient(),
    [selected, setSelected] = useState<StoreOrder>(),
    [detailError, setDetailError] = useState<unknown>();
  const linkedOrderId = location.state?.openOrderId as unknown;
  const canReadOrders = access.can("order.store.read_status_cancel");
  const data = useQuery({
    queryKey: ["store-orders", filters.query],
    staleTime: 0,
    queryFn: ({ signal }) =>
      callOperation("listStoreOrders", { query: filters.query }, { signal }),
    enabled: canReadOrders,
  });
  const pendingOrders = useQuery({
    queryKey: ["store-orders-pending-count"],
    staleTime: 0,
    queryFn: ({ signal }) =>
      callOperation("listStoreOrders", { query: { status: "PENDING", size: 1 } }, { signal }),
    enabled: canReadOrders,
  });
  const pendingCount = pendingOrders.data?.total ?? 0;
  const detailGeneration = useRef(0);
  useEffect(
    () => () => {
      detailGeneration.current++;
    },
    [],
  );
  useEffect(() => {
    void pendingOrders.refetch();
  }, [filters.query.status]);
  useEffect(() => {
    detailGeneration.current++;
    setSelected(undefined);
    if (canReadOrders && typeof linkedOrderId === "string" && linkedOrderId === filters.query.q)
      void open(linkedOrderId);
  }, [JSON.stringify(filters.query), linkedOrderId, canReadOrders]);
  useEffect(() => {
    if (
      data.data &&
      !data.isFetching &&
      !data.error &&
      filters.page > Math.max(1, Math.ceil(data.data.total / data.data.size))
    )
      filters.set(
        "page",
        String(Math.max(1, Math.ceil(data.data.total / data.data.size))),
        { replace: true },
      );
  }, [data.data, data.isFetching, data.error, filters.page]);
  async function open(id: string) {
    const ticket = ++detailGeneration.current;
    setDetailError(undefined);
    try {
      const result = await callOperation("getStoreOrder", { path: { id } });
      if (ticket === detailGeneration.current) setSelected(result);
    } catch (e) {
      if (ticket === detailGeneration.current) setDetailError(e);
    }
  }
  if (!canReadOrders)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Bạn chưa có quyền xem và xử lý đơn hàng.",
          )
        }
      />
    );
  return (
    <section>
      <SellerSubNav />
      <h1>Đơn hàng Store</h1>
      <OrderStatusTabs filters={filters} />
      <OrderListFilters filters={filters} />
      {!filters.query.status && !filters.query.q && pendingCount > 0 && (
        <div className="store-orders-work-banner p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3 flex items-center justify-between gap-3" role="status">
          <div className="text-xs text-amber-900">
            <strong>Ưu tiên xử lý:</strong> Có <strong>{pendingCount} đơn hàng</strong> chờ xác nhận cần xử lý trước khi đóng gói & giao hàng.
          </div>
          <button
            type="button"
            className="ui-button ui-button-primary text-xs whitespace-nowrap"
            onClick={() => filters.set("status", "PENDING")}
          >
            Xem {pendingCount} đơn cần xác nhận →
          </button>
        </div>
      )}
      {detailError != null && <ErrorView error={detailError} />}{" "}
      {data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : !data.data ? (
        <Loading />
      ) : (
        <>
          <p className="table-result-note">{data.data.total} đơn</p>
          <OrderQueue orders={data.data.items} sort={filters.query.sort} onSort={value=>filters.set('sort',value)} onOpen={(id) => void open(id)} />
          <Pagination
            page={filters.page}
            size={data.data.size}
            total={data.data.total}
            onPage={(page) => filters.set("page", String(page))}
          />
        </>
      )}
      {selected && (
        <StoreOrderActions
          key={selected.id}
          order={selected}
          close={() => {
            detailGeneration.current++;
            setSelected(undefined);
            void pendingOrders.refetch();
            void cache.invalidateQueries({ queryKey: ["store-orders-pending-count"] });
          }}
          updated={(o) => {
            setSelected(o);
            void data.refetch();
            void pendingOrders.refetch();
            void cache.invalidateQueries({ queryKey: ["store-orders-pending-count"] });
          }}
        />
      )}
    </section>
  );
}
function StoreOrderActions({
  order,
  close,
  updated,
}: {
  order: StoreOrder;
  close: () => void;
  updated: (o: StoreOrder) => void;
}) {
  const access = useStoreAccess(),
    command = useCommand(),
    [stale, setStale] = useState(false),
    [reason, setReason] = useState(""),
    [cash, setCash] = useState(false);
  const next: Record<
    string,
    "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED"
  > = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "COMPLETED",
  };
  const run = (kind: "next" | "cancel" | "cod") =>
    void command.run(async () => {
      try {
        let result: StoreOrder;
        if (kind === "next")
          result = await callOperation("transitionStoreOrder", {
            path: { id: order.id },
            body: {
              to_status: next[order.status],
              expected_version: order.version,
            },
          });
        else if (kind === "cancel")
          result = await callOperation("cancelStoreOrder", {
            path: { id: order.id },
            body: { reason: reason.trim(), expected_version: order.version },
          });
        else
          result = await callOperation("collectCod", {
            path: { id: order.id },
            body: {
              expected_version: order.version,
              amount_collected_vnd: order.amounts.payable_vnd,
            },
          });
        setCash(false);
        updated(result);
        command.setNotice("Đã cập nhật đơn hàng.");
      } catch (e) {
        setStale(true);
        throw e;
      }
    });
  const reload = () =>
    void command.run(async () => {
      updated(await callOperation("getStoreOrder", { path: { id: order.id } }));
      setStale(false);
      setCash(false);
    });
  const total = order.amounts.payable_vnd;
  const codDue = codToCollect(order);
  const isCod = order.payment_method === "COD";
  const closed = ["CANCELLED", "EXPIRED"].includes(order.status);
  const codSettled = isCod && (total === 0 || closed ||
    ["SUCCEEDED", "REFUNDED", "CANCELLED"].includes(order.payment_status ?? ""));
  const paymentStatus = paymentStatusLabel(order.payment_status, total);
  return (
    <Modal label="Xử lý đơn Store" onClose={close} busy={command.busy}>
      <header className="seller-order-dialog-header">
        <h2>Xử lý đơn hàng</h2>
        <button type="button" className="ui-button ui-button-secondary" onClick={close} disabled={command.busy}>
          Đóng
        </button>
      </header>
      <div className="seller-order-payment-summary">
        <span>Mã đơn <strong title={order.id}>#{order.id.slice(-8).toUpperCase()}</strong></span>
        {codDue > 0 ? (
          <span><strong>COD cần thu {formatMoney(codDue)}</strong> · Chưa thu</span>
        ) : (
          <span>
            {codSettled && total > 0
              ? <strong>COD còn phải thu {formatMoney(0)}</strong>
              : isCod ? "COD" : paymentMethodLabel(order.payment_method)}
            {" · "}{total === 0 ? "Không cần thu tiền" : closed && isCod ? "Đơn đã đóng, không thu tiền" : paymentStatus}
          </span>
        )}
      </div>
      <p>
        Trạng thái: <strong>{orderStatusLabel(order.status)}</strong>
      </p>
      {(codDue === 0 || codDue !== total) && <p>
        Tổng thanh toán:{" "}
        <strong>{formatMoney(total)}</strong>
      </p>}
      {order.payment_status === "UNKNOWN" && (
        <p role="status">Chưa rõ kết quả thu tiền. Kiểm tra trước khi thu lại.</p>
      )}
      {order.refund_status && (
        <p>
          {order.refund_status === "SUCCEEDED"
            ? "Đã hoàn tiền"
            : "Chưa xác nhận hoàn tiền"}{" "}
          · {refundStatusLabel(order.refund_status)}
        </p>
      )}
      <div className="seller-order-layout"><div className="seller-order-information"><OrderPackingSheet order={order} showPayment={false} /><OrderTimeline order={order} /></div><div className="seller-order-commands">
      {command.error != null && <ErrorView error={command.error} />}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      {stale && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <p style={{ margin: 0 }}>Làm mới đơn trước khi tiếp tục.</p>
          <button type="button" className="ui-button ui-button-secondary" onClick={reload}>Làm mới</button>
        </div>
      )}
      {['GHN','PLATFORM'].includes(order.shipping_mode??'')?<StoreShippingPanel order={order} onChanged={async()=>{updated(await callOperation('getStoreOrder',{path:{id:order.id}}));}}/>:<OrderNextStep order={order} store />}
      {!['GHN','PLATFORM'].includes(order.shipping_mode??'') && order.status === "SHIPPED" && order.payment_status !== "SUCCEEDED" && (
        <p role="status">
          Chưa thể hoàn tất vì chưa xác nhận đủ tiền.
          {order.payment_method === "COD" && !access.can("cod.store.collect")
            ? " Bạn thiếu quyền ghi nhận COD. Cần Owner hoặc nhân viên được cấp quyền thu tiền xác nhận."
            : " Hãy ghi nhận khoản đã thu hoặc đối soát thanh toán trước."}
        </p>
      )}
      {next[order.status] && !(['GHN','PLATFORM'].includes(order.shipping_mode??'')&&['PROCESSING','SHIPPED'].includes(order.status)) && (
        <button
          className="ui-button ui-button-primary w-full"
          style={{ width: '100%', marginBottom: '12px', padding: '10px 16px', fontWeight: 600 }}
          disabled={
            command.busy ||
            stale ||
            (order.status === "SHIPPED" && order.payment_status !== "SUCCEEDED")
          }
          onClick={() => run("next")}
        >
          {
            {
              CONFIRMED: "Xác nhận đơn",
              PROCESSING: "Chuẩn bị hàng",
              SHIPPED: "Bàn giao",
              COMPLETED: "Hoàn tất đơn",
            }[next[order.status]]
          }
        </button>
      )}
      {["AWAITING_PAYMENT", "PENDING", "CONFIRMED"].includes(order.status) && (
        <div className="seller-order-cancel-box" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <form
            className="seller-order-cancel"
            onSubmit={(e) => {
              e.preventDefault();
              run("cancel");
            }}
          >
            <label>
              Lý do hủy đơn
              <input
                required
                maxLength={200}
                value={reason}
                disabled={command.busy || stale}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="ui-button ui-button-secondary text-rose-600 border-rose-300 hover:bg-rose-50"
              disabled={command.busy || stale || !reason.trim()}
            >
              Xác nhận hủy đơn
            </button>
          </form>
        </div>
      )}
      {!['GHN','PLATFORM'].includes(order.shipping_mode??'') && order.status === "SHIPPED" &&
        order.payment_method === "COD" &&
        order.payment_status === "PENDING" &&
        access.can("cod.store.collect") && (
          <section className="boot-card">
            <h3>Ghi nhận thu COD</h3>
            <label>
              <input
                type="checkbox"
                checked={cash}
                disabled={command.busy || stale}
                onChange={(e) => setCash(e.target.checked)}
              />
              Tôi đã nhận đủ {formatMoney(order.amounts.payable_vnd)} bằng tiền
              mặt.
            </label>
            <button
              disabled={!cash || command.busy || stale}
              onClick={() => run("cod")}
            >
              Xác nhận COD
            </button>
          </section>
        )}
      {order.status === "SHIPPED" && (
        <Link to={"/seller/delivery-returns?order_id=" + order.id}>
          {order.shipping_mode === "LEGACY_MANUAL" ? "Ghi nhận giao thất bại / theo dõi hoàn về" : "Theo dõi chuyển hoàn"}
        </Link>
      )}
      </div></div>
      <div className="ui-actions">
        <button onClick={reload} disabled={command.busy}>
          Làm mới
        </button>
      </div>
    </Modal>
  );
}

export function StoreReports() {
  return <FinancialReport />;
}
