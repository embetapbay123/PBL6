import { FormField } from "../components/FormField";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callOperation } from "../api/operations";
import { useUnsavedChanges } from "../components/useUnsavedChanges";
import { ApiError, isUncertainMutation } from "../api/client";
import { ErrorView, FormPanel, Loading } from "./components";
import { SellerSubNav } from "../live/SellerWorkspace";
import { VariantEditor } from "../features/seller/VariantEditor";
import { ProductAttributesEditor } from "../features/seller/ProductAttributesEditor";
import { AttributeFields } from "../features/seller/AttributeFields";
import { useProductTypes } from "../features/seller/useProductTypes";
import { ProductReadiness, useProductStock } from "../features/seller/ProductReadiness";
import { ProductModerationNotice } from "../features/seller/ProductModerationNotice";
import { ActionMenu } from "../components/ActionMenu";
import { useConfirm } from "../components/ConfirmDialog";
import { Button } from "../components/ui/Button";
import { Sparkles, Info, Truck, CheckCircle2, Image as ImageIcon } from "lucide-react";
type SaleStatus = "DRAFT" | "ACTIVE" | "STOPPED";
/**
 * Seller Product edit form.
 *
 * `updateProduct` now accepts the full payload, so the form sends `status` alongside
 * title/description and still relies on `expected_version` for optimistic concurrency: a stale tab
 * gets a 409 instead of silently overwriting a newer edit.
 */
