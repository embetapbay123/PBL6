import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  isAvailable: boolean;
  variantName?: string;
}

export const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'P-01',
      name: 'Sản phẩm mẫu 1 (Đã đổi giá)',
      price: 120000,
      originalPrice: 100000,
      quantity: 2,
      image: 'https://via.placeholder.com/100',
      isAvailable: true,
      variantName: 'Màu đỏ / Size L',
    },
    {
      id: 'P-02',
      name: 'Sản phẩm mẫu 2',
      price: 150000,
      quantity: 1,
      image: 'https://via.placeholder.com/100',
      isAvailable: true,
      variantName: 'Màu xanh / Size M',
    },
    {
      id: 'P-03',
      name: 'Sản phẩm mẫu 3 (Hết hàng)',
      price: 200000,
      quantity: 1,
      image: 'https://via.placeholder.com/100',
      isAvailable: false,
      variantName: 'Màu đen / Size XL',
    },
  ]);

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [voucher, setVoucher] = useState('');
  const [discount, setDiscount] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState('');

  // Xử lý tăng/giảm số lượng (chặn click trùng lặp khi đang xử lý)
  const handleQuantityChange = (id: string, delta: number) => {
    if (isUpdating) return;
    setIsUpdating(id);

    setTimeout(() => {
      setCartItems((prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              const newQty = item.quantity + delta;
              return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
          })
          .filter((item) => item.quantity > 0)
      );
      setIsUpdating(null);
    }, 300);
  };

  // Xử lý xóa sản phẩm khỏi giỏ hàng
  const handleRemoveItem = (id: string) => {
    if (isUpdating) return;
    setIsUpdating(id);
    setTimeout(() => {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
      setIsUpdating(null);
    }, 300);
  };

  // Xử lý áp dụng mã giảm giá (Voucher)
  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucher.toUpperCase() === 'DISCOUNT10') {
      setDiscount(35000);
      setVoucherMsg('Áp dụng mã giảm giá thành công (-35,000 ₫)');
    } else {
      setDiscount(0);
      setVoucherMsg('Mã giảm giá không hợp lệ');
    }
  };

  // Tính toán tổng tiền (chỉ tính sản phẩm còn hàng)
  const availableItems = cartItems.filter((item) => item.isAvailable);
  const subtotal = availableItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Giỏ hàng của bạn (Cart)</h1>

      {cartItems.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center space-y-4">
          <p className="text-gray-500 text-lg">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/"
            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-md font-medium hover:bg-indigo-700 transition"
          >
            Quay lại mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Danh sách sản phẩm trong giỏ */}
          <div className="md:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !item.isAvailable ? 'opacity-60 bg-gray-50' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}

                    {/* Cảnh báo đổi giá hoặc hết hàng */}
                    {!item.isAvailable ? (
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-1 inline-block">
                        Tạm hết hàng (Unavailable)
                      </span>
                    ) : item.originalPrice && item.originalPrice !== item.price ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-indigo-600 font-bold">{item.price.toLocaleString()} ₫</span>
                        <span className="text-xs text-gray-400 line-through">
                          {item.originalPrice.toLocaleString()} ₫
                        </span>
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Giá đã thay đổi
                        </span>
                      </div>
                    ) : (
                      <p className="text-indigo-600 font-bold mt-1">{item.price.toLocaleString()} ₫</p>
                    )}
                  </div>
                </div>

                {/* Bộ điều khiển số lượng & Nút xóa */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                  {item.isAvailable && (
                    <div className="flex items-center gap-2 border rounded p-1">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={isUpdating === item.id}
                        className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        disabled={isUpdating === item.id}
                        className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded font-bold disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isUpdating === item.id}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Tóm tắt đơn hàng & Voucher */}
          <div className="bg-white p-6 rounded-lg shadow h-fit space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Tóm tắt đơn hàng</h2>

            {/* Form nhập mã giảm giá */}
            <form onSubmit={handleApplyVoucher} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mã giảm giá (Voucher)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  placeholder="Thử: DISCOUNT10"
                  className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-black transition"
                >
                  Áp dụng
                </button>
              </div>
              {voucherMsg && (
                <p className={`text-xs ${discount > 0 ? 'text-green-600' : 'text-red-600'}`}>{voucherMsg}</p>
              )}
            </form>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString()} ₫</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Giảm giá</span>
                  <span>-{discount.toLocaleString()} ₫</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2 text-gray-900">
                <span>Tổng tiền</span>
                <span className="text-indigo-600">{total.toLocaleString()} ₫</span>
              </div>
            </div>

            <Link
              to="/checkout"
              className="block w-full bg-indigo-600 text-white text-center py-2.5 rounded-md font-semibold hover:bg-indigo-700 transition"
            >
              Tiến hành thanh toán
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;