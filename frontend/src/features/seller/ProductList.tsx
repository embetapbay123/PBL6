import { Button as UiButton } from "../../components/ui/Button";
import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Eye, SquarePen, Package, Store, Sparkles, CheckCircle2 } from "lucide-react";
import { ActionMenu } from "../../components/ActionMenu";
import { Modal } from "../../components/Modal";
import { ProductModerationNotice } from "./ProductModerationNotice";
import { useStoreAccess } from "../../live/useLiveData";
import type { OperationOutputs } from "../../api/operations.generated";
import { callOperation } from "../../api/operations";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { ApiError, isUncertainMutation } from "../../api/client";
import {
  Loading,
  Empty,
  ErrorView,
  Pagination,
} from "../../bootstrap/components";
import { SellerSubNav } from "../../live/SellerWorkspace";
import { AttributeFields } from "./AttributeFields";
import { useProductTypes } from "./useProductTypes";
import { VariantMatrix, type MatrixRow } from "./VariantMatrix";
import { parseVariantPrice } from "./variant-price";
import { SortHeader } from '../../components/SortHeader';
import { variantLabel } from '../../components/variant-identity';

type ManagedProduct = OperationOutputs["listOwnStoreProducts"]["items"][number];
export function SellerProductList() {
  const [params, setParams] = useSearchParams(),
    access = useStoreAccess(),
    cache = useQueryClient(),
    location = useLocation();
  const parsed = Number(params.get("page")),
    page = Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
  const setPage = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });
  const search = params.get("q") ?? "",
    status = params.get("status") ?? "";
  const rawSort=params.get('sort');
  const sort=rawSort==='NAME_DESC'||rawSort==='PRICE_ASC'||rawSort==='PRICE_DESC'?rawSort:'NAME_ASC';
  const setFilter = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("page");
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const returnTo = location.pathname + location.search;
  const [inspect, setInspect] = useState<ManagedProduct>(),
    [decision, setDecision] = useState<ManagedProduct>(),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [actionError, setActionError] = useState<unknown>();
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["own-store-products", page, search, status, sort],
    queryFn: ({ signal }) =>
      callOperation(
        "listOwnStoreProducts",
        {
          query: {
            page,
            size: 20,
            sort,
            ...(search ? { q: search } : {}),
            ...(status
              ? { status: status as "ACTIVE" | "DRAFT" | "STOPPED" }
              : {}),
          },
        },
        { signal },
      ),
  });
  const showCreate = params.get("create") === "1",
    canWrite = access.can("product.store.read_write");
  const navigate = useNavigate();

  useEffect(() => {
    if (showCreate && canWrite) {
      navigate("/seller/products/new", { replace: true });
    }
  }, [showCreate, canWrite, navigate]);

  function create(open: boolean) {
    if (open) {
      navigate("/seller/products/new");
    } else {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("create");
        return next;
      });
    }
  }
  const items = data?.items ?? [];
  async function changeStatus() {
    if (!decision?.id || decision.version === undefined || busy || blocked)
      return;
    setBusy(true);
    setActionError(undefined);
    try {
      await callOperation("updateProduct", {
        path: { id: decision.id },
        body: {
          status: decision.status === "ACTIVE" ? "STOPPED" : "ACTIVE",
          expected_version: decision.version,
        },
      });
      await Promise.all([
        refetch(),
        cache.invalidateQueries({
          queryKey: ["own-store-product", decision.id],
        }),
        cache.invalidateQueries({ queryKey: ["products"] }),
        cache.invalidateQueries({ queryKey: ["public-store-products"] }),
      ]);
      setDecision(undefined);
    } catch (e) {
      setActionError(e);
      if (
        !(e instanceof ApiError) ||
        e.status === 0 ||
        e.status === 409 ||
        e.status >= 500
      )
        setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <SellerSubNav />
      <div className="seller-products-toolbar">
        <div>
          <h1>Sản phẩm của Store</h1>
          <p>Quản lý sản phẩm, phân loại và trạng thái hiển thị.</p>
        </div>
        <div>
          <UiButton
            variant="secondary"
            type="submit"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={15} />
            Làm mới
          </UiButton>
          {access.id && (
            <Link
              className="ui-button ui-button-secondary"
              to={"/stores/" + access.id}
            >
              <Store size={15} />
              Xem gian hàng
            </Link>
          )}
          {canWrite && (
            <Link
              className="ui-button ui-button-primary inline-flex items-center gap-1.5"
              to="/seller/products/new"
              style={{ textDecoration: 'none' }}
            >
              <Plus size={17} />
              Thêm sản phẩm mới
            </Link>
          )}
        </div>
      </div>
      {Boolean(location.state?.notice) && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{String(location.state?.notice)}</span>
        </div>
      )}
      <nav className="order-status-tabs" aria-label="Lọc nhanh sản phẩm">{[['','Tất cả'],['ACTIVE','Đang bán'],['DRAFT','Bản nháp'],['STOPPED','Dừng bán']].map(([value,label])=><button key={value} type="button" aria-pressed={status===value} onClick={()=>setFilter('status',value)}>{label}</button>)}</nav>
      <div className="seller-product-filters seller-filter-bar">
        <input
          type="search"
          maxLength={200}
          aria-label="Tìm tên hoặc SKU trong Store"
          placeholder="Tìm tên hoặc SKU trong toàn Store"
          value={search}
          onChange={(event) => setFilter("q", event.target.value)}
        />
        {(search || status || sort !== "NAME_ASC") && (
          <UiButton variant="secondary" onClick={() => setParams((current) => {
            const next = new URLSearchParams(current);
            for (const key of ["q", "status", "sort", "page"]) next.delete(key);
            return next;
          }, { replace: true })}>Xóa bộ lọc</UiButton>
        )}
        <span>
          {data
            ? data.total.toLocaleString("vi-VN") + " sản phẩm trong gian hàng"
            : "Đang tải danh sách"}
        </span>
      </div>
      {isFetching && <Loading />}
      {error && (
        <ErrorView
          error={error}
          onRetry={() => void refetch()}
          retryBusy={isFetching}
        />
      )}
      {data && (
        <>
          <div
            className="market-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Bảng sản phẩm Store, cuộn ngang để xem đủ cột"
          >
            <table>
              <thead>
                <tr>
                  <SortHeader label="Sản phẩm" value={sort} ascending="NAME_ASC" descending="NAME_DESC" onChange={value=>setFilter('sort',value)}/>
                  <SortHeader label="Giá bán" value={sort} ascending="PRICE_ASC" descending="PRICE_DESC" onChange={value=>setFilter('sort',value)}/>
                  <th scope="col">Phân loại</th>
                  <th scope="col">Đã bán</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="seller-product-title">
                        {product.images?.[0]?.image_url ? (
                          <img
                            src={product.images[0].image_url}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="seller-product-placeholder">
                            <Package size={20} />
                          </span>
                        )}
                        <div>
                          <strong>{product.title}</strong>
                          <small>
                            {product.images?.length ?? 0} ảnh sản phẩm
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {product.variants?.length
                        ? Math.min(
                            ...product.variants.map(
                              (variant) => variant.price_vnd,
                            ),
                          ).toLocaleString("vi-VN") + " ₫"
                        : "Chưa có giá"}
                    </td>
                    <td>{product.variants?.length ?? 0} biến thể</td>
                    <td style={{ fontSize: "14px", fontWeight: 500 }}>{product.sold_count ?? 0}</td>
                    <td>
                      <span className="market-badge">
                        {product.status === "ACTIVE"
                          ? "Đang bán"
                          : product.status === "DRAFT"
                            ? "Bản nháp"
                            : "Dừng bán"}
                      </span>
                      {product.moderation_status === "HIDDEN" && (
                        <small>Đang bị ẩn</small>
                      )}
                    </td>
                    <td>
                      <div className="seller-row-actions">
                        <Link
                          className="ui-button ui-button-secondary"
                          state={{ returnTo }}
                          to={"/seller/products/" + product.id + "/edit"}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 11px", fontSize: "12.5px", textDecoration: "none" }}
                        >
                          <SquarePen size={14} />
                          Sửa
                        </Link>
                        <UiButton
                          variant="ghost"
                          size="sm"
                          type="button"
                          aria-label={"Chi tiết " + product.title}
                          onClick={() => setInspect(product)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 10px", fontSize: "12.5px" }}
                        >
                          <Eye size={14} />
                          Chi tiết
                        </UiButton>
                        <ActionMenu label={"Thao tác " + product.title}>
                          <UiButton
                            variant="secondary"
                            type="submit"
                            disabled={
                              !canWrite ||
                              product.version === undefined ||
                              (product.status !== "ACTIVE" &&
                                product.moderation_status === "HIDDEN")
                            }
                            aria-label={
                              (product.status === "ACTIVE"
                                ? "Dừng bán "
                                : "Mở bán ") + product.title
                            }
                            onClick={() => {
                              setDecision(product);
                              setBlocked(false);
                              setActionError(undefined);
                            }}
                          >
                            {product.status === "ACTIVE"
                              ? "Dừng bán"
                              : product.status === "DRAFT"
                                ? "Đăng bán"
                                : "Mở bán"}
                          </UiButton>
                        </ActionMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!items.length && (
            <Empty>
              {search || status
                ? "Không có sản phẩm phù hợp với bộ lọc trong Store."
                : "Store chưa có sản phẩm nào."}
            </Empty>
          )}
          <Pagination
            page={page}
            size={data.size}
            total={data.total}
            onPage={setPage}
          />
        </>
      )}
      {inspect && (
        <Modal
          label={"Chi tiết " + inspect.title}
          onClose={() => setInspect(undefined)}
        >
          <div className="seller-product-inspect">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', fontSize: '20px' }}>{inspect.title}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="market-badge">{inspect.status==='ACTIVE'?'Đang bán':inspect.status==='DRAFT'?'Bản nháp':'Dừng bán'}</span>
                  <span style={{ fontSize: '13px', color: inspect.moderation_status==='HIDDEN' ? '#b91c1c' : '#15803d' }}>
                    {inspect.moderation_status==='HIDDEN' ? '● Đang bị ẩn' : '● Được hiển thị'}
                  </span>
                </div>
              </div>
              <Link
                className="ui-button ui-button-primary"
                state={{ returnTo }}
                to={"/seller/products/" + inspect.id + "/edit"}
                style={{ textDecoration: 'none', padding: '7px 14px', fontSize: '13px' }}
              >
                Chỉnh sửa sản phẩm
              </Link>
            </div>
            {inspect.images && inspect.images.length > 0 && (
              <div className="market-moderation-images" style={{ margin: '8px 0', padding: '6px 0' }}>
                {inspect.images.map((image) => (
                  <img key={image.id} src={image.image_url} alt={inspect.title} style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                ))}
              </div>
            )}
            <details className="product-description" open>
              <summary>Mô tả sản phẩm</summary>
              <p>{inspect.description || "Chưa có mô tả."}</p>
            </details>
            {inspect.moderation_status==='HIDDEN'?<ProductModerationNotice product={inspect}/>:<details><summary>Lịch sử kiểm duyệt</summary><ProductModerationNotice product={inspect}/></details>}
            <h3 style={{ margin: '14px 0 6px', fontSize: '15px' }}>Biến thể ({inspect.variants?.length ?? 0})</h3>
            <div className="market-table-scroll" style={{ maxHeight: '220px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Phân loại</th>
                    <th>SKU</th>
                    <th>Giá bán</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {inspect.variants?.map((variant) => (
                    <tr key={variant.id}>
                      <td><strong>{variantLabel(variant.variant_values,'Tiêu chuẩn')}</strong></td>
                      <td><code>{variant.sku || '—'}</code></td>
                      <td style={{ fontWeight: 650 }}>{variant.price_vnd.toLocaleString('vi-VN')} ₫</td>
                      <td>
                        <span className="market-badge">{variant.status==='ACTIVE'?'Đang bán':'Dừng bán'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ui-actions" style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <UiButton
                variant="secondary"
                type="submit"
                onClick={() => setInspect(undefined)}
              >
                Đóng
              </UiButton>
            </div>
          </div>
        </Modal>
      )}
      {decision && (
        <Modal
          label={
            decision.status === "ACTIVE"
              ? "Dừng bán sản phẩm"
              : "Mở bán sản phẩm"
          }
          busy={busy}
          onClose={() => setDecision(undefined)}
        >
          <h2>
            {decision.status === "ACTIVE"
              ? "Dừng bán sản phẩm?"
              : "Mở bán sản phẩm?"}
          </h2>
          <p>{decision.title}</p>
          <p>
            {decision.status === "ACTIVE"
              ? "Sản phẩm sẽ ngừng xuất hiện trong danh sách mua sắm."
              : "Sản phẩm và biến thể cần đáp ứng điều kiện bán hàng của hệ thống."}
          </p>
          {actionError !== undefined && <ErrorView error={actionError} />}
          <div className="ui-actions">
            <UiButton
              variant="secondary"
              type="submit"
              disabled={busy}
              onClick={() => setDecision(undefined)}
            >
              Quay lại
            </UiButton>
            {blocked ? (
              <UiButton
                variant="primary"
                type="submit"
                onClick={() =>
                  void refetch().then((result) => {
                    if (!result.error) setDecision(undefined);
                  })
                }
              >
                Tải lại danh sách
              </UiButton>
            ) : (
              <UiButton
                variant="primary"
                type="submit"
                disabled={busy}
                onClick={() => void changeStatus()}
              >
                {busy
                  ? "Đang cập nhật…"
                  : decision.status === "ACTIVE"
                    ? "Xác nhận dừng bán"
                    : "Xác nhận mở bán"}
              </UiButton>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

function CreateProductModal({
  close,
  onCreated,
}: {
  close: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productTypeId, setProductTypeId] = useState("");
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("DRAFT");
  const [createdId, setCreatedId] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const types = useProductTypes();
  const selectedType = types.data?.find((type) => type.id === productTypeId);
  const [sku, setSku] = useState("");
  const [matrix, setMatrix] = useState(false),
    [matrixRows, setMatrixRows] = useState<MatrixRow[]>([]),
    [matrixPreviewCurrent, setMatrixPreviewCurrent] = useState(false);
  const [price, setPrice] = useState("");
  const [appliedPrice, setAppliedPrice] = useState<number>();
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const parsedPrice = parseVariantPrice(price);
  const customPriceCount = matrixRows.filter(row => row.customPrice !== undefined).length;
  const hasCommonRows = matrixRows.length > customPriceCount;
  const commonPricePending = hasCommonRows && (appliedPrice === undefined || appliedPrice !== parsedPrice);
  const matrixVariants = matrixRows.flatMap(({ customPrice, ...row }) => {
    const price_vnd = customPrice === undefined ? appliedPrice : parseVariantPrice(customPrice);
    return row.sku.trim() && price_vnd !== undefined ? [{ ...row, sku: row.sku.trim(), price_vnd }] : [];
  });
  const readyToPrice = matrix
    ? matrixPreviewCurrent && matrixRows.length > 0 && !commonPricePending && matrixVariants.length === matrixRows.length
    : parsedPrice !== undefined;

  const releaseUnsaved = useUnsavedChanges(
    !createdId &&
      !uncertain &&
      !!(title || sku || price || description || imageUrl || productTypeId),
  );
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      submitting ||
      uncertain ||
      createdId ||
      !selectedType ||
      !readyToPrice
    )
      return;
    setSubmitting(true);
    setError(undefined);
    try {
      const prod = await callOperation("createProduct", {
        body: {
          product_type_id: productTypeId,
          title: title.trim(),
          description: description.trim() || undefined,
          attributes: matrix
            ? { ...attributes, ...matrixRows[0].variant_values }
            : attributes,
          variants: matrix
            ? matrixVariants
            : [
                {
                  sku: sku.trim(),
                  price_vnd: parsedPrice!,
                  variant_values: Object.fromEntries(
                    (selectedType?.attribute_definitions ?? [])
                      .filter(
                        (definition) =>
                          definition.variant_axis &&
                          attributes[definition.code] !== undefined,
                      )
                      .map((definition) => [
                        definition.code,
                        attributes[definition.code],
                      ]),
                  ),
                  is_default: true,
                },
              ],
          status,
        },
      });

      const prodId = prod.id;
      if (!prodId)
        throw new Error(
          "Máy chủ không trả về mã sản phẩm. Kiểm tra danh sách trước khi thử lại.",
        );
      setCreatedId(prodId);
      if (prodId && imageUrl.trim()) {
        await callOperation("addProductImage", {
          path: { id: prodId },
          body: {
            image_url: imageUrl.trim(),
            position: 0,
          },
        });
      }

      releaseUnsaved();
      onCreated();
    } catch (err) {
      if (
        err instanceof ApiError &&
        [
          "INVALID_VARIANT_ATTRIBUTES",
          "INVALID_ATTRIBUTES",
          "INVALID_PRODUCT_TYPE",
        ].includes(err.code)
      )
        await types.refetch();
      if (isUncertainMutation(err)) setUncertain(true);
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal label="Thêm sản phẩm mới" onClose={close} busy={submitting}>
      <div>
        <h3>Thêm sản phẩm mới</h3>
        {error !== undefined && <ErrorView error={error} />}
        {createdId && (
          <p role="status">
            Sản phẩm đã được tạo (mã {createdId}). Nếu thêm ảnh thất bại, không
            tạo sản phẩm lần nữa.{" "}
            <Link to={"/seller/products/" + createdId + "/edit"}>
              Tiếp tục hoàn thiện sản phẩm
            </Link>
          </p>
        )}
        {uncertain && (
          <p role="alert">
            Chưa xác định được kết quả. Đóng form và kiểm tra danh sách sản phẩm
            trước khi tạo lại để tránh trùng.
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <fieldset disabled={submitting || uncertain || !!createdId}>
            <label>
              Loại sản phẩm *
              <select
                required
                value={productTypeId}
                onChange={(e) => {
                  setProductTypeId(e.target.value);
                  setAttributes({});
                  setMatrix(false);
                  setMatrixRows([]);
                  setMatrixPreviewCurrent(false);
                  setAppliedPrice(undefined);
                }}
              >
                <option value="">Chọn loại sản phẩm</option>
                {types.data
                  ?.filter((type) => type.status !== "STOPPED")
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
            </label>
            {types.isLoading && <Loading />}
            {types.error && (
              <ErrorView
                error={types.error}
                onRetry={() => {
                  void types.refetch();
                }}
              />
            )}
            {selectedType && (
              <AttributeFields
                definitions={selectedType.attribute_definitions.filter(
                  (definition) => !matrix || !definition.variant_axis,
                )}
                values={attributes}
                onChange={setAttributes}
                disabled={submitting}
              />
            )}
            <label>
              Trạng thái ban đầu
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "DRAFT" | "ACTIVE")
                }
              >
                <option value="DRAFT">Nháp</option>
                <option value="ACTIVE">Đang bán</option>
              </select>
            </label>
            <p>Biến thể mới có tồn kho bằng 0. Hãy nhập kho trước khi bán.</p>
            {!!selectedType?.attribute_definitions.some(
              (definition) => definition.variant_axis,
            ) && (
              <label className="permission-option">
                <input
                  type="checkbox"
                  checked={matrix}
                  onChange={(event) => {
                    setMatrix(event.target.checked);
                    setMatrixPreviewCurrent(false);
                  }}
                />
                Tạo nhiều phân loại theo ma trận
              </label>
            )}
            <div className="shopee-seo-tip-box" style={{ margin: '12px 0 8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                <Sparkles size={14} className="text-amber-600" />
                <span>Gợi ý đặt tên chuẩn SEO Shopee Uni:</span>
              </div>
              <p className="text-xs text-amber-700 m-0">
                <strong>[Loại SP]</strong> + <strong>[Thương hiệu]</strong> + <strong>[Model / Mã đặc trưng]</strong> + <strong>[Đặc tính nổi bật / Màu sắc / Size]</strong>
              </p>
              <p className="text-[11px] text-amber-600/90 mt-1 mb-0 italic">
                * Tránh spam từ khóa, không viết IN HOA toàn bộ, không chèn số điện thoại để tối ưu điểm hiển thị trên sàn.
              </p>
            </div>
            <label>
              <span className="flex items-center justify-between">
                <span>Tên sản phẩm *</span>
                <span className="font-normal text-xs text-slate-500">{title.length}/200 ký tự</span>
              </span>
              <input
                required
                maxLength={200}
                value={title}
                placeholder="VD: Áo Thun Nam Cotton Cổ Tròn Thoáng Khí Phong Cách Basic"
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Mô tả
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="create-product-pricing">
              <label>
                {matrix
                  ? "Tiền tố SKU cho các tổ hợp *"
                  : "SKU phân loại mặc định *"}
                <input
                  required
                  maxLength={matrix ? 196 : 200}
                  value={sku}
                  placeholder="VD: SKU-SP-01"
                  onChange={(e) => {
                    setSku(e.target.value);
                    if (matrix) setMatrixPreviewCurrent(false);
                  }}
                />
              </label>
              <div className="create-product-price">
                <label>
                  {matrix ? "Giá chung (VNĐ)" : "Giá bán (VNĐ) *"}
                  <input type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1}
                    required={!matrix || hasCommonRows} value={price}
                    onChange={event => setPrice(event.target.value)} />
                </label>
                {price !== "" && parsedPrice === undefined && <p className="variant-inline-error">Nhập giá là số nguyên từ 0 ₫.</p>}
                {matrix && matrixRows.length > 0 && (
                  <>
                    <UiButton variant="secondary" disabled={parsedPrice === undefined || !commonPricePending}
                      onClick={() => setAppliedPrice(parsedPrice)}>
                      Áp dụng giá cho các phân loại
                    </UiButton>
                    <p role="status" className="create-product-price-note">
                      {commonPricePending && (appliedPrice === undefined
                        ? "Nhập và áp dụng giá chung trước khi tạo."
                        : `Giá mới chưa được áp dụng. Các dòng giá chung vẫn dùng ${appliedPrice.toLocaleString("vi-VN")} ₫.`)}
                      {!!customPriceCount && ` ${customPriceCount} phân loại giữ giá riêng.`}
                    </p>
                  </>
                )}
              </div>
            </div>
            <label>
              <span>Ảnh bìa sản phẩm (Tỷ lệ 1:1)</span>
              <input
                type="url"
                pattern="https?://.+"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <span className="text-xs text-slate-500 mt-1 block font-normal">
                ★ Chuẩn Shopee: Tỷ lệ vuông 1:1, phông sáng sạch. Bạn có thể bổ sung thêm tối đa 8 ảnh bộ sưu tập và video chi tiết sau khi tạo.
              </span>
              {/^https?:\/\//.test(imageUrl) && (
                <img
                  className="product-url-preview"
                  src={imageUrl}
                  alt="Xem trước ảnh sản phẩm"
                  referrerPolicy="no-referrer"
                />
              )}
            </label>
            {matrix && selectedType && (
              <VariantMatrix
                key={productTypeId}
                axes={selectedType.attribute_definitions.filter(
                  (definition) => definition.variant_axis,
                )}
                sku={sku}
                commonPrice={appliedPrice}
                rows={matrixRows}
                current={matrixPreviewCurrent}
                onSelectionChange={() => setMatrixPreviewCurrent(false)}
                onGenerate={rows => {
                  setMatrixRows(rows);
                  setAppliedPrice(parsedPrice);
                  setMatrixPreviewCurrent(true);
                }}
                onChange={setMatrixRows}
              />
            )}
          </fieldset>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="submit"
              disabled={
                submitting ||
                !!createdId ||
                uncertain ||
                !selectedType ||
                !readyToPrice
              }
            >
              {submitting ? "Đang tạo..." : "Tạo sản phẩm"}
            </button>
            <button type="button" onClick={close} disabled={submitting}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