export function ProductEdit() {
  const { id } = useParams();
  const activeProductId = useRef(id);
  activeProductId.current = id;
  const { confirm, dialog: imageConfirmation } = useConfirm();
  const [sortingImages, setSortingImages] = useState(false);
  const [section, setSection] = useState(
    () =>
      ["general", "attributes", "variants", "images"].find(
        (key) => window.location.hash === "#product-" + key,
      ) ?? "general",
  );
  const cache = useQueryClient(),
    location = useLocation();
  const candidate = location.state?.returnTo;
  const returnTo =
    typeof candidate === "string" &&
    /^\/seller\/products(?:\?|$)/.test(candidate)
      ? candidate
      : "/seller/products";
  const query = useQuery({
    queryKey: ["own-store-product", id],
    queryFn: () => callOperation("getOwnStoreProduct", { path: { id: id! } }),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });
  const stock = useProductStock(query.data);
  const types = useProductTypes();
  const productType = types.data?.find(
      (type) => type.id === query.data?.product_type_id,
    ),
    axes =
      productType?.attribute_definitions.filter(
        (definition) => definition.variant_axis,
      ) ?? [];
  const canAddVariant =
    !!productType &&
    (axes.length > 0 || query.data?.variants?.length === 0) &&
    !types.error &&
    !types.isFetching;
  const [variantValues, setVariantValues] = useState<Record<string, unknown>>(
    {},
  );
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [status, setStatus] = useState<SaleStatus>("DRAFT"),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const showStockStatus = !!query.data && status === 'ACTIVE' && !stock.stocked;
  const [sku, setSku] = useState(""),
    [price, setPrice] = useState(""),
    [imageUrl, setImageUrl] = useState("");
  const [extraError, setExtraError] = useState<unknown>(),
    [extraBusy, setExtraBusy] = useState(false),
    [extraNotice, setExtraNotice] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(
    dirty ||
      !!sku ||
      !!price ||
      !!imageUrl ||
      Object.keys(variantValues).length > 0,
  );
  const [needsReload, setNeedsReload] = useState(false);
  useEffect(() => {
    if (query.data) {
      if (dirty) {
        setNeedsReload(true);
        return;
      }
      setTitle(query.data.title);
      setDescription(query.data.description ?? "");
      setStatus((query.data.status ?? "DRAFT") as SaleStatus);
    }
  }, [
    query.data?.id,
    query.data?.title,
    query.data?.description,
    query.data?.status,
  ]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!query.data || !id || needsReload || extraBusy) return;
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      const product = await callOperation("updateProduct", {
        path: { id },
        body: {
          title,
          description,
          status,
          expected_version: query.data.version!,
        },
      });
      setDirty(false);
      cache.setQueryData(["own-store-product", id], product);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["products"] }),
        cache.invalidateQueries({ queryKey: ["own-store-products"] }),
      ]);
      setSaved(true);
    } catch (e) {
      if (
        e instanceof ApiError &&
        [
          "INVALID_VARIANT_ATTRIBUTES",
          "INVALID_ATTRIBUTES",
          "INVALID_PRODUCT_TYPE",
        ].includes(e.code)
      )
        await types.refetch();
      if (
        isUncertainMutation(e) ||
        (e instanceof ApiError && e.code === "VERSION_CONFLICT")
      )
        setNeedsReload(true);
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function addVariant(event: FormEvent) {
    event.preventDefault();
    if (!id || extraBusy || uncertain || busy || !canAddVariant) return;
    setExtraBusy(true);
    setExtraError(undefined);
    setExtraNotice("");
    try {
      await callOperation("createVariant", {
        path: { id },
        body: {
          sku: sku.trim(),
          price_vnd: Number(price),
          variant_values: variantValues,
        },
      });
      setSku("");
      setPrice("");
      setVariantValues({});
      void Promise.allSettled([
        cache.invalidateQueries({ queryKey: ["store-inventory"] }),
        cache.invalidateQueries({ queryKey: ["own-store-products"] }),
      ]);
      await query.refetch();
      setExtraNotice("Đã thêm biến thể. Nhập tồn kho trước khi bán.");
    } catch (e) {
      if (
        e instanceof ApiError &&
        ["INVALID_VARIANT_ATTRIBUTES", "INVALID_PRODUCT_TYPE"].includes(e.code)
      )
        await types.refetch();
      if (isUncertainMutation(e)) setUncertain(true);
      setExtraError(e);
    } finally {
      setExtraBusy(false);
    }
  }
  async function addImage(event: FormEvent) {
    event.preventDefault();
    if (!id || extraBusy || uncertain || busy) return;
    setExtraBusy(true);
    setExtraError(undefined);
    setExtraNotice("");
    try {
      await callOperation("addProductImage", {
        path: { id },
        body: { image_url: imageUrl.trim() },
      });
      setImageUrl("");
      const result = await query.refetch();
      if (result.error) throw result.error;
      setExtraNotice("Đã thêm ảnh sản phẩm.");
    } catch (e) {
      if (isUncertainMutation(e)) setUncertain(true);
      setExtraError(e);
    } finally {
      setExtraBusy(false);
    }
  }
  async function removeImage(imageId: string, index: number) {
    if (!id || busy || extraBusy || uncertain) return;
    const accepted = await confirm({
      title: "Bỏ ảnh sản phẩm?",
      description: `Ảnh ${index + 1} sẽ được gỡ khỏi sản phẩm.`,
      confirmLabel: "Bỏ ảnh",
      danger: true,
    });
    if (!accepted || activeProductId.current !== id) return;
    setExtraBusy(true);
    setExtraError(undefined);
    setExtraNotice("");
    try {
      await callOperation("removeProductImage", {
        path: { id, image_id: imageId },
      });
      const result = await query.refetch();
      if (result.error) throw result.error;
      await cache.invalidateQueries({ queryKey: ["products"] });
      setExtraNotice("Đã bỏ ảnh sản phẩm.");
    } catch (e) {
      if (isUncertainMutation(e)) setUncertain(true);
      setExtraError(e);
    } finally {
      setExtraBusy(false);
    }
  }
  async function moveImage(index: number, direction: -1 | 1) {
    const images = query.data?.images ?? [],
      target = index + direction;
    if (!id || busy || extraBusy || uncertain || target < 0 || target >= images.length)
      return;
    const expected_image_ids = images.map((image) => image.id),
      image_ids = [...expected_image_ids];
    [image_ids[index], image_ids[target]] = [
      image_ids[target],
      image_ids[index],
    ];
    setExtraBusy(true);
    setExtraError(undefined);
    setExtraNotice("");
    try {
      await callOperation("reorderProductImages", {
        path: { id },
        body: { expected_image_ids, image_ids },
      });
      const result = await query.refetch();
      if (result.error) throw result.error;
      await cache.invalidateQueries({ queryKey: ["products"] });
      setExtraNotice("Đã cập nhật thứ tự ảnh.");
    } catch (e) {
      if (isUncertainMutation(e)) setUncertain(true);
      if (e instanceof ApiError && e.code === "IMAGE_ORDER_CONFLICT")
        await query.refetch();
      setExtraError(e);
    } finally {
      setExtraBusy(false);
    }
  }
  if (query.isLoading)
    return (
      <>
        <SellerSubNav />
        <Loading />
      </>
    );
  if (query.error)
    return (
      <>
        <SellerSubNav />
        <div style={{ marginBottom: "1rem" }}>
          <Link to={returnTo}>← Quay lại danh sách sản phẩm</Link>
        </div>
        <ErrorView error={query.error} />
      </>
    );
  const images = query.data?.images ?? [];
  const imagesLocked = busy || extraBusy || uncertain;
  const extraFeedback = <>
    {uncertain && (
      <p role="alert">Chưa xác định được kết quả thao tác. Hãy tải lại trang và kiểm tra dữ liệu trước khi thử lại.</p>
    )}
    {extraError !== undefined && <ErrorView error={extraError} />}
    {extraNotice && <p role="status">{extraNotice}</p>}
  </>;
  return (
    <div
      className="seller-product-editor"
      style={{ maxWidth: "960px", margin: "0 auto", padding: "1rem" }}
      onClick={(event) => {
        const anchor = (event.target as Element).closest(
          'a[href^="#product-"]',
        );
        if (!anchor) return;
        const value = anchor.getAttribute("href")!.replace("#product-", "");
        if (!["general", "attributes", "variants", "images"].includes(value))
          return;
        event.preventDefault();
        setSection(value);
        requestAnimationFrame(() =>
          document
            .getElementById("product-" + value)
            ?.scrollIntoView({ block: "start" }),
        );
      }}
    >
      <SellerSubNav />
      <header className="product-editor-heading"><h1>Chỉnh sửa sản phẩm</h1><p>{query.data?.title}</p></header>
      {query.data && <ProductModerationNotice product={query.data} />}
      <div style={{ marginBottom: "1rem" }}>
        <Link
          to={returnTo}
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          ← Quay lại danh sách sản phẩm
        </Link>
      </div>
      <nav className="workspace-sections product-editor-nav" aria-label="Các phần sản phẩm">
        {[
          ["general", "Thông tin chung"],
          ["attributes", "Thuộc tính"],
          ["variants", "Biến thể & giá"],
          ["images", "Hình ảnh"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={section === key}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
        {id && <Link to={"/seller/inventory?product_id=" + id}>Tồn kho</Link>}
      </nav>
      {query.data && (
        <details className="product-readiness-disclosure">
          <summary>Điều kiện bán</summary>
          <ProductReadiness product={query.data} stock={stock} />
        </details>
      )}
      <div id="product-general" hidden={section !== "general"}>
        <FormPanel
          title="Sửa sản phẩm"
          busy={busy}
          disabled={needsReload || extraBusy}
          error={error}
          onSubmit={submit}
        >
          <FormField label="Tên sản phẩm" name="title" error={error}>
            <input
              value={title}
              onChange={(e) => {
                setDirty(true);
                setTitle(e.target.value);
              }}
              required
              maxLength={200}
            />
          </FormField>
          <div className="shopee-seo-tip-box mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
              <Sparkles size={14} className="text-orange-500" /> Công thức đặt tên chuẩn SEO Shopee Uni:
            </div>
            <p className="text-xs text-slate-600 m-0 mt-1">
              <code>[Loại sản phẩm]</code> + <code>[Thương hiệu]</code> + <code>[Model/Mã]</code> + <code>[Đặc tính nổi bật]</code>
            </p>
            <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
              <span>Ví dụ: <em>Áo polo nam Coolmate sợi cafe khử mùi co giãn</em></span>
              <span className={`font-mono font-semibold ${title.length > 120 ? 'text-amber-600' : 'text-slate-500'}`}>{title.length}/200 ký tự</span>
            </div>
          </div>
          <FormField label="Mô tả" name="description" error={error}>
            <textarea
              value={description}
              onChange={(e) => {
                setDirty(true);
                setDescription(e.target.value);
              }}
              maxLength={10000}
            />
          </FormField>
          <label>
            Trạng thái bán
            <select
              value={status}
              aria-describedby={showStockStatus ? 'product-sale-stock' : undefined}
              onChange={(e) => {
                setDirty(true);
                setStatus(e.target.value as SaleStatus);
              }}
            >
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="STOPPED">Dừng bán</option>
            </select>
          </label>
          {showStockStatus && (
            <div id="product-sale-stock" className="product-sale-stock" role="status">
              {!stock.active.length ? <p>Chưa có phân loại đang bán.</p> : !stock.canStock ? (
                <p>Nhờ chủ shop hoặc nhân viên kho kiểm tra tồn khả dụng.</p>
              ) : stock.inventory.isLoading ? <p>Đang kiểm tra tồn khả dụng…</p> : stock.stocked === undefined ? (
                <p>Chưa xác nhận được tồn khả dụng. <Link to={'/seller/inventory?product_id=' + id}>Kiểm tra kho sản phẩm này</Link></p>
              ) : (
                <>
                  <p><strong>Chưa có tồn khả dụng</strong> · <Link to={'/seller/inventory?product_id=' + id}>Nhập kho sản phẩm này</Link></p>
                  {query.data?.moderation_status !== 'HIDDEN' && <p>Khách sẽ thấy trạng thái <strong>Tạm hết hàng</strong>.</p>}
                </>
              )}
            </div>
          )}
        </FormPanel>
      </div>
      {needsReload && (
        <p role="alert">
          Chưa thể lưu tiếp từ dữ liệu cũ hoặc kết quả chưa rõ. Bản nháp vẫn
          giữ; tải lại sẽ thay bằng dữ liệu server, hãy kiểm tra trước khi chọn.{" "}
          <button
            type="button"
            onClick={() => {
              void query.refetch().then((result) => {
                if (!result.error && result.data) {
                  setDirty(false);
                  setTitle(result.data.title);
                  setDescription(result.data.description ?? "");
                  setStatus(result.data.status as SaleStatus);
                  setNeedsReload(false);
                  setError(undefined);
                }
              });
            }}
          >
            Tải lại sản phẩm
          </button>
        </p>
      )}
      {saved && <p role="status">Đã lưu sản phẩm.</p>}
      <div id="product-attributes" hidden={section !== "attributes"}>
        {query.data && (
          <ProductAttributesEditor
            key={`attributes:${query.data.id}`}
            product={query.data}
          />
        )}
      </div>
      <div id="product-variants" hidden={section !== "variants"}>
        {query.data && (
          <VariantEditor
            key={query.data.id}
            product={query.data}
            reload={async () => {
              const result = await query.refetch();
              if (result.error) throw result.error;
              if (!result.data) throw new Error("Không thể tải sản phẩm.");
              return result.data;
            }}
          />
        )}
      </div>
      <section className="boot-card" hidden={section !== "variants"}>
        <h2>Thêm biến thể</h2>
        <p className="text-sm text-slate-500 mb-3">
          Biến thể mới bắt đầu với tồn kho bằng 0. Các biến thể phải có tổ hợp
          thuộc tính khác nhau.
        </p>
        {types.error && (
          <ErrorView error={types.error} onRetry={() => void types.refetch()} />
        )}
        <form onSubmit={addVariant}>
          <label>
            SKU mới
            <input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </label>
          <label>
            Giá bán (VNĐ)
            <input
              type="number"
              min="0"
              step="1"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          {axes.length ? (
            <AttributeFields
              definitions={axes}
              values={variantValues}
              onChange={setVariantValues}
              disabled={extraBusy || uncertain}
            />
          ) : (
            <p>
              Loại này không có trục phân loại. Sản phẩm dùng một phân loại tiêu
              chuẩn; sửa dòng hiện có thay vì tạo dòng trùng.
            </p>
          )}
          <button disabled={extraBusy || uncertain || !canAddVariant}>
            Thêm biến thể
          </button>
        </form>
      </section>
      <section
        id="product-images"
        className="boot-card"
        hidden={section !== "images"}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="m-0">Bộ sưu tập hình ảnh sản phẩm</h2>
          <span className="text-xs font-semibold text-slate-500">{images.length}/9 ảnh</span>
        </div>
        <div className="shopee-image-guide-banner mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
            <ImageIcon size={14} className="text-orange-500" /> Tiêu chuẩn hình ảnh Shopee Uni:
          </div>
          <ul className="text-xs text-slate-600 m-0 mt-1 pl-4 list-disc space-y-0.5">
            <li>Ảnh bìa (ô số 1) bắt buộc khung hình tỷ lệ <strong>1:1</strong> (tối thiểu 500x500px, đề xuất 800x800px).</li>
            <li>Nền sáng sạch, sản phẩm rõ nét chiếm ít nhất 70% diện tích khung hình. Tối đa 9 hình ảnh.</li>
          </ul>
        </div>
        <div className="product-image-toolbar">
          <form onSubmit={addImage} className="product-image-add">
            <label>Đường dẫn ảnh
              <input type="url" required value={imageUrl} disabled={imagesLocked}
                onChange={event => setImageUrl(event.target.value)} />
            </label>
            <Button type="submit" disabled={imagesLocked}>Thêm ảnh</Button>
          </form>
          {images.length > 1 && (
            <Button variant="secondary" aria-pressed={sortingImages} disabled={imagesLocked}
              onClick={() => setSortingImages(value => !value)}>
              {sortingImages ? "Xong sắp xếp" : "Sắp xếp ảnh"}
            </Button>
          )}
        </div>
        {section === "images" && extraFeedback}
        {sortingImages && images.length > 1 && <p>Thứ tự ảnh được lưu sau mỗi lần di chuyển.</p>}
        {images.length === 0 && <p>Chưa có ảnh sản phẩm.</p>}
        <div className="product-image-grid">
          {images.map((image, index) => (
            <div className={`product-image-tile ${index === 0 ? 'is-cover-tile' : ''}`} key={image.id}>
              <img
                src={image.image_url}
                alt={`Ảnh sản phẩm ${index + 1}`}
                loading="lazy"
              />
              <div className="product-image-tile-actions">
                {index === 0 ? (
                  <span className="shopee-cover-badge">★ Ảnh bìa</span>
                ) : (
                  <span>Ảnh {index + 1}</span>
                )}
                {sortingImages && images.length > 1 ? (
                  <div className="product-image-order-buttons">
                    <Button size="sm" variant="secondary" aria-label={`Đưa ảnh ${index + 1} lên trước`}
                      disabled={imagesLocked || index === 0} onClick={() => void moveImage(index, -1)}>←</Button>
                    <Button size="sm" variant="secondary" aria-label={`Đưa ảnh ${index + 1} ra sau`}
                      disabled={imagesLocked || index === images.length - 1} onClick={() => void moveImage(index, 1)}>→</Button>
                  </div>
                ) : (
                  <ActionMenu label={`Thêm thao tác cho ảnh ${index + 1}`} triggerText="Thêm" disabled={imagesLocked}>
                    <Button variant="secondary" aria-label={`Bỏ ảnh sản phẩm ${index + 1}`} disabled={imagesLocked}
                      onClick={() => void removeImage(image.id, index)}>Bỏ ảnh</Button>
                  </ActionMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      {imageConfirmation}
      {section !== "images" && extraFeedback}
    </div>
  );
}
