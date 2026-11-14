import type { OperationOutputs } from "../api/operations.generated";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ProductImage } from "../components/ProductImage";
import { callOperation } from "../api/operations";
import { formatMoney } from "./useLiveData";
import { variantLabel } from "../features/customer/checkout-intent";
import type { ReactNode } from "react";

/** Public product metadata enriches a cart row; checkout always uses the server quote. */
export function CartProduct({
  productId,
  variantId,
  quantity,
  quotedLine,
  metadata,
  metadataProvided = false,
  metadataLoading = false,
  metadataError,
  hideInlinePrices = false,
  variantControl,
}: {
  metadata?: OperationOutputs["getProduct"];
  metadataProvided?: boolean;
  metadataLoading?: boolean;
  metadataError?: unknown;
  productId: string;
  variantId: string;
  quantity?: number;
  hideInlinePrices?: boolean;
  variantControl?: ReactNode;
  quotedLine?: {
    product_title?: string;
    variant_title?: string;
    variant_values?: Record<string, unknown>;
    sku?: string;
    unit_price_vnd: number;
    line_total_vnd: number;
  };
}) {
  const product = useQuery({
    queryKey: ["product", productId],
    enabled: !metadataProvided,
    staleTime: 30000,
    queryFn: () => callOperation("getProduct", { path: { id: productId } }),
  });
  const data = metadataProvided
    ? metadata
    : product.error
      ? undefined
      : product.data;
  const variant = data?.variants?.find((v) => v.id === variantId);
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="market-cart-image cart-product-image">
        <ProductImage
          src={
            (
              data?.images?.find((image) => image.variant_id === variantId) ??
              data?.images?.[0]
            )?.image_url
          }
          name={quotedLine?.product_title ?? data?.title ?? "sản phẩm"}
          alt=""
        />
      </div>
      <div className="min-w-0 flex-1">
        <Link to={"/products/" + productId} className="font-medium text-sm text-slate-900 hover:underline line-clamp-1">
          {quotedLine?.product_title ?? data?.title ?? "Xem sản phẩm"}
        </Link>
        {variantControl ?? <p className="text-xs text-slate-500 m-0">
          {quotedLine || variant
            ? variantLabel(
                quotedLine?.variant_values ?? variant?.variant_values,
                quotedLine?.variant_title ?? "Phân loại tiêu chuẩn",
              )
            : "Chưa tải phân loại"}
        </p>}
        {!hideInlinePrices && (
          <div className="flex flex-wrap items-baseline gap-x-3 text-xs mt-1">
            {(quotedLine || variant) && (
              <span className="text-slate-600">
                {quotedLine ? "Đơn giá báo giá" : "Giá hiện tại"}:{" "}
                <strong className="text-slate-900">{formatMoney(quotedLine?.unit_price_vnd ?? variant!.price_vnd)}</strong>
              </span>
            )}
            {(quotedLine || (quantity !== undefined && variant)) && (
              <span className="text-emerald-700 font-semibold">
                Thành tiền{quotedLine ? "" : " dự tính"}:{" "}
                {formatMoney(
                  quotedLine?.line_total_vnd ?? variant!.price_vnd * quantity!,
                )}
              </span>
            )}
          </div>
        )}
        {!!(metadataProvided ? metadataError : product.error) && (
          <small className="block text-red-600 text-xs">Chưa tải được thông tin sản phẩm.</small>
        )}
        {metadataProvided && !data && !metadataLoading && !metadataError && (
          <small className="block text-slate-500 text-xs">
            Sản phẩm không còn công khai. Kiểm tra lại trước khi đặt.
          </small>
        )}
      </div>
    </div>
  );
}
