import { StarRating } from "../components/StarRating";
import { ProductImage } from "../components/ProductImage";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Store } from "lucide-react";
import { ProductCardActions } from "./ProductCardActions";
import { StoreLabel } from "./StoreLabel";
import { variantCanOrder } from "../components/variant-availability";
import type { OperationOutputs } from "../api/operations.generated";
export function CatalogCard({
  product,
  category,
  edit = false,
}: {
  product: OperationOutputs["getProduct"];
  category?: string;
  edit?: boolean;
}) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const minRaw = searchParams.get('min');
  const maxRaw = searchParams.get('max');
  const minVal = minRaw !== null && minRaw !== '' && !isNaN(Number(minRaw)) ? Number(minRaw) : undefined;
  const maxVal = maxRaw !== null && maxRaw !== '' && !isNaN(Number(maxRaw)) ? Number(maxRaw) : undefined;
  const hasFilter = minVal !== undefined || maxVal !== undefined;

  const variants = product.variants?.filter((v) => v.status === "ACTIVE") ?? [];
  const orderable = variants.filter(variantCanOrder);
  const inRange = (v: (typeof variants)[number]) =>
    (minVal === undefined || v.price_vnd >= minVal) &&
    (maxVal === undefined || v.price_vnd <= maxVal);
  const inRangeOrderable = hasFilter ? orderable.filter(inRange) : [];
  const priced = inRangeOrderable.length
    ? inRangeOrderable
    : orderable.length
      ? orderable
      : variants;
  const selectedVariant =
    inRangeOrderable.find((v) => v.is_default) ??
    inRangeOrderable[0] ??
    priced[0];
  const price = priced.length
    ? Math.min(...priced.map((v) => v.price_vnd))
    : undefined;
  const highest = priced.length
    ? Math.max(...priced.map((v) => v.price_vnd))
    : undefined;
  const soldOut = variants.length > 0 && orderable.length === 0;
  return (
    <article className="product-card">
      <Link
        className="market-product-link"
        to={
          "/products/" +
          product.id +
          (selectedVariant?.id ? "?variant=" + selectedVariant.id : "")
        }
        state={{
          from: location.pathname + location.search,
          variant_id: selectedVariant?.id,
        }}
      >
        <div className="market-card-image">
          <ProductImage
            loading="lazy"
            src={product.images?.[0]?.image_url}
            alt={product.title}
            name={product.title}
          />
          {soldOut && <span className="product-stock-badge">Tạm hết hàng</span>}
        </div>
        <div className="market-product-content">
          <small>
            {category ??
              (typeof product.attributes?.brand === "string"
                ? product.attributes.brand
                : "Sản phẩm")}
          </small>
          <h3>{product.title}</h3>
          <p className="market-price">
            {price !== undefined
              ? (highest !== price ? "Từ " : "") +
                price.toLocaleString("vi-VN") +
                " ₫"
              : "Chưa có giá bán"}
          </p>
          <div className="catalog-rating flex items-center gap-1.5 flex-wrap">
            {!!product.review_summary?.count && (
              <StarRating
                rating={product.review_summary.average}
                count={product.review_summary.count}
              />
            )}
            <span className="text-xs text-slate-500">
              {product.review_summary?.count ? '• ' : ''}Đã bán {product.sold_count ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3">
            <small className="flex items-center gap-1">
              <Store size={12} />
              {variants.length > 1
                ? variants.length + " lựa chọn"
                : "Phân loại tiêu chuẩn"}
            </small>
            <span className="product-detail-affordance">
              Xem chi tiết <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
      </Link>
      {!edit && <ProductCardActions product={product} />}
      {product.store_id && (
        <StoreLabel id={product.store_id} className="product-store-link" />
      )}
      {edit && (
        <div className="px-4 pb-4">
          <Link to={"/seller/products/" + product.id + "/edit"}>
            Sửa sản phẩm
          </Link>
        </div>
      )}
    </article>
  );
}
