import { Button as UiButton } from "../../components/ui/Button";
import { StarRating } from "../../components/StarRating";
import { ProductImage } from "../../components/ProductImage";
import { useFavorite } from "./favorite-state";
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ApiError } from "../../api/client";
import { useAuth } from "../../api/auth-context";
import { ErrorView, Loading } from "../../bootstrap/components";
import { ProductReviews } from "./ProductReviews"; // 1. Nhập component đánh giá sản phẩm
import { CustomerRecommendations } from "./CustomerRecommendations";
import { ImageOff, ShoppingCart, Zap, Minus, Plus, Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ContactStoreButton } from "./ContactStoreButton";
import {
  isBuyNow,
  saveBuyNow,
  variantLabel,
  ownsCheckoutState,
} from "./checkout-intent";
import { rememberAuthReturn } from "./auth/auth-return";
import { StoreLabel } from "../../live/StoreLabel";
import {
  availableUnits,
  variantCanOrder,
  variantAxisDescription,
} from "../../components/variant-availability";
import { VariantPicker } from "../../components/VariantPicker";
import { Modal } from "../../components/Modal";
import { useQuery } from "@tanstack/react-query";

type Product = OperationOutputs["getProduct"];

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const customer = !!session?.context?.roles.includes("CUSTOMER");
  const navigate = useNavigate();
  const location = useLocation();
  const cache = useQueryClient();
  const [product, setProduct] = useState<Product>();
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const favorite = useFavorite(id ?? ""),
    favoriteSaved = favorite.saved,
    favoriteBusy = favorite.busy || favorite.loading || !favorite.ready;
  const [favoriteError, setFavoriteError] = useState<unknown>();
  const [retry, setRetry] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0),
    availabilityFlight = useRef(false);
  const [checkingStock, setCheckingStock] = useState(false),
    [stockError, setStockError] = useState<unknown>();

  useEffect(() => {
    let active = true;
    const current = ++generation.current;
    availabilityFlight.current = false;
    setCheckingStock(false);
    setStockError(undefined);
    setLoading(true);
    setProduct(undefined);
    setVariantId("");
    setQuantity(1);
    setImageIndex(0);
    setError(undefined);
    setSuccess(false);
    setUncertain(false);
    setFavoriteError(undefined);
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
        const intent = (location.state as { buyNow?: unknown } | null)?.buyNow;
        const route = location.state as { checkoutUserId?: unknown } | null;
        const remembered =
          (!route?.checkoutUserId ||
            ownsCheckoutState(session?.context?.user_id, route)) &&
          isBuyNow(intent) &&
          intent.product_id === id &&
          variants.some((v) => v.id === intent.variant_id)
            ? intent
            : undefined;
        const orderable = variants.filter(variantCanOrder);
        setVariantId(
          remembered?.variant_id ??
            (
              orderable.find((item) => item.is_default) ??
              orderable[0] ??
              variants[0]
            )?.id ??
            "",
        );
        if (remembered) setQuantity(remembered.quantity);
      })
      .catch((value) => {
        if (active) setError(value);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (generation.current === current) generation.current++;
    };
  }, [id, retry, location.state]);

  const variant = product?.variants?.find((item) => item.id === variantId);
  const images = (product?.images ?? []).filter(
    (image, index, all) =>
      all.findIndex((item) => item.image_url === image.image_url) === index,
  );
  const taxonomy = useQuery({
    queryKey: ["catalog-types"],
    enabled: !!product,
    queryFn: () =>
      callOperation("listProductTypes", { query: { page: 1, size: 100 } }),
  });
  const productType = taxonomy.data?.items.find(
    (type) => type.id === product?.product_type_id,
  );
  const definitions =
    taxonomy.data?.items.find((type) => type.id === product?.product_type_id)
      ?.attribute_definitions ?? [];
  const attributeName = (key: string) =>
    definitions.find((d) => d.code === key)?.name ??
    (
      {
        color: "Màu sắc",
        size: "Kích cỡ",
        material: "Chất liệu",
        dimensions: "Quy cách",
        care: "Bảo quản",
        brand: "Thương hiệu",
      } as Record<string, string>
    )[key] ??
    key.replaceAll("_", " ");
  useEffect(() => {
    const associated = product?.images?.find(
      (image) => image.variant_id === variantId,
    );
    if (associated) {
      const index = images.findIndex(
        (image) => image.image_url === associated.image_url,
      );
      if (index >= 0) setImageIndex(index);
    }
  }, [variantId, product?.id]);
  const stock = availableUnits(variant),
    tooMany = stock !== undefined && quantity > stock;
  const available =
    product?.id === id &&
    product?.status === "ACTIVE" &&
    !!variant?.id &&
    variant.status === "ACTIVE" &&
    stock !== 0;
  const canSubmit =
    available && !tooMany && !checkingStock && stockError === undefined;
  async function refreshAvailability() {
    if (!id || availabilityFlight.current || busy) return;
    const current = generation.current;
    availabilityFlight.current = true;
    setCheckingStock(true);
    setStockError(undefined);
    try {
      const fresh = await callOperation("getProduct", { path: { id } });
      if (generation.current === current) {
        setProduct(fresh);
        cache.setQueryData(["product", id], fresh);
      }
    } catch (error) {
      if (generation.current === current) setStockError(error);
    } finally {
      if (generation.current === current) {
        availabilityFlight.current = false;
        setCheckingStock(false);
      }
    }
  }

  const add = async (buyNow = false) => {
    if (
      !canSubmit ||
      !session ||
      !customer ||
      inFlight.current ||
      uncertain ||
      !product?.id ||
      !variant?.id
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    setSuccess(false);
    try {
      if (buyNow) {
        const intent = {
          product_id: product.id,
          variant_id: variant.id,
          quantity,
        };
        const state = saveBuyNow(session.context!.user_id, intent);
        navigate("/checkout", { state });
        return;
      }
      const result = await callOperation("addCartItem", {
        body: { product_id: product.id, variant_id: variant.id, quantity },
      });
      setSuccess(true);
      await cache.invalidateQueries({ queryKey: ["cart-summary"] });
    } catch (value) {
      setError(value);
      if (
        !(value instanceof ApiError) ||
        value.status === 0 ||
        value.status === 408 ||
        value.status >= 500
      )
        setUncertain(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const addFavorite = async () => {
    if (!id || favoriteBusy) return;
    setFavoriteError(undefined);
    try {
      await favorite.toggle();
    } catch (value) {
      setFavoriteError(value);
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
    <section className="product-detail-page">
      <nav className="product-breadcrumb" aria-label="Đường dẫn sản phẩm">
        <Link to="/">Sản phẩm</Link>
        {productType?.category_id && (
          <>
            <span aria-hidden="true">/</span>
            <Link to={"/?category_id=" + productType.category_id}>
              {productType.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.title}</span>
      </nav>
      <Link to="/" className="text-sm">
        ← Tất cả sản phẩm
      </Link>
      <div className="market-detail-columns boot-card mt-5">
        <div>
          <div className="market-detail-image">
            <div className="product-gallery-main">
              <ProductImage
                src={images[imageIndex]?.image_url}
                alt={product.title}
                name={product.title}
                retry
              />
              <button
                type="button"
                className="product-gallery-zoom"
                disabled={!images.length}
                onClick={() => setZoom(true)}
                aria-label={"Phóng to ảnh " + product.title}
              >
                Xem ảnh lớn
              </button>
            </div>
          </div>
          <div className="market-detail-thumbnails">
            {images.map((image, index) => (
              <button
                className="market-image-thumb"
                key={image.id ?? image.image_url}
                aria-label={"Xem ảnh " + (index + 1)}
                aria-pressed={imageIndex === index}
                onClick={() => setImageIndex(index)}
              >
                <ProductImage
                  src={image.image_url}
                  alt=""
                  name={"Ảnh " + (index + 1)}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="product-buy-panel">
          <span className="market-badge">
            {product.status === "ACTIVE" ? "Đang bán" : product.status}
          </span>
          <h1>{product.title}</h1>
          {product.store_id && (
            <div className="product-store-actions">
              <StoreLabel
                id={product.store_id}
                prefix="Gian hàng: "
                className="ui-button ui-button-secondary"
              />
              <ContactStoreButton storeId={product.store_id} product={product.id ? {id:product.id,title:product.title} : undefined} />
            </div>
          )}
          {product.review_summary && (
            <a href="#reviews" className="product-rating-summary">
              {product.review_summary.count ? (
                <StarRating
                  rating={product.review_summary.average}
                  count={product.review_summary.count}
                />
              ) : (
                "Chưa có đánh giá"
              )}
            </a>
          )}
          {variant && (
            <p className="market-detail-price">
              {variant.price_vnd.toLocaleString("vi-VN")} ₫
            </p>
          )}
          {!available && stock !== 0 && (
            <p>Sản phẩm hoặc phân loại này hiện không được bán.</p>
          )}
          <p className="product-stock-status" role="status">
            {stock === 0
              ? "Phân loại đã chọn hiện hết hàng. Chọn phân loại khác hoặc đọc lại sau."
              : stock !== undefined
                ? "Còn " + stock.toLocaleString("vi-VN") + " sản phẩm."
                : "Chưa đọc được số lượng còn hàng."}{" "}
            Giá và tồn được kiểm tra lại khi đặt hàng.
          </p>
          <button
            type="button"
            disabled={busy || checkingStock}
            onClick={() => void refreshAvailability()}
          >
            {checkingStock
              ? "Đang cập nhật…"
              : "Cập nhật giá và tình trạng hàng"}
          </button>
          {stockError !== undefined && <ErrorView error={stockError} />}
          {tooMany && stock !== 0 && (
            <p role="alert">
              Số lượng đã chọn vượt tồn khả dụng vừa đọc. Giảm số lượng hoặc
              chọn phân loại khác; hệ thống giữ nguyên lựa chọn của bạn.
            </p>
          )}
          <VariantPicker
            variants={product.variants ?? []}
            axes={product.variant_axes}
            value={variantId}
            disabled={busy || checkingStock}
            onChange={setVariantId}
          />
          {variant && (
            <p className="product-selection-summary">
              Đã chọn: <strong>{variantLabel(variant.variant_values)}</strong>
              <small>Mã hàng: {variant.sku}</small>
            </p>
          )}
          <label htmlFor="purchase-quantity">Số lượng</label>
          <div className="purchase-quantity">
            <button
              type="button"
              aria-label="Giảm số lượng"
              disabled={!available || busy || quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <Minus size={15} />
            </button>
            <input
              id="purchase-quantity"
              type="number"
              min={1}
              max={stock ?? 2147483647}
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
            <button
              type="button"
              aria-label="Tăng số lượng"
              disabled={!available || busy || quantity >= (stock ?? 2147483647)}
              onClick={() =>
                setQuantity((value) => Math.min(2147483647, value + 1))
              }
            >
              <Plus size={15} />
            </button>
          </div>
          {session && (!canSubmit || !customer) && (
            <p className="purchase-hint">
              {!customer
                ? "Mua hàng cần tài khoản khách hàng."
                : !variant
                  ? "Chọn màu và kích cỡ trước khi mua."
                  : stock === 0
                    ? "Phân loại này đã hết hàng. Hãy chọn phân loại còn hàng."
                    : "Chọn số lượng phù hợp với hàng còn sẵn để tiếp tục."}
            </p>
          )}
          <div className="purchase-actions">
            {session ? (
              <>
                <div className="ui-actions">
                  <UiButton
                    variant="secondary"
                    type="submit"
                    disabled={!canSubmit || busy || uncertain || !customer}
                    onClick={() => void add()}
                  >
                    <ShoppingCart size={19} />
                    {busy ? "Đang xử lý…" : "Thêm vào giỏ hàng"}
                  </UiButton>
                  <UiButton
                    variant="primary"
                    type="submit"
                    disabled={!canSubmit || busy || uncertain || !customer}
                    onClick={() => void add(true)}
                  >
                    <Zap size={18} />
                    {busy ? "Đang xử lý…" : "Mua ngay"}
                  </UiButton>
                </div>
              </>
            ) : canSubmit ? (
              <>
                <Link
                  className="ui-button ui-button-secondary"
                  to="/login"
                  onClick={() =>
                    rememberAuthReturn("/products/" + id, {
                      buyNow: {
                        product_id: id,
                        variant_id: variantId,
                        quantity,
                      },
                    })
                  }
                >
                  Đăng nhập để thêm vào giỏ hàng
                </Link>
                <Link
                  className="ui-button ui-button-primary"
                  to="/login"
                  onClick={() =>
                    rememberAuthReturn("/products/" + id, {
                      buyNow: {
                        product_id: id,
                        variant_id: variantId,
                        quantity,
                      },
                    })
                  }
                >
                  Đăng nhập để mua ngay
                </Link>
              </>
            ) : (
              <p>Chọn phân loại và số lượng còn khả dụng trước khi tiếp tục.</p>
            )}
          </div>
          {uncertain && (
            <p>
              Chưa xác định kết quả. <Link to="/cart">Kiểm tra giỏ hàng</Link>{" "}
              trước khi thêm lại.
            </p>
          )}
          {success && <p role="status">Đã thêm sản phẩm vào giỏ hàng.</p>}
          {session?.context?.roles.includes("CUSTOMER") && (
            <div className="purchase-secondary-actions">
              <UiButton
                variant="secondary"
                type="button"
                aria-pressed={favoriteSaved}
                disabled={favoriteBusy}
                onClick={() => void addFavorite()}
              >
                <Heart size={16} />
                {favoriteSaved
                  ? "Bỏ yêu thích"
                  : favoriteBusy
                    ? "Đang lưu…"
                    : "Lưu yêu thích"}
              </UiButton>{" "}
              <Link to="/customer/favorites">Xem danh sách yêu thích</Link>
            </div>
          )}
          {(favoriteError ?? favorite.error) != null && (
            <ErrorView
              error={favoriteError ?? favorite.error}
              onRetry={() => void favorite.retry()}
            />
          )}
          {error != null && <ErrorView error={error} />}
        </div>
      </div>
      <div className="product-information-grid">
        <section className="boot-card product-description">
          <h2>Mô tả sản phẩm</h2>
          <p>
            {product.description ??
              "Gian hàng chưa bổ sung mô tả cho sản phẩm này."}
          </p>
        </section>
        <section className="boot-card">
          {" "}
          <div className="product-attributes">
            <h3>Thông số sản phẩm</h3>
            <dl>
              {Object.entries({
                ...product.attributes,
                ...variant?.variant_values,
              }).map(([key, value]) => (
                <div className="flex gap-3" key={key}>
                  <dt>{attributeName(key)}</dt>
                  <dd>
                    {typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
      {zoom && (
        <Modal
          label={"Ảnh sản phẩm " + product.title}
          onClose={() => setZoom(false)}
        >
          <div
            className="product-image-viewer"
            onTouchStart={(e) => {
              swipeStart.current =
                e.touches.length === 1
                  ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                  : null;
            }}
            onTouchEnd={(e) => {
              const start = swipeStart.current;
              swipeStart.current = null;
              if (!start || e.changedTouches.length !== 1 || images.length < 2)
                return;
              const dx = e.changedTouches[0].clientX - start.x,
                dy = e.changedTouches[0].clientY - start.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
                setImageIndex(
                  (index) =>
                    (index + (dx < 0 ? 1 : images.length - 1)) % images.length,
                );
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                setImageIndex(
                  (index) => (index + 1) % Math.max(images.length, 1),
                );
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setImageIndex(
                  (index) =>
                    (index + images.length - 1) % Math.max(images.length, 1),
                );
              }
            }}
          >
            <div className="product-viewer-toolbar">
              <span>
                {imageIndex + 1} / {images.length || 1}
              </span>
              <button type="button" onClick={() => setZoom(false)}>
                Đóng ảnh
              </button>
            </div>
            <ProductImage
              src={images[imageIndex]?.image_url}
              alt={product.title}
              name={product.title}
              retry
            />
            {images.length > 1 && (
              <div className="ui-actions">
                <button
                  type="button"
                  aria-label="Ảnh trước"
                  onClick={() =>
                    setImageIndex(
                      (index) => (index + images.length - 1) % images.length,
                    )
                  }
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Ảnh tiếp theo"
                  onClick={() =>
                    setImageIndex((index) => (index + 1) % images.length)
                  }
                >
                  →
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 2. Hiển thị phần đánh giá sản phẩm (Product Reviews) */}
      {product?.id && <ProductReviews productId={product.id} />}
      {product?.id && <CustomerRecommendations productId={product.id} />}
      {product?.store_id && product?.id && (
        <StoreProductsSection
          storeId={product.store_id}
          currentProductId={product.id}
        />
      )}

      <div className="mt-4 space-x-4">
        <Link to="/cart">Giỏ hàng</Link>
        <Link to="/">Quay lại danh sách sản phẩm</Link>
      </div>
    </section>
  );
}

function StoreProductsSection({
  storeId,
  currentProductId,
}: {
  storeId: string;
  currentProductId: string;
}) {
  const products = useQuery({
    queryKey: ["store-products", storeId, "related"],
    staleTime: 60000,
    queryFn: () =>
      callOperation("listStoreProducts", {
        path: { id: storeId },
        query: { page: 1, size: 6 },
      }),
  });
  const items = (products.data?.items ?? []).filter(
    (p) => p.id !== currentProductId,
  );
  if (products.error)
    return (
      <section>
        <h3>Sản phẩm cùng gian hàng</h3>
        <ErrorView
          error={products.error}
          onRetry={() => void products.refetch()}
        />
      </section>
    );
  if (!items.length) return null;

  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      <h3 className="text-lg font-bold mb-4">Sản phẩm khác cùng gian hàng</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.slice(0, 4).map((p) => (
          <Link
            key={p.id}
            to={`/products/${p.id}`}
            className="boot-card block hover:shadow-md transition"
          >
            {p.images?.[0]?.image_url ? (
              <img
                src={p.images[0].image_url}
                alt={p.title}
                className="w-full aspect-square object-cover rounded mb-2"
              />
            ) : (
              <div className="w-full aspect-square bg-slate-100 flex items-center justify-center rounded mb-2 text-slate-400">
                <ImageOff size={24} />
              </div>
            )}
            <h4 className="font-medium text-sm line-clamp-2">{p.title}</h4>
            {p.variants?.[0]?.price_vnd && (
              <p className="text-emerald-600 font-bold text-sm mt-1">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(p.variants[0].price_vnd)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
