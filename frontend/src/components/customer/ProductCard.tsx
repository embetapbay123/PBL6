import React from 'react';
import { Product } from '../../types';
import { Star, Store, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const minPrice = Math.min(...product.variants.map(v => v.priceVnd));
  const maxPrice = Math.max(...product.variants.map(v => v.priceVnd));
  const totalStock = product.variants.reduce((acc, v) => acc + (v.quantity - v.reservedQuantity), 0);

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer relative hover:-translate-y-1"
    >
      {/* Image container */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
        {totalStock <= 0 ? (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Tạm hết hàng
            </span>
          </div>
        ) : totalStock < 5 ? (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
            Chỉ còn {totalStock}
          </span>
        ) : null}

        {/* Store badge */}
        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1">
          <Store className="w-3 h-3 text-emerald-400" />
          <span className="line-clamp-1">{product.storeName}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1 font-medium">
            {product.categoryName}
          </div>
          <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 group-hover:text-emerald-600 transition">
            {product.name}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-1 mt-1">{product.shortDescription}</p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-emerald-600 font-bold text-base">
              {minPrice === maxPrice ? formatVnd(minPrice) : `${formatVnd(minPrice)}`}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center text-amber-500 font-semibold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 mr-0.5" />
                {product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : 'Mới'}
              </span>
              <span>• Đã bán {product.salesCount}</span>
            </div>
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition shadow-sm"
            title="Xem chi tiết"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
