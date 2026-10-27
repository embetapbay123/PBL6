import { Link } from "react-router-dom";
import { ImageOff, ShoppingBag, Store } from "lucide-react";
import { useState } from "react";
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
  const [failed, setFailed] = useState(false);
  const variants = product.variants?.filter((v) => v.status === "ACTIVE") ?? [];
  const price = variants.length
    ? Math.min(...variants.map((v) => v.price_vnd))
    : undefined;
  return (
    <article>
      <Link className="market-product-link" to={"/products/" + product.id}>
        <div className="market-card-image">
          {product.images?.[0]?.image_url && !failed ? (
            <img
              loading="lazy"
              src={product.images[0].image_url}
              alt={product.title}
              onError={() => setFailed(true)}
            />
          ) : (
            <ImageOff className="text-slate-300" size={44} />
          )}
        </div>
        <div className="market-product-content">
          <small>
            {category ??
              (typeof product.attributes.brand === "string"
                ? product.attributes.brand
                : "Sản phẩm")}
          </small>
          <h3>{product.title}</h3>
          <p className="market-price">
            {price !== undefined
              ? price.toLocaleString("vi-VN") + " ₫"
              : "Chưa có giá bán"}
          </p>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3">
            <small className="flex items-center gap-1">
              <Store size={12} />
              {variants.length} lựa chọn
            </small>
            <span className="rounded-full bg-emerald-50 p-2 text-emerald-600">
              <ShoppingBag size={15} />
            </span>
          </div>
        </div>
      </Link>
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
