import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MapPin,
  Store as StoreIcon,
  CreditCard,
  Banknote,
  Ticket,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface CheckoutViewProps {
  onBackToCart: () => void;
  onCheckoutSuccess: (purchaseGroupId: string) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({ onBackToCart, onCheckoutSuccess }) => {
  const {
    cart,
    addresses,
    vouchers,
    calculateQuote,
    confirmCheckout
  } = useApp();

  const selectedItems = cart.filter(i => i.selected);

  // Address state
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.find(a => a.isDefault)?.id || addresses[0]?.id || ''
  );

  // Per-store payment method state: Record<storeId, 'SANDBOX' | 'COD'>
  const [storePaymentMethods, setStorePaymentMethods] = useState<Record<string, 'SANDBOX' | 'COD'>>({});
  // Per-store voucher code state: Record<storeId, voucherCode>
  const [storeVoucherCodes, setStoreVoucherCodes] = useState<Record<string, string>>({});
  // Platform voucher code
  const [platformVoucherCode, setPlatformVoucherCode] = useState<string>('PBL6SUPER50');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format currency
  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Calculate live quote
  const quote = calculateQuote(selectedItems, storeVoucherCodes, platformVoucherCode);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId) || addresses[0];

  const handleConfirmOrder = () => {
    if (!selectedAddress) {
      alert('Vui lòng chọn địa chỉ giao hàng!');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Chưa có sản phẩm nào được chọn trong giỏ!');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = confirmCheckout(
        selectedAddress.fullAddress,
        storePaymentMethods,
        storeVoucherCodes,
        platformVoucherCode
      );
      setIsSubmitting(false);
      onCheckoutSuccess(res.purchaseGroupId);
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Navigation back */}
      <button
        onClick={onBackToCart}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại giỏ hàng</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Xác nhận Báo giá & Đặt hàng</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Màn C04 / C05: Báo giá từng Store, áp dụng Voucher 2 tầng & tạo Order riêng biệt
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Address, Stores & Payment Methods */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Delivery Address */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Địa chỉ nhận hàng (Dùng chung cho toàn bộ đơn hàng trong đợt thanh toán)</span>
            </div>

            <div className="space-y-2">
              {addresses.map(addr => (
                <label
                  key={addr.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    selectedAddressId === addr.id
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-900">
                      {addr.recipientName} • <span className="text-slate-500">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                          Mặc định
                        </span>
                      )}
                    </p>
                    <p className="text-slate-600 mt-1 leading-relaxed">{addr.fullAddress}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 2: Store Quotes & Payment Method per Store */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-800">
              Chi tiết các đơn hàng theo Gian hàng ({Object.keys(quote.storeQuotes).length} Store)
            </h3>

            {Object.values(quote.storeQuotes).map(sq => {
              const currentMethod = storePaymentMethods[sq.storeId] || 'SANDBOX';
              const currentVoucher = storeVoucherCodes[sq.storeId] || '';

              // Available store vouchers
              const storeVouchers = vouchers.filter(
                v => v.scope === 'STORE' && v.storeId === sq.storeId && v.isActive
              );

              return (
                <div
                  key={sq.storeId}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  {/* Store Header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StoreIcon className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-sm text-slate-900">{sq.storeName}</span>
                    </div>
                    <span className="text-xs text-slate-500">Phí ship: {formatVnd(sq.shippingFeeVnd)}</span>
                  </div>

                  {/* Items list */}
                  <div className="divide-y divide-slate-100 p-4 space-y-2">
                    {sq.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 pt-2">
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-semibold text-slate-900 line-clamp-1">{item.productName}</p>
                          <p className="text-slate-500 text-[11px]">{item.variantTitle} × {item.quantity}</p>
                        </div>
                        <div className="font-bold text-xs text-slate-800">
                          {formatVnd(item.priceVnd * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Store Controls: Voucher & Payment Selection */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                    {/* Store Voucher */}
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-amber-500" />
                        <span>Voucher Gian hàng:</span>
                      </span>
                      <select
                        value={currentVoucher}
                        onChange={e =>
                          setStoreVoucherCodes({ ...storeVoucherCodes, [sq.storeId]: e.target.value })
                        }
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="">Không sử dụng voucher store</option>
                        {storeVouchers.map(v => (
                          <option key={v.id} value={v.code}>
                            {v.code} - {v.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Store Payment Method Choice (SANDBOX vs COD) */}
                    <div className="pt-2 border-t border-slate-200/60">
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Phương thức thanh toán cho Gian hàng này:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setStorePaymentMethods({ ...storePaymentMethods, [sq.storeId]: 'SANDBOX' })
                          }
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition text-xs font-medium cursor-pointer ${
                            currentMethod === 'SANDBOX'
                              ? 'border-emerald-600 bg-white text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold">Cổng Sandbox Online</p>
                            <p className="text-[10px] text-slate-500">Giữ tồn 15p, thanh toán trực tiếp</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setStorePaymentMethods({ ...storePaymentMethods, [sq.storeId]: 'COD' })
                          }
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition text-xs font-medium cursor-pointer ${
                            currentMethod === 'COD'
                              ? 'border-emerald-600 bg-white text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-bold">Thanh toán COD</p>
                            <p className="text-[10px] text-slate-500">Thu tiền mặt khi nhận hàng</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Store calculation summary */}
                    <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Cần trả cho Store này:</span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 text-sm">{formatVnd(sq.payableVnd)}</span>
                        {sq.storeDiscountVnd > 0 && (
                          <span className="block text-[10px] text-emerald-600">
                            (Đã giảm voucher: -{formatVnd(sq.storeDiscountVnd)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Platform Voucher & Overall Breakdown */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 sticky top-24">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-emerald-600" />
              <span>Voucher Toàn Sàn & Báo Giá</span>
            </h3>

            {/* Platform Voucher Selector */}
            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700">Mã giảm giá Toàn sàn (PBL6):</label>
              <select
                value={platformVoucherCode}
                onChange={e => setPlatformVoucherCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:bg-white cursor-pointer"
              >
                <option value="">Không dùng voucher sàn</option>
                {vouchers
                  .filter(v => v.scope === 'PLATFORM' && v.isActive)
                  .map(v => (
                    <option key={v.id} value={v.code}>
                      {v.code} - {v.title}
                    </option>
                  ))}
              </select>
              {quote.appliedPlatformVoucher && (
                <p className="text-[11px] text-emerald-600 font-medium">
                  ✓ Áp dụng thành công voucher sàn: -{formatVnd(quote.totalPlatformDiscountVnd)}
                </p>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền hàng:</span>
                <span className="font-semibold text-slate-900">{formatVnd(quote.totalSubtotalVnd)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tổng phí vận chuyển ({Object.keys(quote.storeQuotes).length} Store):</span>
                <span className="font-semibold text-slate-900">{formatVnd(quote.totalShippingFeeVnd)}</span>
              </div>
              {quote.totalStoreDiscountVnd > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Giảm từ Voucher Store:</span>
                  <span>-{formatVnd(quote.totalStoreDiscountVnd)}</span>
                </div>
              )}
              {quote.totalPlatformDiscountVnd > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Giảm từ Voucher Sàn:</span>
                  <span>-{formatVnd(quote.totalPlatformDiscountVnd)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="font-extrabold text-sm text-slate-900 block">Tổng thanh toán tham khảo:</span>
                  <span className="text-[10px] text-slate-400">
                    (Mỗi đơn có Payment riêng theo thiết kế 2.1)
                  </span>
                </div>
                <span className="text-xl font-black text-emerald-600">
                  {formatVnd(quote.totalPayableVnd)}
                </span>
              </div>
            </div>

            {/* Architectural Callout */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Idempotency-Key & Multi-Store Safety</span>
              </div>
              <p>
                Yêu cầu tạo đơn có gắn Idempotency-Key. Mỗi Store nhận đúng 1 Order riêng biệt. Không lo tạo trùng đơn khi mạng chập chờn.
              </p>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || selectedItems.length === 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Đang xử lý tạo đơn...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận Đặt hàng một lần</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
