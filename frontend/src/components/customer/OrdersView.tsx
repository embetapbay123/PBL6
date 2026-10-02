import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderItem } from '../../types';
import {
  Package,
  Store,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  RotateCcw,
  Star,
  ExternalLink
} from 'lucide-react';

interface OrdersViewProps {
  onPayOrder: (order: Order) => void;
  onReviewItem: (orderItem: OrderItem, order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onPayOrder, onReviewItem }) => {
  const { orders, cancelOrder, currentUser, refunds } = useApp();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Filter orders for current user
  const userOrders = orders.filter(
    o => currentUser.activeRole === 'CUSTOMER' ? o.customerId === currentUser.id : true
  );

  const filteredOrders = userOrders.filter(o => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'AWAITING_PAYMENT') return o.paymentStatus === 'AWAITING_PAYMENT';
    if (activeFilter === 'PROCESSING') return ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.orderStatus);
    if (activeFilter === 'SHIPPED') return o.orderStatus === 'SHIPPED';
    if (activeFilter === 'COMPLETED') return o.orderStatus === 'COMPLETED';
    if (activeFilter === 'CANCELLED') return o.orderStatus === 'CANCELLED';
    return true;
  });

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCancel = (order: Order) => {
    const reason = prompt('Vui lòng nhập lý do hủy đơn hàng:');
    if (reason && reason.trim()) {
      cancelOrder(order.id, reason.trim());
      alert('Đã hủy đơn hàng thành công! Kho giữ đã được giải phóng và hoàn tiền mock (nếu trả trước).');
    }
  };

  // Helper for status badge
  const renderOrderStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      AWAITING_PAYMENT: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Chờ Thanh Toán' },
      PENDING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Chờ Gian Hàng Xác Nhận' },
      CONFIRMED: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Đã Xác Nhận' },
      PROCESSING: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Đang Chuẩn Bị Hàng' },
      SHIPPED: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Đang Giao Hàng' },
      COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Hoàn Tất' },
      CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Đã Hủy' }
    };
    const c = map[status] || { bg: 'bg-slate-100', text: 'text-slate-800', label: status };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const renderPaymentBadge = (method: string, status: string) => {
    if (method === 'COD') {
      if (status === 'SUCCESS') {
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            COD: Đã thu tiền khi giao
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          COD: Thu tiền khi nhận hàng
        </span>
      );
    }

    const statusMap: Record<string, { label: string; color: string }> = {
      AWAITING_PAYMENT: { label: 'Sandbox: Chờ thanh toán (Hạn 15p)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
      RECOVERING: { label: 'Sandbox: RECOVERING (Đang worker retry)', color: 'text-purple-700 bg-purple-50 border-purple-200' },
      SUCCESS: { label: 'Sandbox: Đã thanh toán online', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      FAILED: { label: 'Sandbox: Thanh toán thất bại', color: 'text-rose-700 bg-rose-50 border-rose-200' }
    };
    const s = statusMap[status] || { label: `Sandbox: ${status}`, color: 'text-slate-700 bg-slate-50 border-slate-200' };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${s.color}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Đơn hàng của tôi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý vòng đời đơn hàng, thanh toán Sandbox, theo dõi và đánh giá sản phẩm sau mua
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'AWAITING_PAYMENT', label: 'Chờ thanh toán' },
            { id: 'PROCESSING', label: 'Đang xử lý' },
            { id: 'SHIPPED', label: 'Đang giao' },
            { id: 'COMPLETED', label: 'Hoàn tất' },
            { id: 'CANCELLED', label: 'Đã hủy' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeFilter === tab.id
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-bold text-base text-slate-800">Không có đơn hàng nào</h3>
          <p className="text-xs text-slate-500">Thử chọn bộ lọc trạng thái khác hoặc mua hàng mới.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => {
            const canCancel = ['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED'].includes(order.orderStatus);
            const orderRefund = refunds.find(r => r.orderId === order.id);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition"
              >
                {/* Order Top Banner */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>{order.storeName}</span>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="font-mono text-slate-600">Đơn #{order.id}</span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      (Nhóm: {order.purchaseGroupId})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {renderOrderStatusBadge(order.orderStatus)}
                  </div>
                </div>

                {/* Items */}
                <div className="p-5 divide-y divide-slate-100">
                  {order.items.map(item => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <h4 className="font-bold text-slate-900 line-clamp-1">{item.productName}</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Phân loại: <span className="font-medium text-slate-700">{item.variantTitle}</span>
                        </p>
                        <p className="text-slate-500 text-[11px]">Số lượng: × {item.quantity}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-slate-900">
                          {formatVnd(item.totalVnd)}
                        </div>

                        {/* Review button if order completed */}
                        {order.orderStatus === 'COMPLETED' && (
                          <div className="mt-2">
                            {item.isReviewed ? (
                              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã đánh giá</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => onReviewItem(item, order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold transition border border-amber-200 cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                <span>Đánh giá</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary & Status Details */}
                <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Thanh toán:</span>
                      {renderPaymentBadge(order.paymentMethod, order.paymentStatus)}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Giao tới: <span className="text-slate-700">{order.shippingAddress}</span>
                    </p>

                    {/* Refund info if any */}
                    {orderRefund && (
                      <div className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-1">
                        Đã tạo hoàn tiền (Mock Refund): {formatVnd(orderRefund.amountVnd)} ({orderRefund.status})
                      </div>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-slate-500 text-[11px]">
                      Tiền hàng: {formatVnd(order.subtotalVnd)} + Phí ship: {formatVnd(order.shippingFeeVnd)}
                      {order.storeVoucherDiscountVnd > 0 && ` - Voucher Store: ${formatVnd(order.storeVoucherDiscountVnd)}`}
                      {order.platformVoucherDiscountVnd > 0 && ` - Voucher Sàn: ${formatVnd(order.platformVoucherDiscountVnd)}`}
                    </div>
                    <div className="text-slate-900 font-bold text-sm">
                      Tổng số tiền: <span className="text-emerald-600 text-base">{formatVnd(order.payableVnd)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    Tạo lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Pay button for Sandbox awaiting payment */}
                    {order.paymentMethod === 'SANDBOX' && order.paymentStatus === 'AWAITING_PAYMENT' && (
                      <button
                        onClick={() => onPayOrder(order)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Thanh toán ngay (Sandbox)</span>
                      </button>
                    )}

                    {/* Cancel button if pending */}
                    {canCancel && (
                      <button
                        onClick={() => handleCancel(order)}
                        className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Hủy đơn hàng này
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
