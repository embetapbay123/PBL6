import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface StoreGroup {
  storeId: string;
  storeName: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  // BUG-WEB-01 FIX: Persist Attempt Identity / Idempotency Key across reload
  const [attemptKey, setAttemptKey] = useState<string>(() => {
    const savedKey = localStorage.getItem('pbl6_checkout_attempt_key');
    if (savedKey) return savedKey;
    const newKey = `ATTEMPT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('pbl6_checkout_attempt_key', newKey);
    return newKey;
  });

  const [selectedAddress, setSelectedAddress] = useState('123 Đường ABC, Phường Hòa Khánh, Đà Nẵng');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Snapshot dữ liệu nhiều Store (Multi-Store Quote Snapshot)
  const storeGroups: StoreGroup[] = [
    {
      storeId: 'STORE-01',
      storeName: 'Cửa hàng Nông sản Đà Nẵng',
      items: [
        { id: 'P-01', name: 'Sản phẩm mẫu 1', price: 120000, quantity: 2 },
      ],
    },
    {
      storeId: 'STORE-02',
      storeName: 'Cửa hàng Bách hóa Tổng hợp',
      items: [
        { id: 'P-02', name: 'Sản phẩm mẫu 2', price: 150000, quantity: 1 },
      ],
    },
  ];

  const subtotal = storeGroups.reduce(
    (acc, group) => acc + group.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    0
  );

  const total = Math.max(0, subtotal - discount);

  // Xử lý áp dụng Voucher
  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherCode.toUpperCase() === 'DISCOUNT10') {
      setDiscount(35000);
      setErrorMsg('');
    } else {
      setDiscount(0);
      setErrorMsg('Mã giảm giá không hợp lệ.');
    }
  };

  // Xử lý Confirm Order (Chống double-click & Persist attempt)
  const handleConfirmOrder = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');

    // Giả lập gửi request cùng Idempotency Key
    setTimeout(() => {
      // Sau khi đặt hàng thành công, xóa Attempt Key để chuẩn bị cho lần mua sau
      localStorage.removeItem('pbl6_checkout_attempt_key');
      setIsSubmitting(false);
      navigate('/customer/orders');
    }, 1200);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/cart" className="text-indigo-600 hover:underline mb-4 inline-block text-sm">
        &larr; Quay lại giỏ hàng
      </Link>
      <h1 className="text-2xl font-bold mb-6">Thanh toán đơn hàng (Checkout)</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Thông tin đơn hàng & Cấu hình */}
        <div className="md:col-span-2 space-y-6">
          {/* Địa chỉ nhận hàng */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-3">1. Địa chỉ nhận hàng</h2>
            <div className="border p-3 rounded bg-gray-50 text-sm space-y-1">
              <p className="font-semibold text-gray-800">Hatsaphone Thilavong (0901234567)</p>
              <p className="text-gray-600">{selectedAddress}</p>
            </div>
            <Link to="/customer/addresses" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
              Thay đổi địa chỉ
            </Link>
          </div>

          {/* Danh sách sản phẩm phân loại theo Store */}
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-bold mb-1">2. Sản phẩm từ các cửa hàng</h2>
            {storeGroups.map((group) => (
              <div key={group.storeId} className="border-t pt-3">
                <h3 className="font-semibold text-indigo-700 text-sm mb-2">{group.storeName}</h3>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-gray-500">Số lượng: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{ (item.price * item.quantity).toLocaleString() } ₫</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Phương thức thanh toán */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold mb-3">3. Phương thức thanh toán</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-sm">Thanh toán khi nhận hàng (COD)</p>
                  <p className="text-xs text-gray-500">Thanh toán bằng tiền mặt khi shipper giao hàng</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'ONLINE'}
                  onChange={() => setPaymentMethod('ONLINE')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <p className="font-medium text-sm">Thanh toán trực tuyến (Chuyển khoản / Ví điện tử)</p>
                  <p className="text-xs text-gray-500">Cổng thanh toán trực tuyến bảo mật</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Cột Tóm tắt thanh toán */}
        <div className="bg-white p-6 rounded-lg shadow h-fit space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Tóm tắt thanh toán</h2>

          {/* Form Voucher */}
          <form onSubmit={handleApplyVoucher} className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">Mã ưu đãi (Voucher)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="DISCOUNT10"
                className="w-full border rounded px-3 py-1.5 text-xs"
              />
              <button type="submit" className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-medium">
                Áp dụng
              </button>
            </div>
          </form>

          {errorMsg && <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{errorMsg}</p>}

          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Tạm tính</span>
              <span>{subtotal.toLocaleString()} ₫</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span>
                <span>-{discount.toLocaleString()} ₫</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2 text-gray-900">
              <span>Tổng thanh toán</span>
              <span className="text-indigo-600">{total.toLocaleString()} ₫</span>
            </div>
          </div>

          <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
            Attempt Key: <span className="font-mono">{attemptKey}</span>
          </div>

          <button
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-md font-bold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Đang xử lý đơn hàng...' : 'Xác nhận đặt hàng'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;