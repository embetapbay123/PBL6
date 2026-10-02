import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, Trash2, Plus, Minus, Store as StoreIcon, ArrowRight } from 'lucide-react';
import { CartItem } from '../../types';

interface CartViewProps {
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartView: React.FC<CartViewProps> = ({ onProceedToCheckout, onContinueShopping }) => {
  const {
    cart,
    updateCartQuantity,
    removeCartItem,
    toggleCartSelection,
    toggleStoreCartSelection
  } = useApp();

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Group items by store
  const storeGroups = cart.reduce((acc, item) => {
    if (!acc[item.storeId]) {
      acc[item.storeId] = {
        storeId: item.storeId,
        storeName: item.storeName,
        items: []
      };
    }
    acc[item.storeId].items.push(item);
    return acc;
  }, {} as Record<string, { storeId: string; storeName: string; items: CartItem[] }>);

  const selectedItems = cart.filter(i => i.selected);
  const selectedSubtotal = selectedItems.reduce((acc, i) => acc + i.priceVnd * i.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Giỏ hàng của bạn đang trống</h2>
        <p className="text-sm text-slate-500 mb-6">
          Hãy khám phá các sản phẩm công nghệ, thời trang và thiết bị gia dụng chính hãng trên sàn nhé!
        </p>
        <button
          onClick={onContinueShopping}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition shadow-sm"
        >
          Khám phá sản phẩm ngay
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Giỏ hàng của bạn</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sản phẩm được phân nhóm theo từng Gian hàng (Multi-Store Marketplace)
          </p>
        </div>
        <button
          onClick={onContinueShopping}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
        >
          Tiếp tục mua hàng
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Cart Items grouped by Store */}
        <div className="lg:col-span-2 space-y-6">
          {Object.values(storeGroups).map(group => {
            const allStoreSelected = group.items.every(i => i.selected);
            const storeSubtotal = group.items
              .filter(i => i.selected)
              .reduce((acc, i) => acc + i.priceVnd * i.quantity, 0);

            return (
              <div
                key={group.storeId}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                {/* Store Header */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allStoreSelected}
                      onChange={e => toggleStoreCartSelection(group.storeId, e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <StoreIcon className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-sm text-slate-900">{group.storeName}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {group.items.length} món
                  </span>
                </div>

                {/* Items in this Store */}
                <div className="divide-y divide-slate-100 p-2">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-slate-50/50 rounded-xl transition"
                    >
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleCartSelection(item.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />

                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-1">
                          {item.productName}
                        </h4>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Phân loại: <span className="text-slate-700 font-medium">{item.variantTitle}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs sm:text-sm font-bold text-emerald-600">
                            {formatVnd(item.priceVnd)}
                          </span>

                          {/* Quantity control */}
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition"
                        title="Xóa khỏi giỏ hàng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Store Subtotal */}
                <div className="px-5 py-2.5 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-500">Tạm tính gian hàng:</span>
                  <span className="font-bold text-slate-900">{formatVnd(storeSubtotal)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Checkout summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 sticky top-24">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3">
              Tóm tắt đơn hàng
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Số lượng món chọn:</span>
                <span className="font-semibold text-slate-800">{selectedItems.length} sản phẩm</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Số gian hàng liên quan:</span>
                <span className="font-semibold text-slate-800">
                  {new Set(selectedItems.map(i => i.storeId)).size} Store
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tổng tiền hàng:</span>
                <span className="font-bold text-slate-900 text-sm">{formatVnd(selectedSubtotal)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
              <p className="font-bold">Quy tắc thanh toán PBL6:</p>
              <p>
                Khi xác nhận, hệ thống sẽ tạo một Order và một Payment riêng cho mỗi Store, chia sẻ mã{' '}
                <code className="font-bold">purchase_group_id</code>. Bạn có thể chọn trả COD hoặc Sandbox riêng từng Store!
              </p>
            </div>

            <button
              onClick={onProceedToCheckout}
              disabled={selectedItems.length === 0}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Xem báo giá & Đặt hàng</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
