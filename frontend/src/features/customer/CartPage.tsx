import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { callOperation } from '../../api/operations';

export interface CartItem {
  id?: string;
  variant_id: string;
  store_id?: string;
  quantity: number;
  product_id?: string;
  product_title?: string;
  price_vnd?: number;
}

export function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const navigate = useNavigate();

  // Fetch cart items using listCartItems operation
  const fetchCartItems = async () => {
    try {
      setIsLoading(true);
      const res = await callOperation('listCartItems', { query: { page: 1, size: 50 } });
      const fetchedItems = res?.items || [];
      setItems(fetchedItems);
      
      const validIds = fetchedItems.map((item) => item.id).filter((id): id is string => !!id);
      setSelectedIds(validIds);
    } catch (err) {
      console.error('Lỗi khi tải giỏ hàng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  // Update item quantity using updateCartItem operation
  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1 || isUpdating) return;

    try {
      setIsUpdating(true);
      await callOperation('updateCartItem', {
        path: { id },
        body: { quantity: newQuantity },
      });
      await fetchCartItems();
    } catch (err) {
      alert('Không thể cập nhật số lượng.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove item from cart using removeCartItem operation
  const handleRemoveItem = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?') || isUpdating) return;

    try {
      setIsUpdating(true);
      await callOperation('removeCartItem', {
        path: { id },
      });
      await fetchCartItems();
    } catch (err) {
      alert('Không thể xóa sản phẩm.');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleProceedToCheckout = () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
      return;
    }
    navigate('/checkout', { state: { selectedCartItemIds: selectedIds } });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Đang tải giỏ hàng...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center my-12 border rounded-lg bg-white shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Giỏ hàng của bạn đang trống</h2>
        <p className="text-gray-600 mb-6">Hãy chọn thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm.</p>
        <Link to="/" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors">
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Giỏ hàng của bạn</h1>

      <div className="divide-y divide-gray-200 mb-6">
        {items.map((item) => {
          if (!item.id) return null;
          const isSelected = selectedIds.includes(item.id);

          return (
            <div key={item.id} className="py-4 flex items-center gap-4">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(item.id!)}
                className="w-5 h-5 text-blue-600 rounded"
              />

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.product_title || `Sản phẩm (${item.product_id || 'N/A'})`}</h3>
                <p className="text-sm text-gray-500">Variant ID: {item.variant_id}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-md">
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => handleUpdateQuantity(item.id!, item.quantity - 1)}
                    disabled={isUpdating || item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="px-4 py-1 text-center font-medium min-w-[2.5rem]">{item.quantity}</span>
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => handleUpdateQuantity(item.id!, item.quantity + 1)}
                    disabled={isUpdating}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.id!)}
                  disabled={isUpdating}
                  className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 ml-2"
                >
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-6 flex justify-between items-center">
        <span className="text-gray-600">Đã chọn: <strong className="text-gray-900">{selectedIds.length}</strong> sản phẩm</span>
        <button
          onClick={handleProceedToCheckout}
          className="px-8 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition-colors shadow"
        >
          Tiến hành thanh toán
        </button>
      </div>
    </div>
  );
}