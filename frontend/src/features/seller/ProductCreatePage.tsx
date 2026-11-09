import { FormEvent, useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Plus, Trash2, Image as ImageIcon, Sparkles, 
  CheckCircle2, Truck, Layers, Info, ShieldAlert, Star,
  Zap, Tag, HelpCircle, X
} from "lucide-react";
import { callOperation } from "../../api/operations";
import { ApiError, isUncertainMutation } from "../../api/client";
import { useProductTypes } from "./useProductTypes";
import { AttributeFields } from "./AttributeFields";
import { parseVariantPrice } from "./variant-price";
import { Button as UiButton } from "../../components/ui/Button";
import { ErrorView, Loading } from "../../bootstrap/components";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";

const SAMPLE_IMAGE_PRESETS = [
  { label: "Mẫu Áo thun", url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80" },
  { label: "Mẫu Giày thể thao", url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80" },
  { label: "Mẫu Ba lô", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80" },
  { label: "Mẫu Đồng hồ", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80" },
];

// Helper to generate clean e-commerce SKU codes
function generateCleanSku(title: string, ...variations: string[]): string {
  const sanitize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const titlePrefix = sanitize(title).split("-").slice(0, 3).join("-") || "SKU";
  const varPart = variations.map(sanitize).filter(Boolean).join("-");
  return varPart ? `${titlePrefix}-${varPart}`.slice(0, 60) : `${titlePrefix}-01`.slice(0, 60);
}

interface SkuRowItem {
  id: string;
  name1: string;
  name2?: string;
  sku: string;
  price: string;
  variant_values: Record<string, unknown>;
}

export function ProductCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Basic info
  const [productTypeId, setProductTypeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">("ACTIVE");

  // Multi-image collection (up to 9 images)
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Product Variation Mode: Single SKU vs Multi Variations
  const [hasVariations, setHasVariations] = useState(false);

  // Single SKU mode states
  const [singleSku, setSingleSku] = useState("");
  const [singlePrice, setSinglePrice] = useState("");

  // Multi-Variation mode states
  const [group1Name, setGroup1Name] = useState("Màu sắc");
  const [group1Tags, setGroup1Tags] = useState<string[]>(["Đen", "Trắng"]);
  const [group1NewTag, setGroup1NewTag] = useState("");

  const [hasGroup2, setHasGroup2] = useState(false);
  const [group2Name, setGroup2Name] = useState("Kích thước");
  const [group2Tags, setGroup2Tags] = useState<string[]>(["M", "L", "XL"]);
  const [group2NewTag, setGroup2NewTag] = useState("");

  // Batch action states
  const [batchPriceInput, setBatchPriceInput] = useState("");

  // SKU Table rows
  const [skuRows, setSkuRows] = useState<SkuRowItem[]>([]);

  // Status & Async handling
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  const [createdId, setCreatedId] = useState("");
  const [uncertain, setUncertain] = useState(false);

  const types = useProductTypes();
  const selectedType = types.data?.find((t) => t.id === productTypeId);

  const variantAxes = selectedType?.attribute_definitions.filter((d) => d.variant_axis) ?? [];
  const axis1 = variantAxes[0];
  const axis2 = variantAxes[1];

  // Auto-align group names with taxonomy axes if present
  useEffect(() => {
    if (axis1) setGroup1Name(axis1.name);
    if (axis2) {
      setHasGroup2(true);
      setGroup2Name(axis2.name);
    }
  }, [axis1?.name, axis2?.name]);

  // Sync / Recompute SKU rows whenever variation tags change
  useEffect(() => {
    if (!hasVariations) return;

    const g1 = group1Tags.length > 0 ? group1Tags : ["Tiêu chuẩn"];
    const g2 = hasGroup2 && group2Tags.length > 0 ? group2Tags : [undefined];

    setSkuRows((prevRows) => {
      const nextRows: SkuRowItem[] = [];

      for (const opt1 of g1) {
        for (const opt2 of g2) {
          const rowId = opt2 ? `${opt1}__${opt2}` : opt1;
          const existing = prevRows.find((r) => r.id === rowId);

          const defaultGeneratedSku = generateCleanSku(
            title || "SP",
            opt1,
            opt2 ?? ""
          );

          const values: Record<string, unknown> = {};
          if (axis1) values[axis1.code] = opt1;
          if (axis2 && opt2) values[axis2.code] = opt2;

          nextRows.push({
            id: rowId,
            name1: opt1,
            name2: opt2,
            sku: existing?.sku || defaultGeneratedSku,
            price: existing?.price || batchPriceInput || singlePrice || "150000",
            variant_values: values,
          });
        }
      }
      return nextRows;
    });
  }, [hasVariations, group1Tags, group2Tags, hasGroup2, axis1?.code, axis2?.code]);

  // Validation
  const parsedSinglePrice = parseVariantPrice(singlePrice);
  const readyToPrice = !hasVariations
    ? singleSku.trim() !== "" && parsedSinglePrice !== undefined
    : skuRows.length > 0 &&
      skuRows.every(
        (r) => r.sku.trim() !== "" && parseVariantPrice(r.price) !== undefined
      );

  const isFormDirty = !!(
    title ||
    singleSku ||
    singlePrice ||
    description ||
    images.length ||
    productTypeId ||
    skuRows.length
  );
  const releaseUnsaved = useUnsavedChanges(!createdId && !uncertain && isFormDirty);

  // Auto-generate single SKU from Title
  const handleAutoGenerateSingleSku = () => {
    const clean = generateCleanSku(title || "SAN-PHAM");
    setSingleSku(clean);
  };

  // Auto-generate all SKUs in the table
  const handleAutoGenerateAllTableSkus = () => {
    setSkuRows((prev) =>
      prev.map((row) => ({
        ...row,
        sku: generateCleanSku(title || "SP", row.name1, row.name2 ?? ""),
      }))
    );
  };

  // Batch apply price to all rows
  const handleBatchApplyPrice = () => {
    const parsed = parseVariantPrice(batchPriceInput);
    if (parsed === undefined) {
      alert("Vui lòng nhập một mức giá hợp lệ (số nguyên từ 0 ₫).");
      return;
    }
    setSkuRows((prev) =>
      prev.map((row) => ({
        ...row,
        price: batchPriceInput,
      }))
    );
  };

  // Tag management for Group 1
  const handleAddGroup1Tag = (val?: string) => {
    const tag = (val ?? group1NewTag).trim();
    if (!tag) return;
    if (!group1Tags.includes(tag)) {
      setGroup1Tags((prev) => [...prev, tag]);
    }
    if (!val) setGroup1NewTag("");
  };

  const handleRemoveGroup1Tag = (tagToRemove: string) => {
    if (group1Tags.length <= 1) {
      alert("Cần giữ lại ít nhất 1 phân loại.");
      return;
    }
    setGroup1Tags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Tag management for Group 2
  const handleAddGroup2Tag = (val?: string) => {
    const tag = (val ?? group2NewTag).trim();
    if (!tag) return;
    if (!group2Tags.includes(tag)) {
      setGroup2Tags((prev) => [...prev, tag]);
    }
    if (!val) setGroup2NewTag("");
  };

  const handleRemoveGroup2Tag = (tagToRemove: string) => {
    if (group2Tags.length <= 1) {
      alert("Cần giữ lại ít nhất 1 phân loại ở nhóm 2.");
      return;
    }
    setGroup2Tags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Add custom row directly
  const handleAddCustomRow = () => {
    const customId = `custom_${Date.now()}`;
    setSkuRows((prev) => [
      ...prev,
      {
        id: customId,
        name1: "Phân loại tùy chỉnh",
        sku: generateCleanSku(title || "SP", `CUSTOM-${prev.length + 1}`),
        price: batchPriceInput || "150000",
        variant_values: axis1 ? { [axis1.code]: `Tùy chọn ${prev.length + 1}` } : {},
      },
    ]);
  };

  // Remove row from table
  const handleRemoveRow = (rowId: string) => {
    if (skuRows.length <= 1) {
      alert("Phải có ít nhất 1 phân loại SKU.");
      return;
    }
    setSkuRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Update specific row in table
  const handleUpdateRow = (rowId: string, patch: Partial<SkuRowItem>) => {
    setSkuRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r))
    );
  };

  // Multi-image helpers
  const handleAddImage = (urlToAdd?: string) => {
    const url = (urlToAdd ?? newImageUrl).trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) {
      alert("Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    if (images.includes(url)) {
      alert("Ảnh này đã có trong bộ sưu tập.");
      return;
    }
    if (images.length >= 9) {
      alert("Đã đạt giới hạn tối đa 9 ảnh cho mỗi sản phẩm chuẩn Shopee.");
      return;
    }
    setImages((prev) => [...prev, url]);
    if (!urlToAdd) setNewImageUrl("");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSetCoverImage = (indexToCover: number) => {
    if (indexToCover === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(indexToCover, 1);
      return [item, ...copy];
    });
  };

  // Submit form
  const handleSubmit = async (submitStatus: "DRAFT" | "ACTIVE") => {
    if (submitting || uncertain || createdId || !selectedType || !readyToPrice || !title.trim()) {
      return;
    }

    setSubmitting(true);
    setError(undefined);

    try {
      const variantsPayload = !hasVariations
        ? [
            {
              sku: singleSku.trim(),
              price_vnd: parsedSinglePrice!,
              variant_values: Object.fromEntries(
                (selectedType?.attribute_definitions ?? [])
                  .filter((d) => d.variant_axis && attributes[d.code] !== undefined)
                  .map((d) => [d.code, attributes[d.code]])
              ),
              is_default: true,
            },
          ]
        : skuRows.map((row, index) => ({
            sku: row.sku.trim(),
            price_vnd: parseVariantPrice(row.price)!,
            variant_values: row.variant_values,
            is_default: index === 0,
          }));

      const prod = await callOperation("createProduct", {
        body: {
          product_type_id: productTypeId,
          title: title.trim(),
          description: description.trim() || undefined,
          attributes: hasVariations && skuRows.length > 0
            ? { ...attributes, ...skuRows[0].variant_values }
            : attributes,
          variants: variantsPayload,
          status: submitStatus,
        },
      });

      const prodId = prod.id;
      if (!prodId) {
        throw new Error("Máy chủ không trả về mã sản phẩm. Vui lòng kiểm tra lại danh sách.");
      }
      setCreatedId(prodId);

      // Upload gallery images sequentially
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          try {
            await callOperation("addProductImage", {
              path: { id: prodId },
              body: {
                image_url: images[i],
                position: i,
              },
            });
          } catch (imgErr) {
            console.warn(`Lỗi tải ảnh vị trí ${i}:`, imgErr);
          }
        }
      }

      releaseUnsaved();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["own-store-products"] }),
        queryClient.invalidateQueries({ queryKey: ["seller-overview"] }),
      ]);

      // Redirect back to seller product list
      navigate("/seller/products", {
        replace: true,
        state: { notice: `Đã tạo sản phẩm “${title.trim()}” thành công theo chuẩn Shopee!` },
      });
    } catch (err) {
      if (
        err instanceof ApiError &&
        ["INVALID_VARIANT_ATTRIBUTES", "INVALID_ATTRIBUTES", "INVALID_PRODUCT_TYPE"].includes(err.code)
      ) {
        await types.refetch();
      }
      if (isUncertainMutation(err)) setUncertain(true);
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="shopee-product-create-container" style={{ maxWidth: "1040px", margin: "0 auto", padding: "1.5rem 1rem 6rem" }}>
      {/* Navigation & Header */}
      <div className="mb-4">
        <Link to="/seller/products" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline font-medium">
          <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
        </Link>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 m-0">Thêm sản phẩm mới</h1>
            <span className="shopee-tag-pill" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px' }}>
              Quy trình 1 pha chuẩn Shopee Uni
            </span>
          </div>
          <p className="text-sm text-slate-500 m-0 mt-1">
            Thiết lập thông tin, bộ sưu tập ảnh và phân loại SKU hàng hóa trên một giao diện thống nhất.
          </p>
        </div>
      </div>

      {error !== undefined && (
        <div className="mb-6">
          <ErrorView error={error} />
        </div>
      )}

      {uncertain && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-sm flex items-start gap-2">
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <span>Chưa thể xác nhận kết quả tạo từ máy chủ. Vui lòng kiểm tra lại danh sách trước khi nhấn lưu lại để tránh tạo trùng lặp.</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit("ACTIVE"); }}>
        <fieldset disabled={submitting || uncertain || !!createdId} style={{ border: 'none', padding: 0, margin: 0 }}>
          
          {/* KHỐI 1: THÔNG TIN CƠ BẢN & NGÀNH HÀNG */}
          <section className="shopee-create-card mb-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">1</span>
              <h2 className="text-base font-semibold text-slate-800 m-0">Thông tin cơ bản & Ngành hàng</h2>
            </div>

            <div className="grid gap-4">
              <label className="block text-sm font-semibold text-slate-700">
                Loại sản phẩm (Ngành hàng) *
                <select
                  required
                  value={productTypeId}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  onChange={(e) => {
                    setProductTypeId(e.target.value);
                    setAttributes({});
                    setSingleSku("");
                  }}
                >
                  <option value="">-- Chọn ngành hàng sản phẩm --</option>
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

              {/* Shopee SEO Tip Box */}
              <div className="shopee-seo-tip-box" style={{ margin: '4px 0', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Công thức đặt tên chuẩn SEO Shopee Uni:</span>
                </div>
                <p className="text-xs text-amber-700 m-0 leading-relaxed">
                  <strong>[Loại SP]</strong> + <strong>[Thương hiệu]</strong> + <strong>[Model / Mã đặc trưng]</strong> + <strong>[Đặc tính nổi bật / Màu sắc / Size]</strong>
                </p>
                <p className="text-[11px] text-amber-600/90 mt-1.5 mb-0 italic">
                  * Tránh spam từ khóa, không viết IN HOA toàn bộ, không chèn số điện thoại để tối ưu điểm chất lượng bài đăng.
                </p>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                <span className="flex items-center justify-between mb-1">
                  <span>Tên sản phẩm *</span>
                  <span className={`text-xs font-normal ${title.length > 180 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                    {title.length}/200 ký tự
                  </span>
                </span>
                <input
                  required
                  maxLength={200}
                  value={title}
                  placeholder="VD: Áo Thun Nam Cotton Cổ Tròn Thoáng Khí Phong Cách Trẻ Trung Basic"
                  className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Mô tả chi tiết sản phẩm
                <textarea
                  rows={4}
                  value={description}
                  placeholder="Mô tả nguồn gốc, chất liệu, tính năng, hướng dẫn chọn size, bảo quản và chính sách đổi trả của shop..."
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* KHỐI 2: CHI TIẾT THUỘC TÍNH SẢN PHẨM */}
          {selectedType && (
            <section className="shopee-create-card mb-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">2</span>
                <h2 className="text-base font-semibold text-slate-800 m-0">Chi tiết thuộc tính ({selectedType.name})</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Điền đầy đủ các thuộc tính giúp sản phẩm dễ dàng xuất hiện trong bộ lọc tìm kiếm của người mua.
              </p>
              <AttributeFields
                definitions={selectedType.attribute_definitions.filter(
                  (definition) => !hasVariations || !definition.variant_axis
                )}
                values={attributes}
                onChange={setAttributes}
                disabled={submitting}
              />
            </section>
          )}

          {/* KHỐI 3: BỘ SƯU TẬP HÌNH ẢNH SẢN PHẨM (CHUẨN SHOPEE) */}
          <section className="shopee-create-card mb-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">3</span>
                <h2 className="text-base font-semibold text-slate-800 m-0">Bộ sưu tập hình ảnh sản phẩm</h2>
              </div>
              <span className="text-xs font-medium text-slate-500">
                Đã thêm: <strong>{images.length}/9</strong> ảnh
              </span>
            </div>

            <div className="shopee-image-tip-banner mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quy chuẩn hình ảnh Shopee:</strong> Tỷ lệ vuông <strong>1:1</strong>, độ phân giải tối thiểu 800x800px, phông nền sáng rõ. Ô ảnh đầu tiên sẽ tự động làm <strong>Ảnh bìa</strong> của sản phẩm trên sàn.
              </div>
            </div>

            {/* Input thêm URL ảnh */}
            <div className="flex gap-2 items-center mb-3">
              <input
                type="url"
                value={newImageUrl}
                placeholder="Dán link ảnh (https://...)"
                disabled={images.length >= 9}
                className="flex-1 rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-orange-500"
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddImage();
                  }
                }}
              />
              <UiButton
                variant="secondary"
                type="button"
                disabled={!newImageUrl.trim() || images.length >= 9}
                onClick={() => handleAddImage()}
              >
                <Plus size={15} /> Thêm ảnh
              </UiButton>
            </div>

            {/* Presets chọn nhanh ảnh mẫu */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-xs text-slate-500">Chọn nhanh ảnh mẫu demo:</span>
              {SAMPLE_IMAGE_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  disabled={images.length >= 9 || images.includes(preset.url)}
                  className="shopee-link-btn"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: '#475569',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  onClick={() => handleAddImage(preset.url)}
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {/* Grid hiển thị danh sách ảnh */}
            {images.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm m-0">Chưa có ảnh nào trong bộ sưu tập.</p>
                <p className="text-xs text-slate-400 mt-1">Dán link ảnh ở trên hoặc chọn mẫu demo để xem trước.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {images.map((imgUrl, index) => {
                  const isCover = index === 0;
                  return (
                    <div 
                      key={imgUrl} 
                      className={`relative rounded-xl overflow-hidden border ${isCover ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'} bg-slate-50 flex flex-col group`}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center relative">
                        <img 
                          src={imgUrl} 
                          alt={`Ảnh ${index + 1}`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/200?text=Loi+Anh";
                          }}
                        />
                        {isCover && (
                          <div className="absolute top-1.5 left-1.5 bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                            <Star size={10} fill="white" /> Ảnh bìa
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                        {!isCover ? (
                          <button
                            type="button"
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                            style={{ background: 'none', border: 'none', padding: 0 }}
                            onClick={() => handleSetCoverImage(index)}
                          >
                            Đặt ảnh bìa
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Vị trí 1</span>
                        )}
                        <button
                          type="button"
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          style={{ background: 'none', border: 'none' }}
                          title="Xóa ảnh này"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* KHỐI 4: THÔNG TIN BÁN HÀNG & PHÂN LOẠI SKU (CHUẨN SHOPEE UNI) */}
          <section className="shopee-create-card mb-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">4</span>
                <h2 className="text-base font-semibold text-slate-800 m-0">Thông tin bán hàng & Phân loại SKU</h2>
              </div>
              
              {/* Toggle Mode: 1 Phân loại vs Đa phân loại */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    !hasVariations
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{ border: 'none' }}
                  onClick={() => setHasVariations(false)}
                >
                  Sản phẩm 1 phân loại (Đơn giản)
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    hasVariations
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{ border: 'none' }}
                  onClick={() => {
                    setHasVariations(true);
                    if (!singlePrice) setSinglePrice("150000");
                  }}
                >
                  Nhiều phân loại (Màu sắc, Size...)
                </button>
              </div>
            </div>

            {/* TRƯỜNG HỢP 1: SẢN PHẨM 1 PHÂN LOẠI (SINGLE SKU) */}
            {!hasVariations ? (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Giá bán niêm yết (VNĐ) *
                      <input
                        type="number"
                        min={0}
                        max={Number.MAX_SAFE_INTEGER}
                        step={1}
                        required={!hasVariations}
                        value={singlePrice}
                        placeholder="VD: 150000"
                        className="mt-1.5 block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-orange-500"
                        onChange={(e) => setSinglePrice(e.target.value)}
                      />
                    </label>
                    {singlePrice !== "" && parsedSinglePrice === undefined && (
                      <p className="text-xs text-rose-600 mt-1">Nhập giá là số nguyên từ 0 ₫.</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-700 m-0">
                        Mã SKU phân loại *
                      </label>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-semibold cursor-pointer"
                        style={{ background: 'none', border: 'none', padding: 0 }}
                        title="Tự động sinh mã SKU theo tên sản phẩm"
                        onClick={handleAutoGenerateSingleSku}
                      >
                        <Zap size={13} /> ⚡ Tự sinh mã SKU
                      </button>
                    </div>
                    <input
                      required={!hasVariations}
                      maxLength={200}
                      value={singleSku}
                      placeholder="VD: AO-THUN-BASIC-01"
                      className="block w-full rounded-lg border border-slate-300 p-2.5 text-sm text-slate-900 focus:border-orange-500 font-mono"
                      onChange={(e) => setSingleSku(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Mã quản lý tồn kho và nhặt hàng trong kho. Bấm nút <strong>⚡ Tự sinh mã SKU</strong> nếu không muốn tự đặt mã.
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
                  <span>Sản phẩm của bạn có nhiều màu sắc, kích thước hay phiên bản?</span>
                  <button
                    type="button"
                    className="text-orange-600 hover:text-orange-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                    onClick={() => setHasVariations(true)}
                  >
                    <Plus size={14} /> Bật phân loại hàng (Màu sắc, Size...) ngay →
                  </button>
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: SẢN PHẨM CÓ PHÂN LOẠI HÀNG (MULTI-SKU VARIATIONS) */
              <div className="space-y-6">
                
                {/* NHÓM PHÂN LOẠI 1 */}
                <div className="p-4 bg-orange-50/40 border border-orange-200/80 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                      <strong className="text-sm text-slate-800">Nhóm phân loại 1</strong>
                    </div>
                    {axis1 && (
                      <span className="text-[11px] text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded font-medium">
                        Khớp trục ngành hàng: {axis1.name}
                      </span>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-slate-500 font-medium block mb-1">Tên nhóm phân loại</label>
                      <input
                        value={group1Name}
                        placeholder="VD: Màu sắc"
                        disabled={!!axis1}
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-white"
                        onChange={(e) => setGroup1Name(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-slate-500 font-medium block mb-1">Thêm tùy chọn mới (Gõ rồi nhấn Enter hoặc bấm Thêm)</label>
                      <div className="flex gap-2">
                        <input
                          value={group1NewTag}
                          placeholder="VD: Xanh Navy, Đỏ đô, Trắng..."
                          className="flex-1 rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-white focus:border-orange-500"
                          onChange={(e) => setGroup1NewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddGroup1Tag();
                            }
                          }}
                        />
                        <UiButton
                          variant="secondary"
                          type="button"
                          disabled={!group1NewTag.trim()}
                          onClick={() => handleAddGroup1Tag()}
                        >
                          <Plus size={14} /> Thêm
                        </UiButton>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách Tags Nhóm 1 */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-xs text-slate-500 mr-1">Các phân loại:</span>
                    {group1Tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-300 text-xs text-slate-800 font-medium shadow-2xs"
                      >
                        <Tag size={12} className="text-slate-400" />
                        {tag}
                        <button
                          type="button"
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          style={{ background: 'none', border: 'none' }}
                          onClick={() => handleRemoveGroup1Tag(tag)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Gợi ý chọn nhanh nhóm 1 */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5 text-[11px] text-slate-500">
                    <span>Gợi ý thêm nhanh:</span>
                    {["Đen", "Trắng", "Xám", "Xanh Navy", "Be", "Đỏ", "Vàng"].map((suggest) => (
                      <button
                        key={suggest}
                        type="button"
                        disabled={group1Tags.includes(suggest)}
                        className="shopee-link-btn"
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          color: '#475569',
                          cursor: 'pointer',
                          textDecoration: 'none'
                        }}
                        onClick={() => handleAddGroup1Tag(suggest)}
                      >
                        + {suggest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NHÓM PHÂN LOẠI 2 */}
                {!hasGroup2 ? (
                  <div className="p-3 border border-dashed border-slate-300 rounded-xl text-center">
                    <button
                      type="button"
                      className="text-sm text-orange-600 hover:text-orange-800 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                      onClick={() => setHasGroup2(true)}
                    >
                      <Plus size={16} /> + Thêm Nhóm phân loại 2 (Kích thước / Size / Dung lượng...)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50/40 border border-blue-200/80 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                        <strong className="text-sm text-slate-800">Nhóm phân loại 2</strong>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                        style={{ background: 'none', border: 'none', padding: 0 }}
                        onClick={() => setHasGroup2(false)}
                      >
                        <Trash2 size={13} /> Xóa nhóm 2
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-slate-500 font-medium block mb-1">Tên nhóm phân loại 2</label>
                        <input
                          value={group2Name}
                          placeholder="VD: Kích thước"
                          disabled={!!axis2}
                          className="w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-white"
                          onChange={(e) => setGroup2Name(e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-slate-500 font-medium block mb-1">Thêm tùy chọn mới</label>
                        <div className="flex gap-2">
                          <input
                            value={group2NewTag}
                            placeholder="VD: S, M, L, XL, 64GB, 128GB..."
                            className="flex-1 rounded-lg border border-slate-300 p-2 text-sm text-slate-900 bg-white focus:border-blue-500"
                            onChange={(e) => setGroup2NewTag(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddGroup2Tag();
                              }
                            }}
                          />
                          <UiButton
                            variant="secondary"
                            type="button"
                            disabled={!group2NewTag.trim()}
                            onClick={() => handleAddGroup2Tag()}
                          >
                            <Plus size={14} /> Thêm
                          </UiButton>
                        </div>
                      </div>
                    </div>

                    {/* Danh sách Tags Nhóm 2 */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-xs text-slate-500 mr-1">Các phân loại:</span>
                      {group2Tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-300 text-xs text-slate-800 font-medium shadow-2xs"
                        >
                          <Tag size={12} className="text-slate-400" />
                          {tag}
                          <button
                            type="button"
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                            style={{ background: 'none', border: 'none' }}
                            onClick={() => handleRemoveGroup2Tag(tag)}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Gợi ý chọn nhanh nhóm 2 */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5 text-[11px] text-slate-500">
                      <span>Gợi ý thêm nhanh:</span>
                      {["S", "M", "L", "XL", "XXL", "Free Size"].map((suggest) => (
                        <button
                          key={suggest}
                          type="button"
                          disabled={group2Tags.includes(suggest)}
                          className="shopee-link-btn"
                          style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '11px',
                            color: '#475569',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                          onClick={() => handleAddGroup2Tag(suggest)}
                        >
                          + {suggest}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* THANH ÁP DỤNG HÀNG LOẠT (BATCH APPLY BAR) */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900">⚡ Thao tác nhanh cho tất cả dòng:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={batchPriceInput}
                        placeholder="Điền giá chung (₫)..."
                        className="w-36 rounded-lg border border-amber-300 p-1.5 text-xs bg-white text-slate-900 focus:border-amber-500"
                        onChange={(e) => setBatchPriceInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                        style={{ border: 'none' }}
                        onClick={handleBatchApplyPrice}
                      >
                        Áp dụng giá
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 rounded-lg text-xs font-bold cursor-pointer"
                    onClick={handleAutoGenerateAllTableSkus}
                  >
                    <Zap size={14} className="text-amber-600" />
                    ⚡ Tự động tạo lại toàn bộ mã SKU
                  </button>
                </div>

                {/* BẢNG CHI TIẾT TỔ HỢP PHÂN LOẠI & SKU (SHOPEE SKU TABLE) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                    <strong className="text-xs text-slate-800 font-bold uppercase tracking-wider">
                      Danh sách biến thể SKU ({skuRows.length} phân loại)
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      Mỗi dòng là một mã SKU vật lý trong kho
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2.5 px-3 font-semibold">{group1Name || "Phân loại 1"}</th>
                          {hasGroup2 && (
                            <th className="py-2.5 px-3 font-semibold">{group2Name || "Phân loại 2"}</th>
                          )}
                          <th className="py-2.5 px-3 font-semibold w-40">Giá bán (VNĐ) *</th>
                          <th className="py-2.5 px-3 font-semibold">Mã SKU phân loại *</th>
                          <th className="py-2.5 px-3 font-semibold w-24 text-center">Trạng thái</th>
                          <th className="py-2.5 px-3 font-semibold w-12 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {skuRows.map((row, index) => {
                          const isDefault = index === 0;
                          const rowPriceValid = parseVariantPrice(row.price) !== undefined;
                          return (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-slate-800">
                                {row.name1}
                              </td>
                              {hasGroup2 && (
                                <td className="py-2.5 px-3 text-slate-700">
                                  {row.name2 ?? "-"}
                                </td>
                              )}
                              <td className="py-2.5 px-3">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={row.price}
                                    className={`w-full rounded-md border p-1.5 text-xs text-slate-900 ${
                                      !rowPriceValid ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-white"
                                    }`}
                                    onChange={(e) =>
                                      handleUpdateRow(row.id, { price: e.target.value })
                                    }
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1">
                                  <input
                                    maxLength={200}
                                    value={row.sku}
                                    placeholder="VD: SKU-SP-01"
                                    className="w-full rounded-md border border-slate-300 p-1.5 text-xs text-slate-900 font-mono bg-white focus:border-orange-500"
                                    onChange={(e) =>
                                      handleUpdateRow(row.id, { sku: e.target.value })
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="p-1 text-slate-400 hover:text-orange-600 cursor-pointer"
                                    style={{ background: 'none', border: 'none' }}
                                    title="Tạo lại SKU cho dòng này"
                                    onClick={() =>
                                      handleUpdateRow(row.id, {
                                        sku: generateCleanSku(title || "SP", row.name1, row.name2 ?? ""),
                                      })
                                    }
                                  >
                                    <Zap size={13} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isDefault ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Mặc định
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    Thứ {index + 1}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  style={{ background: 'none', border: 'none' }}
                                  title="Xóa phân loại này"
                                  onClick={() => handleRemoveRow(row.id)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      className="text-xs text-orange-600 hover:text-orange-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                      onClick={handleAddCustomRow}
                    >
                      <Plus size={14} /> + Thêm dòng phân loại tùy chỉnh
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Tất cả mã SKU phải là duy nhất trong cùng sản phẩm
                    </span>
                  </div>
                </div>

              </div>
            )}
          </section>

          {/* KHỐI 5: QUY CHUẨN VẬN CHUYỂN & GIAO HÀNG (SHOPEE SHIPPING) */}
          <section className="shopee-create-card mb-8 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">5</span>
              <h2 className="text-base font-semibold text-slate-800 m-0">Vận chuyển & Đóng gói chuẩn sàn</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
                <Truck size={18} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Thời hạn chuẩn bị hàng (DTS 1.5 ngày):</strong>
                  Người bán cần xác nhận và đóng gói giao cho đơn vị vận chuyển trong vòng 36 giờ kể từ khi đơn phát sinh để duy trì tỷ lệ giao hàng đúng hạn.
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block mb-0.5">Tồn kho ban đầu:</strong>
                  Các phân loại mới sẽ có số lượng tồn kho khởi điểm bằng 0. Sau khi lưu, bạn có thể nhập kho tức thì tại mục <em>Quản lý Tồn kho</em>.
                </div>
              </div>
            </div>
          </section>

          {/* STICKY BOTTOM ACTION BAR */}
          <div 
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 py-3 px-6 shadow-lg z-40"
            style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' }}
          >
            <div className="max-w-[1040px] mx-auto flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Trạng thái sau khi lưu:</span>
                <span className="font-semibold text-slate-800">
                  {status === "ACTIVE" ? "Đăng bán ngay (ACTIVE)" : "Lưu bản nháp (DRAFT)"}
                </span>
                <span className="text-slate-300">|</span>
                <span>Số lượng phân loại: <strong>{!hasVariations ? 1 : skuRows.length} SKU</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/seller/products"
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg bg-white"
                  style={{ textDecoration: 'none' }}
                >
                  Hủy
                </Link>
                <button
                  type="button"
                  disabled={submitting || uncertain || !selectedType || !readyToPrice || !title.trim()}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  onClick={() => handleSubmit("DRAFT")}
                >
                  {submitting ? "Đang xử lý..." : "Lưu bản nháp"}
                </button>
                <button
                  type="button"
                  disabled={submitting || uncertain || !selectedType || !readyToPrice || !title.trim()}
                  className="px-5 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  onClick={() => handleSubmit("ACTIVE")}
                >
                  {submitting ? "Đang lưu & đăng bán..." : "Lưu & Mở bán ngay"}
                </button>
              </div>
            </div>
          </div>

        </fieldset>
      </form>
    </div>
  );
}
