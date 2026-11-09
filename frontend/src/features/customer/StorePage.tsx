import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { CatalogCard } from "../../live/CatalogCard";
import { ContactStoreButton } from "./ContactStoreButton";

export function StorePage() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const storeQuery = params.get("q") ?? "";
  const rawPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 1000000
      ? rawPage
      : 1;

  const [inputValue, setInputValue] = useState(storeQuery);

  useEffect(() => {
    setInputValue(storeQuery);
  }, [storeQuery]);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    try {
      sessionStorage.setItem("lastMarketplaceSearch", currentPath);
    } catch {
      /* Storage is optional. */
    }
  }, [location.pathname, location.search]);

  const profile = useQuery({
    queryKey: ["public-store", id],
    enabled: !!id,
    queryFn: () => callOperation("getPublicStore", { path: { id: id! } }),
  });

  const products = useQuery({
    queryKey: ["public-store-products", id, page, storeQuery],
    queryFn: () =>
      callOperation("listStoreProducts", {
        path: { id: id! },
        query: {
          page,
          size: 20,
          ...(storeQuery.trim() ? { q: storeQuery.trim() } : {}),
        },
      }),
    enabled: !!id,
  });

  const vouchers = useQuery({
    queryKey: ["public-store-vouchers", id],
    enabled: !!id,
    queryFn: () => callOperation("listAvailableVouchers", { query: { store_ids: id! } }),
  });

  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "rating">("default");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }).catch(() => {});
  };

  const applyQuery = (nextQ: string) => {
    const trimmed = nextQ.trim();
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("page");
        if (trimmed) {
          next.set("q", trimmed);
        } else {
          next.delete("q");
        }
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim() !== storeQuery.trim()) {
        applyQuery(inputValue);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [inputValue, storeQuery]);

  const setPage = (nextPage: number) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage > 1) {
        next.set("page", String(nextPage));
      } else {
        next.delete("page");
      }
      return next;
    });
  };

  const rawItems = products.data?.items ?? [];
  const items = [...rawItems].sort((a, b) => {
    if (sortBy === "price_asc") {
      const minA = Math.min(...(a.variants?.map((v) => v.price_vnd) ?? [0]));
      const minB = Math.min(...(b.variants?.map((v) => v.price_vnd) ?? [0]));
      return minA - minB;
    }
    if (sortBy === "price_desc") {
      const maxA = Math.max(...(a.variants?.map((v) => v.price_vnd) ?? [0]));
      const maxB = Math.max(...(b.variants?.map((v) => v.price_vnd) ?? [0]));
      return maxB - maxA;
    }
    if (sortBy === "rating") {
      const rA = a.review_summary?.average ?? 0;
      const rB = b.review_summary?.average ?? 0;
      return rB - rA;
    }
    return 0;
  });

  return (
    <section className="new-store-page">
      <Link to="/">← Tiếp tục khám phá</Link>
      <header className="new-store-header">
        <span className="new-kicker">GIAN HÀNG TRÊN PBL6 MARKET</span>
        <h1>{profile.data?.name ?? "Gian hàng"}</h1>
        {profile.data?.description && <p>{profile.data.description}</p>}
        {profile.data && (
          <p>
            Phí giao hàng cơ bản:{" "}
            {profile.data.shipping_fee_vnd.toLocaleString("vi-VN")} ₫. Tổng phí
            được xác nhận tại bước thanh toán.
          </p>
        )}
      </header>
      {profile.isLoading && <Loading />}
      {profile.error && (
        <ErrorView
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />
      )}
      {profile.data && id && <ContactStoreButton storeId={id} />}

      {vouchers.data?.items && vouchers.data.items.length > 0 && (
        <section className="store-vouchers-section bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 my-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 m-0 flex items-center gap-1.5">
              <span>🎟️</span> Mã Giảm Giá Của Shop
            </h3>
            <span className="text-xs text-slate-500">Lưu mã để sử dụng khi thanh toán</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {vouchers.data.items.map((v) => {
              const discountText =
                v.discount_type === "PERCENT"
                  ? `Giảm ${v.discount_value}%${v.max_discount_vnd ? ` (tối đa ${v.max_discount_vnd.toLocaleString("vi-VN")} ₫)` : ""}`
                  : `Giảm ${v.discount_value.toLocaleString("vi-VN")} ₫`;
              const minText = v.min_goods_vnd
                ? `Đơn tối thiểu ${v.min_goods_vnd.toLocaleString("vi-VN")} ₫`
                : "Áp dụng cho mọi đơn";
              return (
                <div
                  key={v.id ?? v.code}
                  className="bg-white border border-amber-300 rounded-lg p-3 flex flex-col justify-between shadow-xs relative overflow-hidden"
                >
                  <div className="border-b border-dashed border-slate-200 pb-2 mb-2">
                    <span className="text-xs font-bold text-rose-600 block">{discountText}</span>
                    <span className="text-[11px] text-slate-600 block mt-0.5">{minText}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                      {v.code}
                    </span>
                    <button
                      type="button"
                      className="ui-button ui-button-primary text-xs py-1 px-3"
                      onClick={() => handleCopyCode(v.code)}
                    >
                      {copiedCode === v.code ? "✓ Đã sao chép" : "Sao chép mã"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {products.isLoading && <Loading />}
      {products.error && (
        <ErrorView
          error={products.error}
          onRetry={() => void products.refetch()}
          retryBusy={products.isFetching}
        />
      )}
      {products.data && (
        <>
          <div
            className="new-section-heading"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h2>
              Sản phẩm{" "}
              <span className="new-count">/ {products.data.total}</span>
            </h2>
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                applyQuery(inputValue);
              }}
              className="store-inline-search"
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "10px",
                  color: "#888",
                  pointerEvents: "none",
                }}
              />
              <input
                type="search"
                aria-label="Tìm trong gian hàng"
                placeholder="Tìm trong gian hàng…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{
                  padding: "7px 32px 7px 32px",
                  borderRadius: "6px",
                  border: "1px solid var(--ui-line, #e2e8f0)",
                  fontSize: "14px",
                  minWidth: "220px",
                }}
              />
              {inputValue && (
                <button
                  type="button"
                  aria-label="Xóa tìm trong gian hàng"
                  onClick={() => {
                    setInputValue("");
                    applyQuery("");
                  }}
                  style={{
                    position: "absolute",
                    right: "8px",
                    background: "none",
                    border: "none",
                    padding: "2px",
                    cursor: "pointer",
                    color: "#888",
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </form>
          </div>
          <div className="store-sort-bar flex items-center gap-2 mb-4 flex-wrap text-xs">
            <span className="text-slate-500 font-medium">Sắp xếp theo:</span>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${sortBy === "default" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              onClick={() => setSortBy("default")}
            >
              Mặc định
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${sortBy === "rating" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              onClick={() => setSortBy("rating")}
            >
              Đánh giá cao
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${sortBy === "price_asc" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              onClick={() => setSortBy("price_asc")}
            >
              Giá thấp đến cao
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${sortBy === "price_desc" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              onClick={() => setSortBy("price_desc")}
            >
              Giá cao đến thấp
            </button>
          </div>
          {items.length ? (
            <div className="market-product-grid">
              {items.map((product) => (
                <CatalogCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <Empty>
              {storeQuery.trim()
                ? `Không tìm thấy sản phẩm nào khớp với “${storeQuery}” trong gian hàng này.`
                : "Gian hàng chưa có sản phẩm đang bán."}
            </Empty>
          )}
          {products.data.total > products.data.size && (
            <Pagination
              page={page}
              size={products.data.size}
              total={products.data.total}
              onPage={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}
