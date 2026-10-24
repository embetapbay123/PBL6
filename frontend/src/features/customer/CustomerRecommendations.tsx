import React, { useEffect, useState } from 'react';
import { getCustomerRecommendations } from '../../api/recommendationsChat';
import { Link } from 'react-router-dom';

interface CustomerRecommendationsProps {
  productId?: string;
}

export const CustomerRecommendations: React.FC<CustomerRecommendationsProps> = ({ productId }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getCustomerRecommendations({ limit: 4, product_id: productId })
      .then((res: any) => {
        if (!isMounted) return;
     
        const list = Array.isArray(res) ? res : res?.items || [];
        setProducts(list);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Không thể tải danh sách gợi ý sản phẩm.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (loading) return <div className="p-4 text-gray-500">Đang tải gợi ý sản phẩm...</div>;
  if (error) return <div className="p-4 text-red-500">Lỗi: {error}</div>;
  if (products.length === 0) return null;

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        {productId ? 'Sản phẩm liên quan (Related Products)' : 'Dành cho bạn (For You)'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((item) => (
          <div key={item.id} className="border p-4 rounded-md flex flex-col justify-between">
            <div>
              {item.images?.[0]?.image_url && (
                <img
                  src={item.images[0].image_url}
                  alt={item.title}
                  className="w-full h-32 object-cover mb-2 rounded"
                />
              )}
              <h4 className="font-semibold text-gray-700 truncate">{item.title}</h4>
              <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-red-600 font-bold">
                {item.variants?.[0]?.price_vnd ? `${item.variants[0].price_vnd.toLocaleString('vi-VN')} ₫` : 'Liên hệ'}
              </span>
              <Link
                to={`/products/${item.id}`}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};