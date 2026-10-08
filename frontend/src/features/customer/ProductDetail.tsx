import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { callOperation } from '../../api/operations';

export interface ProductVariant {
  id?: string;
  sku: string;
  price_vnd: number;
  status?: string;
  is_default?: boolean;
}

export interface ProductDetailData {
  id?: string;
  title: string;
  description?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'STOPPED';
  variants?: ProductVariant[];
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // 1. Tải thông tin sản phẩm qua getProduct
  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        setIsLoading(true);
        setIsNotFound(false);

        // Gọi đúng Operation 'getProduct' theo OpenAPI Contract
        const response = await callOperation('getProduct', {
          path: { id },
        });

        if (!response || !response.id) {
          setIsNotFound(true);
          return;
        }

        setProduct(response);
        if (response.variants && response.variants.length > 0) {
          // Ưu tiên chọn variant mặc định (is_default) hoặc variant đầu tiên
          const defaultVar = response.variants.find((v) => v.is_default) || response.variants[0];
          setSelectedVariant(defaultVar);
        }
      } catch (error) {
        setIsNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  // 2. Xử lý trường hợp không tìm thấy sản phẩm (404)
  if (isNotFound) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto my-12 border rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-red-600 mb-2">404 - Không tìm thấy sản phẩm</h1>
        <p className="text-gray-600 mb-6">Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.</p>
        <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  // 3. Trạng thái Loading
  if (isLoading || !product) {
    return <div className="p-8 text-center text-gray-500">Đang tải chi tiết sản phẩm...</div>;
  }

  // Kiểm tra điều kiện ngưng bán / hết hàng
  const isNotForSale = product.status === 'STOPPED' || selectedVariant?.status === 'STOPPED';

  // 4. Xử lý Thêm vào giỏ hàng qua addCartItem
  const handleAddToCart = async () => {
    if (!product.id || !selectedVariant?.id || isNotForSale || isAdding) return;

    try {
      setIsAdding(true);

      // Gọi đúng Operation 'addCartItem' với snake_case payload
      await callOperation('addCartItem', {
        body: {
          product_id: product.id,
          variant_id: selectedVariant.id,
          quantity: quantity,
        },
      });

      alert('Đã thêm sản phẩm vào giỏ hàng thành công!');
    } catch (err) {
      alert('Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Hình ảnh đại diện */}
        <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
          <span className="text-gray-400">Hình ảnh sản phẩm</span>
        </div>

        {/* Thông tin sản phẩm */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.title}</h1>
          <p className="text-gray-600 mb-4">{product.description || 'Không có mô tả sản phẩm.'}</p>

          {/* Giá VND */}
          <div className="text-3xl font-extrabold text-blue-600 mb-4">
            {selectedVariant ? selectedVariant.price_vnd.toLocaleString('vi-VN') : 0} ₫
          </div>

          {/* Cảnh báo khi sản phẩm dừng kinh doanh */}
          {isNotForSale && (
            <div className="p-3 mb-4 bg-yellow-100 text-yellow-800 rounded-md text-sm border border-yellow-200">
              ⚠️ Sản phẩm hoặc phân loại này hiện đã ngừng kinh doanh.
            </div>
          )}

          {/* Danh sách Variant (Phân loại) */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Chọn phân loại:</label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id || variant.sku}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.status === 'STOPPED'}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                      selectedVariant?.id === variant.id
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    } ${variant.status === 'STOPPED' ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                  >
                    SKU: {variant.sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chọn số lượng & Thêm vào giỏ hàng */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md">
              <button
                type="button"
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={isNotForSale || quantity <= 1}
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isNotForSale}
                className="w-12 text-center border-none focus:outline-none"
              />
              <button
                type="button"
                className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={isNotForSale}
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isNotForSale || isAdding}
              className="flex-1 bg-blue-600 text-white py-2 px-6 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? 'Đang xử lý...' : 'Thêm vào giỏ hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}