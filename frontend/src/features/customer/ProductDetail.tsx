import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ApiError } from "../../api/client";
import { useAuth } from "../../api/auth-context";
import { ErrorView, Loading } from "../../bootstrap/components";
import { ProductReviews } from "./ProductReviews"; // 1. Nhập component đánh giá sản phẩm
import { CustomerRecommendations } from "./CustomerRecommendations";
import { ImageOff } from "lucide-react";

type Product = OperationOutputs["getProduct"];

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [product, setProduct] = useState<Product>();
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [retry, setRetry] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProduct(undefined);
    setVariantId("");
    setQuantity(1);
    setImageIndex(0);
    setError(undefined);
    setSuccess(false);
    if (!id) {
      setLoading(false);
      return;
    }
    callOperation("getProduct", { path: { id } })
      .then((value) => {
        if (!active) return;
        setProduct(value);
        const variants =
          value.variants?.filter(
            (item) => item.id && item.status === "ACTIVE",
          ) ?? [];
        setVariantId(
          (variants.find((item) => item.is_default) ?? variants[0])?.id ?? "",
        );
      })
      .catch((value) => {
        if (active) setError(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);

  const variant = product?.variants?.find((item) => item.id === variantId);
  const available =
    product?.id === id &&
    product?.status === "ACTIVE" &&
    !!variant?.id &&
    variant.status === "ACTIVE";

  const add = async () => {
    if (
      !available ||
      !session ||
      inFlight.current ||
      !product?.id ||
      !variant?.id
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    setSuccess(false);
    try {
      await callOperation("addCartItem", {
        body: { product_id: product.id, variant_id: variant.id, quantity },
      });
      setSuccess(true);
    } catch (value) {
      setError(value);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (loading || (product && product.id !== id)) return <Loading />;
  if (!product)
    return (
      <section className="boot-card">
        {error instanceof ApiError && error.status === 404 && (
          <h1>404 - Không tìm thấy sản phẩm</h1>
        )}
        {error != null && (
          <ErrorView
            error={error}
            onRetry={() => setRetry((value) => value + 1)}
          />
        )}
        <Link to="/">Quay lại danh sách sản phẩm</Link>
      </section>
    );

  return (
    <section>
      <Link to="/" className="text-sm">
        ← Tất cả sản phẩm
      </Link>
      <div className="market-detail-columns boot-card mt-5">
        <div>
          <div className="market-detail-image">
            {product.images?.[imageIndex] ? (
              <img
                src={product.images[imageIndex].image_url}
                alt={product.title}
              />
            ) : (
              <ImageOff className="text-slate-300" size={70} />
            )}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {product.images?.map((image, index) => (
              <button
                className="market-image-thumb"
                key={image.id ?? image.image_url}
                aria-label={"Xem ảnh " + (index + 1)}
                aria-pressed={imageIndex === index}
                onClick={() => setImageIndex(index)}
              >
                <img src={image.image_url} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="market-badge">
            {product.status === "ACTIVE" ? "Đang bán" : product.status}
          </span>
          <h1>{product.title}</h1>
          <p>{product.description ?? "Không có mô tả sản phẩm."}</p>
          {variant && (
            <p className="market-detail-price">
              {variant.price_vnd.toLocaleString("vi-VN")} ₫
            </p>
          )}
          {!available && (
            <p>Sản phẩm hoặc phân loại này hiện không được bán.</p>
          )}
          {product.variants?.map((item) => (
            <button
              key={item.id ?? item.sku}
              disabled={!item.id || item.status !== "ACTIVE" || busy}
              aria-pressed={variantId === item.id}
              onClick={() => setVariantId(item.id!)}
            >
              SKU: {item.sku}
            </button>
          ))}
          <label>
            Số lượng
            <input
              type="number"
              min={1}
              max={2147483647}
              value={quantity}
              disabled={!available || busy}
              onChange={(event) =>
                setQuantity(
                  Math.min(
                    2147483647,
                    Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                  ),
                )
              }
            />
          </label>
          {session ? (
            <button disabled={!available || busy} onClick={add}>
              {busy ? "Đang xử lý…" : "Thêm vào giỏ hàng"}
            </button>
          ) : (
            <Link to="/login">Đăng nhập để thêm vào giỏ hàng</Link>
          )}
          {success && <p role="status">Đã thêm sản phẩm vào giỏ hàng.</p>}
          {error != null && <ErrorView error={error} />}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3>Thông tin sản phẩm</h3>
            <dl>
              {Object.entries(product.attributes ?? {}).map(([key, value]) => (
                <div className="flex gap-3" key={key}>
                  <dt>{key}</dt>
                  <dd>
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* 2. Hiển thị phần đánh giá sản phẩm (Product Reviews) */}
      {product?.id && <ProductReviews productId={product.id} />}
      {product?.id && <CustomerRecommendations productId={product.id} />}

      <div className="mt-4 space-x-4">
        <Link to="/cart">Giỏ hàng</Link>
        <Link to="/">Quay lại danh sách sản phẩm</Link>
      </div>
    </section>
  );
}
