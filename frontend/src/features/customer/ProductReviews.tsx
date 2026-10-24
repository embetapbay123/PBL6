import React, { useState, useEffect } from 'react';
import { listProductReviews, createProductReview, updateProductReview } from '../../api/reviews';

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form state cho việc viết đánh giá
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Hàm tải danh sách đánh giá
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listProductReviews(productId);
      setReviews(res?.items || res || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId]);

  // Hàm gửi đánh giá mới
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      await createProductReview(productId, {
        order_item_id: 'sample-order-item-id', // เพิ่ม order_item_id ตามที่ API บังคับ
        rating,
        body: comment,
      });

      setSuccessMsg('Đánh giá của bạn đã được gửi thành công!');
      setComment('');
      setRating(5);
      fetchReviews(); // Tải lại danh sách đánh giá sau khi gửi thành công
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi đánh giá. Vui lòng kiểm tra lại quyền mua hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6 space-y-6">
      <h3 className="text-xl font-bold text-gray-800">Đánh giá sản phẩm (Customer Reviews)</h3>

      {/* Hiển thị lỗi hoặc thông báo thành công */}
      {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
      {successMsg && <div className="p-3 bg-green-100 text-green-700 rounded text-sm">{successMsg}</div>}

      {/* Form viết đánh giá */}
      <form onSubmit={handleSubmitReview} className="border-b pb-6 space-y-4">
        <h4 className="font-semibold text-gray-700">Viết đánh giá của bạn</h4>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Chất lượng (Số sao):</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5 sao - Tuyệt vời</option>
            <option value={4}>4 sao - Hài lòng</option>
            <option value={3}>3 sao - Bình thường</option>
            <option value={2}>2 sao - Không hài lòng</option>
            <option value={1}>1 sao - Rất tệ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Nhận xét chi tiết:</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            required
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm sau khi mua..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </form>

      {/* Danh sách các đánh giá */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700">Tất cả đánh giá</h4>
        {loading ? (
          <p className="text-gray-500">Đang tải đánh giá...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
        ) : (
          reviews.map((rev: any, idx: number) => (
            <div key={rev.id || idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">{rev.userName || 'Khách hàng'}</span>
                <span className="text-yellow-500 font-bold">★ {rev.rating} / 5</span>
              </div>
              <p className="text-gray-600 text-sm">{rev.comment}</p>
              <span className="text-xs text-gray-400">
                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'Gần đây'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;