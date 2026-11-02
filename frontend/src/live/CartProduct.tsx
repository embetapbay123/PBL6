import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "../components/ProductImage";
import { callOperation } from "../api/operations";
import { formatMoney } from "./useLiveData";
import {variantLabel} from '../features/customer/checkout-intent';

/** Public product metadata enriches a cart row; checkout always uses the server quote. */
export function CartProduct({
  productId,
  variantId,
  quantity,
  quotedLine,
}: {
  productId: string;
  variantId: string;
  quantity?:number;
  quotedLine?:{product_title?:string;variant_title?:string;variant_values?:Record<string,unknown>;sku?:string;unit_price_vnd:number;line_total_vnd:number};
}) {
  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => callOperation("getProduct", { path: { id: productId } }),
  });
  const data = product.error ? undefined : product.data;
  const variant = data?.variants?.find((v) => v.id === variantId);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="market-cart-image cart-product-image">
        <ProductImage src={(data?.images?.find(image=>image.variant_id===variantId)??data?.images?.[0])?.image_url} name={quotedLine?.product_title ?? data?.title ?? 'sản phẩm'} alt=""/>
      </div>
      <div className="min-w-0">
        <Link to={"/products/" + productId}>
          {quotedLine?.product_title ?? data?.title ?? "Xem sản phẩm"}
        </Link>
        <p className="text-xs text-slate-500">
          {quotedLine||variant?variantLabel(quotedLine?.variant_values??variant?.variant_values,quotedLine?.variant_title??'Phân loại tiêu chuẩn'):'Chưa tải phân loại'} · {quotedLine?.sku??variant?.sku??'Chưa tải SKU'}
        </p>
        {(quotedLine||variant) && (
          <p className="text-sm text-emerald-700">
            {quotedLine?'Đơn giá báo giá':'Giá hiện tại'}: {formatMoney(quotedLine?.unit_price_vnd??variant!.price_vnd)}
          </p>
        )}
        {(quotedLine||quantity!==undefined&&variant)&&<p>Thành tiền{quotedLine?'':' dự tính'}: {formatMoney(quotedLine?.line_total_vnd??variant!.price_vnd*quantity!)}</p>}
        {product.error && <small>Chưa tải được thông tin sản phẩm.</small>}
      </div>
    </div>
  );
}
