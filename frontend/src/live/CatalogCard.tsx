import {ProductImage} from '../components/ProductImage';
import { Link } from "react-router-dom";
import { ArrowUpRight, Store } from "lucide-react";
import {ProductCardActions} from './ProductCardActions';
import {StoreLabel} from './StoreLabel';
import {variantCanOrder} from '../components/variant-availability';
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
  const variants = product.variants?.filter((v) => v.status === "ACTIVE") ?? [];
  const orderable=variants.filter(variantCanOrder),priced=orderable.length?orderable:variants;
  const price = priced.length
    ? Math.min(...priced.map((v) => v.price_vnd))
    : undefined;
  return (
    <article className="product-card">
      <Link className="market-product-link" to={"/products/" + product.id}>
        <div className="market-card-image">
          <ProductImage loading="lazy" src={product.images?.[0]?.image_url} alt={product.title} name={product.title}/>

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
              ? price.toLocaleString("vi-VN") + " ₫"
              : "Chưa có giá bán"}
          </p>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3">
            <small className="flex items-center gap-1">
              <Store size={12} />
              {variants.length} lựa chọn
            </small>
            <span className="product-detail-affordance">
              Xem chi tiết <ArrowUpRight size={14}/>
            </span>
          </div>
        </div>
      </Link>
      {!edit&&<ProductCardActions product={product}/>}
      {product.store_id&&<StoreLabel id={product.store_id} prefix="Gian hàng: " className="product-store-link"/>}
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
