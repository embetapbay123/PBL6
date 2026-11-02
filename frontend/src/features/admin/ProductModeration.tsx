import { Button as UiButton } from "../../components/ui/Button";
import { Modal } from "../../components/Modal";
import { useConfirm } from "../../components/ConfirmDialog";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { OperationOutputs } from "../../api/operations.generated";
import { callOperation } from "../../api/operations";
import { useSearchParams } from "react-router-dom";
import { useAdminParties, AdminStoreIdentity } from "./AdminParties";
import { ApiError, isUncertainMutation } from "../../api/client";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { ProductModerationNotice } from "../seller/ProductModerationNotice";
import { ImagePreview } from "../../components/ImagePreview";
type Product = OperationOutputs["listAdminProducts"]["items"][number];
export function ProductModeration() {
  const [params, setParams] = useSearchParams(),
    raw = Number(params.get("page")),
    page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1,
    q = params.get("q") ?? "",
    status =
      params.get("moderation_status") === "HIDDEN"
        ? "HIDDEN"
        : params.get("moderation_status") === "VISIBLE"
          ? "VISIBLE"
          : "";
  const [search, setSearch] = useState(q),
    [revision, setRevision] = useState(0);
  useEffect(() => setSearch(q), [q]);
  const setFilter = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("page");
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  const setPage = (value: number) => setFilter("page", String(value));
  const query = useQuery({
    queryKey: ["admin-products", page, q, status],
    refetchOnWindowFocus: false,
    queryFn: () =>
      callOperation("listAdminProducts", {
        query: {
          page,
          size: 20,
          ...(q ? { q } : {}),
          ...(status ? { moderation_status: status } : {}),
        },
      }),
  });
  const parties = useAdminParties(
    query.data?.items.map((p) => p.store_id) ?? [],
  );
  async function reload() {
    const result = await query.refetch();
    if (result.error) throw result.error;
    setRevision((value) => value + 1);
  }
  return (
    <section
      id="moderation-products"
      className="admin-moderation"
      aria-label="Kiểm duyệt sản phẩm"
    >
      <h3>Kiểm duyệt sản phẩm</h3>
      <form
        className="admin-moderation-search"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter("q", search.trim());
        }}
      >
        <label>
          Tìm sản phẩm để kiểm duyệt
          <input
            type="search"
            maxLength={200}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button>Tìm sản phẩm</button>
      </form>
      <label>
        Hiển thị sản phẩm
        <select
          value={status}
          onChange={(event) => {
            setFilter("moderation_status", event.target.value);
          }}
        >
          <option value="">Tất cả</option>
          <option value="VISIBLE">Được hiển thị</option>
          <option value="HIDDEN">Bị ẩn</option>
        </select>
      </label>
      <button
        disabled={query.isFetching}
        onClick={() => void reload().catch(() => {})}
      >
        Đọc lại danh sách sản phẩm
      </button>
      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {parties.error && (
        <ErrorView
          error={parties.error}
          onRetry={() => void parties.refetch()}
        />
      )}
      {query.data && !query.error && (
        <>
          {!query.data.items.length && (
            <Empty>Không tìm thấy sản phẩm trong bộ lọc này.</Empty>
          )}
          {query.data.items.map((product) => (
            <ProductDecision
              key={product.id + ":" + product.version + ":" + revision}
              product={product}
              reload={reload}
              parties={parties}
            />
          ))}
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
function ProductDecision({
  product,
  reload,
  parties,
}: {
  product: Product;
  reload: () => Promise<void>;
  parties: ReturnType<typeof useAdminParties>;
}) {
  const [decisionOpen, setDecisionOpen] = useState(false);
  const { confirm, dialog } = useConfirm();
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState<unknown>();
  const visible = product.moderation_status === "VISIBLE",
    missing =
      product.version === undefined ||
      !product.id ||
      !product.store_id ||
      !parties.stores.has(product.store_id) ||
      parties.isFetching;
  useUnsavedChanges(decisionOpen && (!!reason.trim() || busy || blocked));
  async function closeDecision() {
    if (busy || blocked) return;
    if (
      reason.trim() &&
      !(await confirm({
        title: "Bỏ lý do chưa gửi?",
        description:
          "Nội dung chưa lưu sẽ bị bỏ. Chưa có quyết định kiểm duyệt nào được gửi.",
        confirmLabel: "Bỏ bản nháp",
      }))
    )
      return;
    setReason("");
    setError(undefined);
    setDecisionOpen(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || blocked || missing || !product.id || !reason.trim()) return;
    setBusy(true);
    setError(undefined);
    const input = {
      path: { id: product.id },
      body: { expected_version: product.version!, reason: reason.trim() },
    };
    try {
      if (visible) await callOperation("hideProduct", input);
      else await callOperation("restoreProduct", input);
      await reload();
    } catch (e) {
      setError(e);
      if (isUncertainMutation(e) || (e instanceof ApiError && e.status === 409))
        setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="boot-card">
      <h4>{product.title}</h4>
      <p>
        Mã sản phẩm: <code>{product.id}</code>
      </p>
      <AdminStoreIdentity id={product.store_id} parties={parties} />
      <ProductModerationNotice product={product} />
      <p>
        Trạng thái bán: {product.status} · Kiểm duyệt:{" "}
        {visible ? "Được hiển thị" : "Bị ẩn"}
      </p>
      <p>{product.description}</p>
      <div className="market-moderation-images">
        {product.images?.map((image, index) => (
          <ImagePreview
            key={image.id}
            src={image.image_url}
            name={product.title + " — ảnh " + (index + 1)}
          />
        ))}
      </div>
      <details>
        <summary>Thuộc tính và biến thể</summary>
        <dl>
          {Object.entries(product.attributes ?? {}).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>
                {typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
              </dd>
            </div>
          ))}
        </dl>
        <ul>
          {product.variants?.map((variant) => (
            <li key={variant.id}>
              {variant.sku} · {variant.price_vnd.toLocaleString("vi-VN")} ₫
            </li>
          ))}
        </ul>
      </details>
      {dialog}
      <button
        type="button"
        disabled={busy || missing}
        onClick={() => setDecisionOpen(true)}
      >
        {visible ? "Ẩn sản phẩm" : "Bỏ ẩn sản phẩm"}
      </button>
      {decisionOpen && (
        <Modal
          label="Quyết định kiểm duyệt sản phẩm"
          busy={busy || blocked}
          onClose={() => void closeDecision()}
        >
          <h3>{product.title}</h3>
          <p>
            Quyết định chỉ thay đổi khả năng hiển thị, không tự mở bán sản phẩm.
          </p>
          <form onSubmit={submit}>
            <label>
              Lý do kiểm duyệt sản phẩm
              <textarea
                aria-label="Lý do kiểm duyệt sản phẩm"
                required
                maxLength={200}
                value={reason}
                disabled={busy || blocked || missing}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button disabled={busy || blocked || missing || !reason.trim()}>
              {busy ? "Đang lưu…" : visible ? "Ẩn sản phẩm" : "Bỏ ẩn sản phẩm"}
            </button>
          </form>
          <UiButton
            type="button"
            variant="secondary"
            disabled={busy || blocked}
            onClick={() => void closeDecision()}
          >
            Hủy kiểm duyệt
          </UiButton>
          {!visible && <p>Bỏ ẩn giữ nguyên trạng thái bán của gian hàng.</p>}
          {error !== undefined && <ErrorView error={error} />}{" "}
          {(blocked || missing) && (
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void reload()
                  .catch(setError)
                  .finally(() => setBusy(false));
              }}
            >
              Tải lại sản phẩm trước khi xử lý tiếp
            </button>
          )}
        </Modal>
      )}
    </article>
  );
}
