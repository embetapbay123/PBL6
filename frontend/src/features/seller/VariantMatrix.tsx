import { useId, useState } from "react";
import type { OperationInputs } from "../../api/operations.generated";
import type { AttributeDefinition } from "./AttributeFields";
import { Button } from "../../components/ui/Button";
import { parseVariantPrice } from "./variant-price";

type MatrixVariant = NonNullable<OperationInputs["createProduct"]["body"]["variants"]>[number];
export type MatrixRow = Omit<MatrixVariant, "price_vnd"> & { customPrice?: string };
const maxCombinations = 100;

function axisOptions(axis: AttributeDefinition) {
  if (axis.allowed_values?.length) return axis.allowed_values;
  return axis.data_type.toUpperCase() === "BOOLEAN" ? ["true", "false"] : [];
}

function axisLabel(value: unknown) {
  return typeof value === "boolean" ? (value ? "Có" : "Không") : String(value);
}

export function VariantMatrix({
  axes, sku, commonPrice, rows, current, onSelectionChange, onGenerate, onChange,
}: {
  axes: AttributeDefinition[];
  sku: string;
  commonPrice?: number;
  rows: MatrixRow[];
  current: boolean;
  onSelectionChange: () => void;
  onGenerate: (rows: MatrixRow[]) => void;
  onChange: (rows: MatrixRow[]) => void;
}) {
  const id = useId();
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const [text, setText] = useState<Record<string, string>>({});
  const [batchPrice, setBatchPrice] = useState("");
  const fields = axes.map(axis => {
    const options = axisOptions(axis);
    const kind = axis.data_type.toUpperCase();
    const selected = selection[axis.code] ?? [];
    const tokens = options.length
      ? options.filter(option => selected.includes(option))
      : (text[axis.code] ?? "").split(",").map(value => value.trim()).filter(Boolean);
    const invalidNumber = kind === "NUMBER" ? tokens.find(value => !Number.isFinite(Number(value))) : undefined;
    const invalidBoolean = kind === "BOOLEAN" ? tokens.find(value => value !== "true" && value !== "false") : undefined;
    const longValue = !options.length && kind !== "NUMBER" ? tokens.find(value => value.length > 200) : undefined;
    const problem = invalidNumber !== undefined ? `“${invalidNumber}” phải là số.`
      : invalidBoolean !== undefined ? `“${invalidBoolean}” không phải giá trị Có hoặc Không.`
      : longValue !== undefined ? `Giá trị “${longValue.slice(0, 24)}…” vượt quá 200 ký tự.` : undefined;
    const values = [...new Set(tokens.map(value => kind === "NUMBER" ? Number(value) : kind === "BOOLEAN" ? value === "true" : value))];
    return { axis, options, kind, selected, values, problem };
  });
  const count = fields.length && !fields.some(field => field.problem)
    ? fields.reduce((total, field) => total * field.values.length, 1) : 0;
  const prefix = sku.trim();
  const canGenerate = count > 0 && count <= maxCombinations && prefix.length > 0 && prefix.length <= 196;

  function generate() {
    if (!canGenerate) return;
    let combinations: Record<string, unknown>[] = [{}];
    for (const field of fields) {
      combinations = combinations.flatMap(row => field.values.map(value => ({ ...row, [field.axis.code]: value })));
    }
    onGenerate(combinations.map((variant_values, index) => ({
      sku: `${prefix}-${String(index + 1).padStart(2, "0")}`,
      variant_values,
      is_default: index === 0,
      status: "ACTIVE",
    })));
  }

  function updateRow(index: number, patch: Partial<MatrixRow>) {
    onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  return (
    <section className="variant-matrix" aria-label="Ma trận phân loại">
      <h3>Tạo tổ hợp phân loại</h3>
      <div className="variant-axis-fields">
        {fields.map(({ axis, options, kind, selected, problem }) => {
          const name = axis.unit ? `${axis.name} (${axis.unit})` : axis.name;
          const fieldId = `${id}-${axis.code}`;
          return options.length ? (
            <fieldset key={axis.code} className="variant-axis-choices">
              <legend>{name}</legend>
              <div className="variant-axis-options">
                {options.map(option => (
                  <label className="variant-axis-option" key={option}>
                    <input type="checkbox" checked={selected.includes(option)} onChange={event => {
                      const checked = event.target.checked;
                      setSelection(previous => ({ ...previous, [axis.code]: checked
                        ? [...(previous[axis.code] ?? []), option]
                        : (previous[axis.code] ?? []).filter(value => value !== option) }));
                      onSelectionChange();
                    }} />
                    {kind === "BOOLEAN" && ["true", "false"].includes(option) ? axisLabel(option === "true") : option}
                  </label>
                ))}
              </div>
              {problem && <p className="variant-inline-error" role="alert">{problem}</p>}
            </fieldset>
          ) : (
            <div key={axis.code} className="variant-axis-text">
              <label htmlFor={fieldId}>{name}</label>
              <input id={fieldId} value={text[axis.code] ?? ""} maxLength={2000}
                aria-invalid={problem ? true : undefined}
                aria-describedby={`${fieldId}-hint${problem ? ` ${fieldId}-error` : ""}`}
                onChange={event => {
                  setText(previous => ({ ...previous, [axis.code]: event.target.value }));
                  onSelectionChange();
                }} />
              <small id={`${fieldId}-hint`}>Ngăn cách các giá trị bằng dấu phẩy.</small>
              {problem && <p id={`${fieldId}-error`} className="variant-inline-error" role="alert">{problem}</p>}
            </div>
          );
        })}
      </div>
      <p role="status" className="variant-combination-count">
        {count ? `${fields.map(({ axis, values }) => `${values.length} ${axis.name.toLocaleLowerCase("vi-VN")}`).join(" × ")} = ${count} phân loại`
          : "Chọn hoặc nhập ít nhất một giá trị hợp lệ cho mỗi thuộc tính."}
      </p>
      {count > maxCombinations && <p role="alert">Mỗi lần chỉ tạo được tối đa 100 phân loại. Hãy giảm số lựa chọn.</p>}
      {prefix.length > 196 && <p role="alert">Rút ngắn tiền tố SKU còn tối đa 196 ký tự.</p>}
      <Button variant="secondary" disabled={!canGenerate} onClick={generate}>
        {rows.length ? "Tạo lại tổ hợp (thay bản nháp)" : "Xem trước tổ hợp"}
      </Button>
      {!!rows.length && (
        <>
          {!current && <p role="status">Lựa chọn hoặc tiền tố SKU đã đổi. Tạo lại tổ hợp trước khi lưu.</p>}
          <p>Phân loại đầu tiên là mặc định. Tồn ban đầu bằng 0.</p>
          <div className="shopee-batch-apply-bar">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="shopee-batch-label">Áp dụng cho tất cả phân loại:</span>
              <input
                type="number"
                min={0}
                placeholder="Nhập giá chung (₫)..."
                value={batchPrice}
                onChange={(e) => setBatchPrice(e.target.value)}
                className="shopee-batch-input"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!batchPrice || isNaN(Number(batchPrice)) || Number(batchPrice) < 0}
                onClick={() => {
                  const parsed = parseVariantPrice(batchPrice);
                  if (parsed === undefined) return;
                  onChange(rows.map(row => ({ ...row, customPrice: batchPrice })));
                }}
              >
                Áp dụng cho tất cả
              </Button>
            </div>
          </div>
          <div className="market-table-scroll" tabIndex={0} role="region" aria-label="Tổ hợp phân loại xem trước">
            <table>
              <thead><tr><th>Phân loại</th><th>SKU</th><th>Giá bán (VNĐ)</th></tr></thead>
              <tbody>
                {rows.map((row, index) => {
                  const hasCustomPrice = row.customPrice !== undefined;
                  const priceError = row.customPrice !== undefined && parseVariantPrice(row.customPrice) === undefined;
                  return (
                  <tr key={index}>
                    <td>{Object.values(row.variant_values).map(axisLabel).join(" / ")}</td>
                    <td><input required maxLength={200} aria-label={`SKU tổ hợp ${index + 1}`}
                      value={row.sku} onChange={event => updateRow(index, { sku: event.target.value })} /></td>
                    <td>
                      <input required type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1}
                        aria-label={`Giá tổ hợp ${index + 1}`} aria-invalid={priceError || undefined}
                        aria-describedby={`${id}-price-${index}${priceError ? ` ${id}-price-error-${index}` : ""}`}
                        value={row.customPrice ?? commonPrice ?? ""} onChange={event => {
                          const value = event.target.value;
                          const parsed = parseVariantPrice(value);
                          updateRow(index, { customPrice: parsed !== undefined && parsed === commonPrice ? undefined : value });
                        }} />
                      <div className="variant-row-price-note">
                        <span id={`${id}-price-${index}`} className={hasCustomPrice ? "variant-custom-price" : undefined}>
                          {hasCustomPrice ? "Giá riêng" : "Giá chung"}
                        </span>
                        {hasCustomPrice && <Button size="sm" variant="ghost" onClick={() => updateRow(index, { customPrice: undefined })}>Dùng giá chung</Button>}
                      </div>
                      {priceError && <p id={`${id}-price-error-${index}`} className="variant-inline-error">Nhập giá riêng là số nguyên từ 0 ₫.</p>}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
