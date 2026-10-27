import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Store,
  ArrowRight,
  Search,
  Tag,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "../../api/auth-context";
import { callOperation } from "../../api/operations";
import {
  Loading,
  Empty,
  ErrorView,
  Pagination,
} from "../../bootstrap/components";
import { CustomerRecommendations } from "./CustomerRecommendations";
import { CatalogCard } from "../../live/CatalogCard";
import { useDebounce } from "../../hooks/useDebounce";

export function ProductsSample() {
  const { session } = useAuth(),
    [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "",
    category = params.get("category") ?? "",
    page = Number(params.get("page") ?? 1) || 1;
  const [localSearch, setLocalSearch] = useState(search);
  const isComposingRef = useRef(false);
  const debouncedSearch = useDebounce(localSearch, 250);

  // Sync internal state if URL query changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Propagate debounced query to URL search filter smoothly without interrupting IME
  useEffect(() => {
    if (!isComposingRef.current && debouncedSearch !== search) {
      setFilter("q", debouncedSearch);
    }
  }, [debouncedSearch]);

  const [sort, setSort] = useState<"title" | "price_asc" | "price_desc">(
    "title",
  );
  const setFilter = (key: string, value: string) => {
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        next.delete("page");
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["products", search, page, category, sort],
    queryFn: () =>
      callOperation("listProducts", {
        query: {
          page,
          size: 20,
          q: search,
          ...(category ? { category_id: category } : {}),
          sort,
        },
      }),
  });
  const cats = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: () =>
      callOperation("listCategories", { query: { page: 1, size: 100 } }),
  });
  const types = useQuery({
    queryKey: ["catalog-types"],
    queryFn: () =>
      callOperation("listProductTypes", { query: { page: 1, size: 100 } }),
  });
  const leaves =
    cats.data?.items.filter(
      (c) => !cats.data?.items.some((child) => child.parent_id === c.id),
    ) ?? [];
  const categoryName = (typeId: string) =>
    cats.data?.items.find(
      (c) =>
        c.id === types.data?.items.find((t) => t.id === typeId)?.category_id,
    )?.name;
  return (
    <div>
      <section className="market-hero">
        <small>
          <Sparkles size={13} />
          MUA SẮM ĐA GIAN HÀNG
        </small>
        <h1>
          Mọi lựa chọn yêu thích,
          <br />
          <span className="text-emerald-300">trong cùng một giỏ hàng.</span>
        </h1>
        <p>
          Khám phá sản phẩm, kết hợp ưu đãi và theo dõi từng đơn hàng từ các
          gian hàng bạn chọn.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/cart">
            <ShoppingBag size={16} />
            Khám phá giỏ hàng
            <ArrowRight size={15} />
          </Link>
          <Link to="/customer/store-applications">
            <Store size={16} />
            Mở gian hàng của bạn
          </Link>
        </div>
      </section>
      <section aria-label="Danh mục ngành hàng">
        <div className="flex items-center gap-2">
          <Tag className="text-emerald-600" size={18} />
          <h2>Danh mục ngành hàng</h2>
        </div>
        <div className="market-category-pills">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => setFilter("category", "")}
          >
            Tất cả ngành hàng
          </button>
          {leaves.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setFilter("category", c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {cats.error && (
          <p role="note" className="text-xs text-slate-500">
            Chưa tải được danh mục.{" "}
            <button onClick={() => void cats.refetch()}>
              Thử tải danh mục
            </button>
          </p>
        )}
      </section>
      <section aria-label="Danh sách sản phẩm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2>Khám phá sản phẩm</h2>
            {data && !isFetching && (
              <p className="text-sm text-slate-500">
                {data.total} sản phẩm phù hợp
              </p>
            )}
          </div>
        </div>
        <div className="market-catalog-controls">
          <label>
            Tìm sản phẩm
            <div className="relative">
              <Search
                className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                size={17}
              />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isComposingRef.current) {
                    setFilter("q", localSearch);
                  }
                }}
                placeholder="Tìm tai nghe, áo khoác, đèn bàn…"
                style={{ paddingRight: localSearch ? "36px" : undefined }}
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    setFilter("q", "");
                  }}
                  className="absolute right-8 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </label>
          <label>
            Sắp xếp
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as typeof sort);
                setFilter("page", "");
              }}
            >
              <option value="title">Tên sản phẩm</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
            </select>
          </label>
        </div>
        {isFetching && <Loading />}
        {error && (
          <ErrorView
            error={error}
            onRetry={() => void refetch()}
            retryBusy={isFetching}
          />
        )}
        {!isFetching && !error && (
          <div className="market-product-grid">
            {data?.items.map((p) => (
              <CatalogCard
                key={p.id}
                product={p}
                category={categoryName(p.product_type_id)}
                edit={
                  !!session?.context?.store_membership?.store_id &&
                  p.store_id === session.context.store_membership.store_id &&
                  session.context.roles.some(
                    (r) => r === "STORE_OWNER" || r === "SELLER",
                  )
                }
              />
            ))}
          </div>
        )}
        {!isFetching && !error && data?.items.length === 0 && (
          <Empty>Chưa có sản phẩm phù hợp.</Empty>
        )}
        {data && !error && (
          <Pagination
            page={page}
            size={data.size}
            total={data.total}
            onPage={(value) =>
              setParams((old) => {
                const next = new URLSearchParams(old);
                next.set("page", String(value));
                return next;
              })
            }
          />
        )}
      </section>
      <CustomerRecommendations />
    </div>
  );
}
