import React, { useState } from 'react';
import { Product, ProductVariant } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Star,
  Store as StoreIcon,
  Truck,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  ShoppingCart,
  MessageSquare
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onProceedToCart: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onProceedToCart
}) => {
  const { addToCart, stores, reviews } = useApp();

  if (!product) return null;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [selectedImage, setSelectedImage] = useState<string>(product.images[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

  const store = stores.find(s => s.id === product.storeId);
  const productReviews = reviews.filter(r => r.productId === product.id && !r.isAdminHidden);
  const availableStock = selectedVariant.quantity - selectedVariant.reservedQuantity;

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleAddToCart = () => {
    if (availableStock < quantity) {
      alert('Số lượng chọn vượt quá tồn kho khả dụng!');
      return;
    }
    addToCart(product.id, selectedVariant.id, quantity);
    alert(`Đã thêm ${quantity} sản phẩm (${selectedVariant.title}) vào giỏ hàng!`);
  };

  const handleBuyNow = () => {
    if (availableStock < quantity) {
      alert('Số lượng chọn vượt quá tồn kho khả dụng!');
      return;
    }
    addToCart(product.id, selectedVariant.id, quantity);
    onClose();
    onProceedToCart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-700 text-white">
              {product.categoryName}
            </span>
            <span className="text-xs text-slate-400">SKU: {selectedVariant.sku}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Images */}
            <div className="space-y-4">
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                        selectedImage === img ? 'border-emerald-600 scale-105' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Store info box */}
              {store && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div className="font-semibold text-sm text-slate-900 flex items-center gap-1">
                          <StoreIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{store.name}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {store.ratingAvg} ★ ({store.totalReviews} đánh giá)
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      Store Xác Thực
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phí giao tiêu chuẩn: <strong>{formatVnd(store.shippingFeeVnd)}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Info, Variants, Purchase */}
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-snug">{product.name}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <div className="flex items-center text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 mr-1" />
                    <span>{product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : 'Chưa có'}</span>
                  </div>
                  <span>•</span>
                  <span>{productReviews.length} lượt đánh giá</span>
                  <span>•</span>
                  <span>Đã bán {product.salesCount}</span>
                </div>
              </div>

              {/* Price */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-baseline gap-3">
                <span className="text-2xl font-black text-emerald-700">
                  {formatVnd(selectedVariant.priceVnd)}
                </span>
                {selectedVariant.originalPriceVnd > selectedVariant.priceVnd && (
                  <span className="text-sm text-slate-400 line-through">
                    {formatVnd(selectedVariant.originalPriceVnd)}
                  </span>
                )}
                {selectedVariant.originalPriceVnd > selectedVariant.priceVnd && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                    -{Math.round(((selectedVariant.originalPriceVnd - selectedVariant.priceVnd) / selectedVariant.originalPriceVnd) * 100)}%
                  </span>
                )}
              </div>

              {/* Variants */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Chọn phân loại / Biến thể:
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => {
                    const isSelected = selectedVariant.id === v.id;
                    const vStock = v.quantity - v.reservedQuantity;
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          setSelectedVariant(v);
                          if (v.image) setSelectedImage(v.image);
                        }}
                        disabled={vStock <= 0}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition flex items-center gap-2 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                            : vStock <= 0
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        <div>
                          <p className="font-semibold">{v.title}</p>
                          <p className="text-[10px] text-slate-500">{formatVnd(v.priceVnd)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock info */}
              <div className="text-xs text-slate-600 flex items-center justify-between">
                <span>Tồn kho khả dụng:</span>
                <span className={`font-semibold ${availableStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {availableStock > 0 ? `${availableStock} sản phẩm` : 'Hết hàng'}
                </span>
              </div>

              {/* Quantity Adjuster */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-700">Số lượng:</span>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-xs font-bold text-slate-800">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(availableStock, q + 1))}
                    disabled={quantity >= availableStock}
                    className="p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={availableStock <= 0}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-emerald-600 text-emerald-700 font-semibold text-xs hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-slate-50 transition flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Thêm vào giỏ</span>
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={availableStock <= 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md hover:shadow-lg disabled:bg-slate-300 disabled:shadow-none transition flex items-center justify-center gap-2"
                >
                  <span>Mua ngay</span>
                </button>
              </div>

              {/* Highlights & Guarantees */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Chính hãng</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Giao COD / Sandbox toàn quốc</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Reviews tabs */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold mb-4">
              <button
                onClick={() => setActiveTab('desc')}
                className={`pb-2 border-b-2 transition ${
                  activeTab === 'desc'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Mô tả chi tiết & Thông số
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`pb-2 border-b-2 transition flex items-center gap-1.5 ${
                  activeTab === 'reviews'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Đánh giá từ khách hàng ({productReviews.length})</span>
              </button>
            </div>

            {activeTab === 'desc' ? (
              <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                <p>{product.description}</p>

                {/* Attributes Table */}
                <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-800">
                    Thông số kỹ thuật sản phẩm
                  </div>
                  <div className="divide-y divide-slate-100">
                    {product.attributes.map((attr, idx) => (
                      <div key={idx} className="grid grid-cols-3 px-4 py-2 text-xs">
                        <span className="text-slate-500 font-medium">{attr.name}</span>
                        <span className="col-span-2 text-slate-800 font-semibold">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {productReviews.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Chưa có đánh giá nào cho sản phẩm này.</p>
                ) : (
                  productReviews.map(r => (
                    <div key={r.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900">{r.userName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-700">{r.comment}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
