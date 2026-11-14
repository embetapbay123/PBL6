import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import { useAuth } from "../../api/auth-context";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { CatalogCard } from "../../live/CatalogCard";
import { useProductBatch } from "./useProductBatch";

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
  return (
    <Recommendations
      key={
        (productId ?? "for-you") +
        ":" +
        (customer ?? "guest") +
        ":" +
        (compact ? "compact" : "full")
      }
      productId={productId}
      customer={customer}
      excludeIds={excludeIds}
      compact={compact}
      limit={limit}
    />
  );
}

function Recommendations({
  productId,
  customer,
  excludeIds,
  compact = false,
  limit,
}: {
  productId?: string;
  customer?: string;
  excludeIds?: string[];
  compact?: boolean;
  limit?: number;
}) {
  const [page, setPage] = useState(1),
    [expandForYou, setExpandForYou] = useState(false),
    [expandRecent, setExpandRecent] = useState(false);
  const personal = useQuery({
    queryKey: ["customer-recommendations", customer],
    enabled: !productId && !!customer,
    staleTime: 30000,
    // Read consent again after leaving this view instead of retaining a private feed.
    gcTime: 0,
    retry: false,
    queryFn: async ({signal}) => {
      const result = await callOperation("getForYou", {}, {signal});
      if (!Array.isArray(result?.product_ids) || !Array.isArray(result.recently_viewed_product_ids) ||
          ![...result.product_ids, ...result.recently_viewed_product_ids].every(id => typeof id === "string"))
        throw new ApiError(503, "INVALID_RECOMMENDATION_RESPONSE", "Chưa tải được gợi ý sản phẩm. Bạn vẫn có thể chọn và mua sản phẩm đang xem.");
      return result;
    },
  });
  const related = useQuery({
    queryKey: ["related-products", productId, page],
    enabled: !!productId,
    staleTime: 30000,
    retry: false,
    queryFn: async ({signal}) => {
      const result = await callOperation("getRelatedProducts", {path:{id:productId!},query:{page,size:4}}, {signal});
      if (!Array.isArray(result?.items) || !Number.isSafeInteger(result.total))
        throw new ApiError(503, "INVALID_RECOMMENDATION_RESPONSE", "Chưa tải được gợi ý sản phẩm. Bạn vẫn có thể chọn và mua sản phẩm đang xem.");
      return result;
    },
  });
  // Exclusion changes only the displayed IDs, never the personal feed request.
  const excluded = new Set(excludeIds ?? []);
  const forYouIds = (personal.data?.product_ids ?? []).filter(id => !excluded.has(id));
  const forYouSet = new Set(forYouIds);
  const recentIds = (personal.data?.recently_viewed_product_ids ?? []).filter(id => !excluded.has(id) && !forYouSet.has(id));
  const ids = productId ? [] : [...new Set([...forYouIds, ...recentIds])];
  // One bounded list request replaces the previous parallel detail requests.
  const batch = useProductBatch(ids);
  const byId = new Map((batch.data ?? []).filter(p => p.status === "ACTIVE" && !!p.id).map(p => [p.id!, p]));
  const products = productId
    ? (related.data?.items ?? []).filter(p => !p.id || !excluded.has(p.id))
    : forYouIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  const recent = recentIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  const total = related.data?.total ?? 0;
  const loading = productId ? related.isPending : personal.isPending || (ids.length > 0 && batch.isPending);
  const error = productId ? related.error : personal.error ?? (ids.length > 0 ? batch.error : null);
  const retry = () => {
    if (productId) void related.refetch();
    else if (personal.error) void personal.refetch();
    else if (ids.length) void batch.refetch();
  };

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
            <ErrorView error={error} onRetry={retry} />
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
