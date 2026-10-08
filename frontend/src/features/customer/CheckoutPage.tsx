import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { callOperation } from '../../api/operations';

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedCartItemIds: string[] = location.state?.selectedCartItemIds || [];

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [quote, setQuote] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch address list
  useEffect(() => {
    async function initCheckout() {
      if (selectedCartItemIds.length === 0) {
        navigate('/cart');
        return;
      }

      try {
        setIsLoading(true);
        const addressRes = await callOperation('listAddresses', { query: { page: 1, size: 20 } });
        const addrList = addressRes?.items || [];
        setAddresses(addrList);

        if (addrList.length > 0) {
          const defaultAddr = addrList.find((a) => a.is_default) || addrList[0];
          if (defaultAddr.id) {
            setSelectedAddressId(defaultAddr.id);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin thanh toán:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initCheckout();
  }, []);

  // 2. Calculate order quote using quoteCheckout
  useEffect(() => {
    async function getQuote() {
      if (!selectedAddressId || selectedCartItemIds.length === 0) return;

      try {
        const quoteRes = await callOperation('quoteCheckout', {
          body: {
            cart_item_ids: selectedCartItemIds,
            address_id: selectedAddressId,
            payment_methods: { default: 'COD' },
          },
        });
        setQuote(quoteRes);
      } catch (err) {
        console.error('Lỗi khi tính toán giá đơn hàng:', err);
      }
    }
    getQuote();
  }, [selectedAddressId]);

  // 3. Confirm order placement using confirmCheckout
  const handleConfirmOrder = async () => {
    if (!quote || !selectedAddressId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const idempotencyKey = `checkout_${Date.now()}`;

      await callOperation('confirmCheckout', {
        headers: {
          'idempotency-key': idempotencyKey,
        },
        body: {
          cart_item_ids: selectedCartItemIds,
          address_id: selectedAddressId,
          payment_methods: { default: 'COD' },
          quote_id: quote.quote_id,
          expected_payable_total_vnd: quote.payable_total_vnd,
        },
      });

      alert('Đặt hàng thành công!');
      navigate('/orders');
    } catch (err) {
      alert('Đã xảy ra lỗi khi xác nhận đơn hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Đang chuẩn bị thông tin thanh toán...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Thanh toán đơn hàng</h1>

      {/* Address Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Địa chỉ nhận hàng</h2>
        {addresses.length === 0 ? (
          <p className="text-red-500 text-sm">Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ mới.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer ${
                  selectedAddressId === addr.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">{addr.recipient_name} ({addr.phone})</div>
                  <div className="text-sm text-gray-600">{`${addr.line1}, ${addr.ward}, ${addr.district}, ${addr.city}`}</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price Summary */}
      {quote && (
        <div className="border-t pt-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Tóm tắt đơn hàng</h2>
          <div className="flex justify-between py-2 text-gray-600">
            <span>Tổng tiền hàng:</span>
            <span>{quote.payable_total_vnd?.toLocaleString('vi-VN')} ₫</span>
          </div>
          <div className="flex justify-between py-2 text-lg font-bold text-gray-900 border-t mt-2">
            <span>Tổng thanh toán:</span>
            <span className="text-blue-600">{quote.payable_total_vnd?.toLocaleString('vi-VN')} ₫</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleConfirmOrder}
        disabled={!quote || !selectedAddressId || isSubmitting}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow"
      >
        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
      </button>
    </div>
  );
}