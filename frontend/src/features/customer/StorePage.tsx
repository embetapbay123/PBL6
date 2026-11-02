import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  const [page, setPage] = useState(1);
  const profile = useQuery({
    queryKey: ["public-store", id],
    enabled: !!id,
    queryFn: () => callOperation("getPublicStore", { path: { id: id! } }),
  });
  useEffect(() => {
    setPage(1);
  }, [id]);
  const products = useQuery({
    queryKey: ["public-store-products", id, page],
    queryFn: () =>
      callOperation("listStoreProducts", {
        path: { id: id! },
        query: { page, size: 20 },
      }),
    enabled: !!id,
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
          <div className="new-section-heading">
            <h2>
              Sản phẩm{" "}
              <span className="new-count">/ {products.data.total}</span>
            </h2>
          </div>
          {products.data.items.length ? (
            <div className="market-product-grid">
              {products.data.items.map((product) => (
                <CatalogCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <Empty>Gian hàng chưa có sản phẩm đang bán.</Empty>
          )}
          <Pagination
            page={page}
            size={products.data.size}
            total={products.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}
