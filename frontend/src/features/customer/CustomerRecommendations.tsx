import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCustomerRecommendations,
  getRelatedProducts,
} from "../../api/recommendationsChat";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
import { useAuth } from "../../api/auth-context";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { CatalogCard } from "../../live/CatalogCard";

export function CustomerRecommendations({
  productId,
  excludeIds,
  compact = false,
  limit,
}: {
  productId?: string;
  excludeIds?: string[];
  compact?: boolean;
  limit?: number;
}) {
  const { session } = useAuth();
  const customer = session?.context?.roles.includes("CUSTOMER")
    ? session.context.user_id
    : undefined;
  if (!productId && !customer) return null;
  const excludeKey = (excludeIds ?? []).slice().sort().join(",");
  return (
    <Recommendations
      key={
        (productId ?? "for-you") +
        ":" +
        (customer ?? "guest") +
        ":" +
        excludeKey +
        ":" +
        (compact ? "compact" : "full")
      }
      productId={productId}
      excludeIds={excludeIds}
      compact={compact}
      limit={limit}
    />
  );
}

function Recommendations({
  productId,
  excludeIds,
  compact = false,
  limit,
}: {
  productId?: string;
  excludeIds?: string[];
  compact?: boolean;
  limit?: number;
}) {
  const [products, setProducts] = useState<OperationOutputs["getProduct"][]>([]),
    [recent, setRecent] = useState<OperationOutputs["getProduct"][]>([]),
    [error, setError] = useState<unknown>(),
    [loading, setLoading] = useState(true),
    [source, setSource] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [retry, setRetry] = useState(0),
    [expandForYou, setExpandForYou] = useState(false),
    [expandRecent, setExpandRecent] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    setProducts([]);
    (async () => {
      if (productId) {
        const result = await getRelatedProducts(productId, page);
        if (
          !Array.isArray(result?.items) ||
          !Number.isSafeInteger(result.total)
        )
          throw new ApiError(
            503,
            "INVALID_RECOMMENDATION_RESPONSE",
            "Chưa tải được gợi ý sản phẩm. Bạn vẫn có thể chọn và mua sản phẩm đang xem."
          );
        if (active) {
          const filtered = excludeIds?.length
            ? result.items.filter((p) => !p.id || !excludeIds.includes(p.id))
            : result.items;
          setProducts(filtered);
          setTotal(result.total);
        }
      } else {
        const result = await getCustomerRecommendations();
        const excluded = new Set(excludeIds ?? []);
        // Exclude results already shown in main search/catalog
        const forYouIds = result.product_ids.filter((id) => !excluded.has(id));
        // Exclude both main results and items already in forYou from recently viewed
        const forYouSet = new Set(forYouIds);
        const recentIds = result.recently_viewed_product_ids.filter(
          (id) => !excluded.has(id) && !forYouSet.has(id)
        );

        const ids = [...new Set([...forYouIds, ...recentIds])];
        const values = await Promise.all(
          ids.map(async (id) => {
            try {
              return await callOperation("getProduct", { path: { id } });
            } catch (e) {
              if (e instanceof ApiError && e.status === 404) return undefined;
              throw e;
            }
          })
        );
        if (active) {
          const byId = new Map(
            values
              .filter(
                (v): v is OperationOutputs["getProduct"] =>
                  !!v && v.status === "ACTIVE" && !!v.id
              )
              .map((v) => [v.id!, v])
          );
          setProducts(
            forYouIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
          );
          setRecent(
            recentIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
          );
          setSource(result.source);
        }
      }
    })()
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, page, retry]);

  const maxItems = limit ?? (compact ? 4 : undefined);
  const displayedProducts =
    !productId && compact && !expandForYou && maxItems
      ? products.slice(0, maxItems)
      : products;
  const displayedRecent =
    compact && !expandRecent && maxItems
      ? recent.slice(0, maxItems)
      : recent;

  // In compact mode, if neither for-you nor recent has any products after filtering, don't show empty boxes
  if (compact && !loading && !error && !products.length && !recent.length) {
    return null;
  }

  return (
    <>
      {(!compact || products.length > 0 || loading || error) && (
        <section
          className="boot-card"
          aria-label={productId ? "Sản phẩm liên quan" : "Dành cho bạn"}
        >
          <h3>{productId ? "Sản phẩm liên quan" : "Dành cho bạn"}</h3>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorView error={error} onRetry={() => setRetry((n) => n + 1)} />
          ) : (
            <>
              {!products.length && <p>Chưa có gợi ý phù hợp.</p>}
              <div className="market-product-grid">
                {displayedProducts.map((p) => (
                  <CatalogCard key={p.id} product={p} />
                ))}
              </div>
              {productId && (
                <Pagination
                  page={page}
                  size={4}
                  total={total}
                  onPage={setPage}
                />
              )}
              {!productId &&
                compact &&
                !expandForYou &&
                maxItems &&
                products.length > maxItems && (
                  <div style={{ marginTop: "12px", textAlign: "center" }}>
                    <button
                      type="button"
                      className="ui-button ui-button-secondary"
                      onClick={() => setExpandForYou(true)}
                    >
                      Xem thêm ({products.length - maxItems} gợi ý)
                    </button>
                  </div>
                )}
            </>
          )}
        </section>
      )}
      {!productId && !loading && !error && recent.length > 0 && (
        <section className="boot-card" aria-label="Sản phẩm đã xem">
          <h3>Sản phẩm đã xem</h3>
          <div className="market-product-grid">
            {displayedRecent.map((p) => (
              <CatalogCard key={p.id} product={p} />
            ))}
          </div>
          {compact &&
            !expandRecent &&
            maxItems &&
            recent.length > maxItems && (
              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <button
                  type="button"
                  className="ui-button ui-button-secondary"
                  onClick={() => setExpandRecent(true)}
                >
                  Xem thêm ({recent.length - maxItems} sản phẩm đã xem)
                </button>
              </div>
            )}
        </section>
      )}
    </>
  );
}
