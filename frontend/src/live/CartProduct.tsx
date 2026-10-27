import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { callOperation } from "../api/operations";
import { formatMoney } from "./useLiveData";

/** Public product metadata enriches a cart row; checkout always uses the server quote. */
export function CartProduct({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => callOperation("getProduct", { path: { id: productId } }),
  });
  const data = product.error ? undefined : product.data;
  const variant = data?.variants?.find((v) => v.id === variantId);
  return (
    <div className="flex items-center gap-3 min-w-0">
      {data?.images?.[0] ? (
        <img
          className="market-cart-image"
          src={data.images[0].image_url}
          alt=""
        />
      ) : (
        <span className="market-cart-image grid place-items-center">
          <ImageOff size={20} />
        </span>
      )}
      <div className="min-w-0">
        <Link to={"/products/" + productId}>
          {data?.title ?? "Sản phẩm " + productId.slice(-8)}
        </Link>
        <p className="text-xs text-slate-500">
          {variant?.sku ?? "Biến thể " + variantId.slice(-8)}
        </p>
        {variant && (
          <p className="text-sm text-emerald-700">
            Giá hiện tại: {formatMoney(variant.price_vnd)}
          </p>
        )}
        {product.error && <small>Chưa tải được thông tin sản phẩm.</small>}
      </div>
    </div>
  );
}
