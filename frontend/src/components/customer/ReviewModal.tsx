import React, { useState } from 'react';
import { OrderItem, Order } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Star, CheckCircle } from 'lucide-react';

interface ReviewModalProps {
  item: OrderItem | null;
  order: Order | null;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ item, order, onClose }) => {
  const { addReview } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number>(0);

  if (!item || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('Vui lòng chia sẻ cảm nhận về sản phẩm!');
      return;
    }

    addReview(item.id, item.productId, rating, comment.trim());
    alert('Đánh giá sản phẩm đã được gửi thành công!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-base">Đánh Giá Sản Phẩm Sau Mua (C08)</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Item details */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <img
              src={item.image}
              alt={item.productName}
              className="w-14 h-14 rounded-lg object-cover border border-slate-200"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 line-clamp-1">{item.productName}</h4>
              <p className="text-slate-500 text-[11px]">Phân loại: {item.variantTitle}</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                ✓ Đã mua tại {order.storeName}
              </p>
            </div>
          </div>

          {/* Star selector */}
          <div className="text-center py-2 space-y-1">
            <label className="block font-semibold text-slate-700 text-sm">Chất lượng sản phẩm:</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-amber-600">
              {rating === 5 && 'Tuyệt vời, vượt mong đợi!'}
              {rating === 4 && 'Rất tốt, hài lòng!'}
              {rating === 3 && 'Bình thường, dùng tạm được.'}
              {rating === 2 && 'Chưa hài lòng, chất lượng trung bình.'}
              {rating === 1 && 'Rất tệ, thất vọng.'}
            </p>
          </div>

          {/* Comment text */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">Chia sẻ chi tiết cảm nhận của bạn:</label>
            <textarea
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Sản phẩm đóng gói ra sao? Chất lượng âm thanh / vải / độ hoàn thiện thế nào? Bạn có khuyến nghị mua không?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white resize-none"
              required
            ></textarea>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow transition flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Gửi đánh giá</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
