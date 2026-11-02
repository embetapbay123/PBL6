import { useProductBatch } from "./useProductBatch";
import { useConfirm } from "../../components/ConfirmDialog";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "./favorite-state";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { CatalogCard } from "../../live/CatalogCard";
import { CustomerSubNav } from "./CustomerSubNav";

export function FavoritesPage() {
  const favorites = useFavorites();
  const { confirm, dialog } = useConfirm();
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(""),
    [error, setError] = useState<unknown>();
  const query = useQuery({
    queryKey: ["favorites", page],
    queryFn: () =>
      callOperation("listFavorites", { query: { page, size: 20 } }),
  });
  const products = useProductBatch(query.data?.items ?? []);
  useEffect(() => {
    if (query.data && !query.isFetching && !query.error) {
      const last = Math.max(1, Math.ceil(query.data.total / query.data.size));
      if (page > last) setPage(last);
    }
  }, [query.data, query.isFetching, query.error, page]);
  async function remove(id: string) {
    if (busy || query.isFetching) return;
    if (
      !(await confirm({
        title: "Bỏ sản phẩm khỏi yêu thích?",
        description:
          "Bạn có thể tìm lại tại trang sản phẩm và lưu yêu thích lần nữa.",
        confirmLabel: "Bỏ yêu thích",
      }))
    )
      return;
    setBusy(id);
    setError(undefined);
    try {
      await favorites.update(id, false);
    } catch (e) {
      setError(e);
    } finally {
      setBusy("");
    }
  }
  return (
    <section>
      <CustomerSubNav />
      {dialog}
      <Link to="/">← Tiếp tục khám phá</Link>
      <h1>Sản phẩm yêu thích</h1>
      {query.isLoading && <Loading />}
      {!query.isLoading && query.isFetching && (
        <p role="status">Đang đọc lại danh sách yêu thích…</p>
      )}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {error !== undefined && <ErrorView error={error} />}
      {products.error && (
        <ErrorView
          error={products.error}
          onRetry={() => void products.refetch()}
        />
      )}
      {query.data && !query.error && (
        <>
          {!query.data.items.length && !query.isFetching && (
            <Empty>
              {query.data.total === 0
                ? "Danh sách yêu thích của bạn đang trống."
                : "Đang trở về trang còn sản phẩm yêu thích…"}
            </Empty>
          )}
          <div className="market-product-grid">
            {query.data.items.map((id) => {
              const product = products.data?.find((p) => p.id === id);
              return (
                <div key={id}>
                  {product ? (
                    <CatalogCard product={product} />
                  ) : products.isPending ? (
                    <p>Đang tải thông tin sản phẩm…</p>
                  ) : products.error ? (
                    <p>Chưa tải được thông tin sản phẩm.</p>
                  ) : (
                    <p>Sản phẩm này hiện không còn hiển thị.</p>
                  )}
                  <button
                    disabled={!!busy || query.isFetching}
                    onClick={() => void remove(id)}
                  >
                    {busy === id ? "Đang bỏ…" : "Bỏ yêu thích"}
                  </button>
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            size={query.data.size}
            total={query.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}
