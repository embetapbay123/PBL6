import { Button as UiButton } from "../../components/ui/Button";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Store,
  Tag,
  X,
} from "lucide-react";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { CatalogCard } from "../../live/CatalogCard";
import { Modal } from "../../components/Modal";
import { CustomerRecommendations } from "./CustomerRecommendations";
import { CatalogPriceFilter } from "./CatalogPriceFilter";

const collectionPhotos: Record<string, string> = {
  "Thời trang": "rack-of-blank-tshirts",
  "Túi & phụ kiện": "black-fashion-backpack",
  "Nhà cửa & đời sống": "plants-and-table-decorations",
  "Góc làm việc": "a-minimal-yet-cosy-workspace",
  "Chăm sóc cá nhân": "makeup-brushes-on-marble",
};
const mobileCatalog = "(max-width: 1023px)";
const priceValue = (value: string | null) =>
  value !== null &&
  value !== "" &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) >= 0
    ? Number(value)
    : undefined;
export function MarketplaceHome() {
  const [params, setParams] = useSearchParams(),
    location = useLocation();
  const [view, setView] = useState<"grid" | "list">("grid"),
    [usesFilterDrawer, setUsesFilterDrawer] = useState(() => matchMedia(mobileCatalog).matches),
    [filterOpen, setFilterOpen] = useState(false),
    [filterCategory, setFilterCategory] = useState("");
  const query = params.get("q") ?? "",
    category = params.get("category") ?? params.get("category_id") ?? "",
    rawPage = Number(params.get("page"));
  const page =
    Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 1000000
      ? rawPage
      : 1;
  const sort =
    params.get("sort") === "price_asc"
      ? "price_asc"
      : params.get("sort") === "price_desc"
        ? "price_desc"
        : "title";
  const min = priceValue(params.get("min")),
    max = priceValue(params.get("max")),
    filtered = !!query || !!category || min !== undefined || max !== undefined;
  const landing = !filtered && page === 1,
    Heading = landing ? "h2" : "h1";
  const update = (values: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("page");
      for (const [key, value] of Object.entries(values))
        value ? next.set(key, value) : next.delete(key);
      return next;
    });
  useEffect(() => {
    const media = matchMedia(mobileCatalog);
    const syncLayout = () => {
      setUsesFilterDrawer(media.matches);
      if (!media.matches) setFilterOpen(false);
    };
    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, []);
  useEffect(() => {
    if (location.hash === "#danh-muc" && matchMedia(mobileCatalog).matches) {
      setFilterCategory(category);
      setFilterOpen(true);
    }
  }, [location.key]);
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (location.search) {
      try {
        sessionStorage.setItem("lastMarketplaceSearch", currentPath);
      } catch {
        /* Storage is optional. */
      }
    }
  }, [location.pathname, location.search]);
  const products = useQuery({
    queryKey: ["products", query, category, page, sort, min, max],
    placeholderData: keepPreviousData,
    queryFn: () =>
      callOperation("listProducts", {
        query: {
          page,
          size: 20,
          q: query,
          ...(category ? { category_id: category } : {}),
          sort,
          ...(min !== undefined ? { min_price_vnd: min } : {}),
          ...(max !== undefined ? { max_price_vnd: max } : {}),
        },
      }),
  });
  const categories = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async ({ signal }) => {
      const items: OperationOutputs["listCategories"]["items"] = [];
      for (let p = 1; ; p++) {
        const result = await callOperation(
          "listCategories",
          { query: { page: p, size: 100 } },
          { signal },
        );
        items.push(...result.items);
        if (!result.items.length || items.length >= result.total) return items;
      }
    },
  });
  const types = useQuery({
    queryKey: ["catalog-types"],
    queryFn: () =>
      callOperation("listProductTypes", { query: { page: 1, size: 100 } }),
  });
  const leaves =
    categories.data?.filter(
      (item) => !categories.data?.some((child) => child.parent_id === item.id),
    ) ?? [];
  const categoryFor = (type: string) =>
    categories.data?.find(
      (c) => c.id === types.data?.items.find((t) => t.id === type)?.category_id,
    )?.name;
  const selectedCategory = leaves.find((item) => item.id === category)?.name;
  const collection = (name: string) => leaves.find((c) => c.name === name);
  const categoryLink = (name: string) =>
    collection(name) ? "/?category=" + collection(name)!.id : "/#san-pham";
  const priceFilter = (
    <CatalogPriceFilter
      key={`${min}-${max}`}
      min={min}
      max={max}
      onApply={(min, max) => update({ min, max })}
    />
  );
  return (
    <div
      className={
        "new-home marketplace-refresh" + (landing ? " landing-home" : "")
      }
    >
      {landing && (
        <>
          <section
            className="market-discovery"
            aria-label="Khám phá bộ sưu tập"
          >
            <div className="discovery-main">
              <div className="discovery-copy">
                <span className="discovery-eyebrow">
                  TỪ NHỮNG ĐIỀU GIẢN ĐƠN
                </span>
                <h1>
                  Chọn món bạn thích.
                  <br />
                  Thêm vui mỗi ngày.
                </h1>
                <p>
                  Trang phục dễ mặc, góc nhà dễ thương và những món đồ dùng thật
                  hữu ích.
                </p>
                <Link to={categoryLink("Thời trang")}>
                  Khám phá thời trang <ArrowRight size={17} />
                </Link>
              </div>
              <img
                src="/catalog/rack-of-blank-tshirts.webp"
                alt="Bộ sưu tập áo thun nhiều màu"
                fetchPriority="high"
              />
            </div>
            <Link
              className="discovery-secondary"
              to={categoryLink("Nhà cửa & đời sống")}
            >
              <img
                src="/catalog/a-minimal-yet-cosy-workspace.webp"
                alt="Góc làm việc sáng và gọn"
              />
              <div>
                <span>CHĂM CHÚT GÓC NHỎ</span>
                <h2>
                  Nhà là nơi
                  <br />
                  bạn muốn về.
                </h2>
                <p>
                  Xem đồ dùng cho nhà <ArrowRight size={16} />
                </p>
              </div>
            </Link>
          </section>
          <div className="market-service-strip">
            <span>
              <Check size={16} />
              Kiểm tra món và phân loại trước khi mua
            </span>
            <span>
              <Store size={16} />
              Trao đổi trực tiếp với gian hàng
            </span>
            <span>
              <Tag size={16} />
              Ưu đãi và tổng tiền rõ ràng
            </span>
          </div>
          <section
            className="discovery-categories"
            aria-label="Khám phá danh mục"
          >
            <div className="section-heading">
              <h2>Bạn đang tìm gì?</h2>
              <a href="#san-pham">
                Xem tất cả <ArrowRight size={15} />
              </a>
            </div>
            <div className="discovery-category-grid">
              {leaves.map((item) => (
                <Link to={"/?category=" + item.id} key={item.id}>
                  {collectionPhotos[item.name] ? (
                    <img
                      src={"/catalog/" + collectionPhotos[item.name] + ".webp"}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="category-placeholder">
                      <Tag size={28} />
                    </span>
                  )}
                  <strong>{item.name}</strong>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>
          {query ? "Kết quả tìm kiếm" : (selectedCategory ?? "Tất cả sản phẩm")}
        </span>
      </nav>
      <header className="catalog-heading">
        <div>
          <p className="market-eyebrow">KHÁM PHÁ CÙNG PBL6</p>
          <Heading>
            {query
              ? "Kết quả cho “" + query + "”"
              : (selectedCategory ?? "Khám phá sản phẩm")}
          </Heading>
          {!filtered && <p>Những lựa chọn cho tủ đồ, góc nhà và ngày làm việc.</p>}
          {filtered && products.data && !products.error && (
            <p className="catalog-result-count" aria-live="polite">{products.data.total.toLocaleString("vi-VN")} sản phẩm</p>
          )}
        </div>
      </header>
      <div className="catalog-layout">
        <aside
          id="danh-muc"
          className="catalog-filters"
          aria-label="Bộ lọc sản phẩm"
        >
          <h2>
            <SlidersHorizontal size={17} />
            Bộ lọc tìm kiếm
          </h2>
          <h3>Danh mục</h3>
          <button
            aria-pressed={!category}
            onClick={() => update({ category: "" })}
          >
            Tất cả sản phẩm
          </button>
          {leaves.map((item) => (
            <button
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => update({ category: item.id })}
            >
              {item.name}
            </button>
          ))}
          {categories.error && (
            <ErrorView
              error={categories.error}
              onRetry={() => void categories.refetch()}
            />
          )}
          <div className="catalog-price-area">{priceFilter}</div>
        </aside>
        <section
          id="san-pham"
          className="new-catalog"
          aria-label="Danh sách sản phẩm"
          aria-busy={products.isFetching}
        >
          <div className="catalog-toolbar">
            {usesFilterDrawer && (
              <UiButton
                variant="secondary"
                className="catalog-filter-trigger"
                aria-haspopup="dialog"
                onClick={() => {
                  setFilterCategory(category);
                  setFilterOpen(true);
                }}
              >
                <SlidersHorizontal size={17} />
                Bộ lọc
              </UiButton>
            )}
            <label>
              Sắp xếp
              <select
                value={sort}
                onChange={(event) => update({ sort: event.target.value })}
              >
                <option value="title">Mặc định</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </label>
            <div
              className="commerce-view-toggle"
              aria-label="Cách hiển thị sản phẩm"
            >
              <button
                type="button"
                aria-label="Xem dạng lưới"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                aria-label="Xem dạng danh sách"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={17} />
              </button>
            </div>
          </div>
          {filtered && (
            <div className="catalog-active-filters">
              {query && (
                <button onClick={() => update({ q: "" })}>
                  Từ khóa: {query}
                  <X size={13} />
                </button>
              )}
              {category && (
                <button onClick={() => update({ category: "" })}>
                  {selectedCategory ?? "Danh mục"}
                  <X size={13} />
                </button>
              )}
              {(min !== undefined || max !== undefined) && (
                <button onClick={() => update({ min: "", max: "" })}>
                  {min?.toLocaleString("vi-VN") ?? "0"} –{" "}
                  {max?.toLocaleString("vi-VN") ?? "không giới hạn"} ₫
                  <X size={13} />
                </button>
              )}
              {(category || min !== undefined || max !== undefined) && (
                <button onClick={() => update({ category: "", category_id: "", min: "", max: "" })}>Xóa bộ lọc</button>
              )}
            </div>
          )}
          {products.isFetching && !products.isPending && (
            <div className="catalog-read-status" role="status">
              Đang cập nhật kết quả…
            </div>
          )}
          {products.error && (
            <ErrorView
              error={products.error}
              onRetry={() => void products.refetch()}
              retryBusy={products.isFetching}
            />
          )}
          {products.isPending && (
            <Loading variant="cards" label="Đang tải sản phẩm" />
          )}
          {!products.error && products.data && (
            <>
              <div
                className={
                  "market-product-grid" +
                  (view === "list" ? " product-list-view" : "") +
                  (products.isPlaceholderData ? " catalog-stale" : "")
                }
              >
                {products.data.items.map((product) => (
                  <CatalogCard
                    key={product.id}
                    product={product}
                    category={categoryFor(product.product_type_id)}
                  />
                ))}
              </div>
              {products.data.items.length === 0 && (
                <Empty>
                  <h2>Chưa tìm thấy món phù hợp</h2>
                  <p>Thử từ khóa ngắn hơn hoặc mở rộng khoảng giá.</p>
                  <button onClick={() => setParams({})}>
                    Xem tất cả sản phẩm
                  </button>
                </Empty>
              )}
            </>
          )}
          {products.data && !products.error && (page > 1 || products.data.total > products.data.size) && (
            <Pagination
              page={page}
              size={products.data.size}
              total={products.data.total}
              showTotal={false}
              onPage={(value) =>
                setParams((current) => {
                  const next = new URLSearchParams(current);
                  next.set("page", String(value));
                  return next;
                })
              }
            />
          )}
        </section>
      </div>
      {usesFilterDrawer && filterOpen && (
        <Modal
          variant="drawer"
          label="Bộ lọc sản phẩm"
          onClose={() => setFilterOpen(false)}
        >
          <h2>Lọc sản phẩm</h2>
          <label>
            Danh mục
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
            >
              <option value="">Tất cả sản phẩm</option>
              {leaves.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <CatalogPriceFilter
            min={min}
            max={max}
            onApply={(min, max) => {
              update({ category: filterCategory, min, max });
              setFilterOpen(false);
            }}
          />
          <div className="ui-actions">
            <UiButton
              variant="secondary"
              type="submit"
              onClick={() => {
                setFilterCategory("");
                update({ category: "", min: "", max: "" });
              }}
            >
              Xóa lọc
            </UiButton>
            <UiButton
              variant="secondary"
              type="submit"
              onClick={() => setFilterOpen(false)}
            >
              Đóng
            </UiButton>
          </div>
        </Modal>
      )}
      {(!filtered || products.data?.items?.length === 0) && (
        <CustomerRecommendations
          excludeIds={products.data?.items?.map((p) => p.id).filter((id): id is string => !!id)}
          compact={page > 1 || products.data?.items?.length === 0}
          limit={page > 1 ? 4 : undefined}
        />
      )}
    </div>
  );
}
