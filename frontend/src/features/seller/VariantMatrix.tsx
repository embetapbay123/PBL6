import { useState } from "react";
import type { OperationInputs } from "../../api/operations.generated";
import type { AttributeDefinition } from "./AttributeFields";
import { Button } from "../../components/ui/Button";
export type MatrixVariant = NonNullable<
  OperationInputs["createProduct"]["body"]["variants"]
>[number];

export function VariantMatrix({
  axes,
  sku,
  price,
  rows,
  onChange,
}: {
  axes: AttributeDefinition[];
  sku: string;
  price: number;
  rows: MatrixVariant[];
  onChange: (rows: MatrixVariant[]) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  function generate() {
    setError("");
    let combinations: Record<string, unknown>[] = [{}];
    for (const axis of axes) {
      const entries = [
        ...new Set(
          (values[axis.code] ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ];
      if (!entries.length) {
        setError("Nhập ít nhất một giá trị cho " + axis.name + ".");
        return;
      }
      if (
        entries.some(
          (value) =>
            (axis.allowed_values?.length &&
              !axis.allowed_values.includes(value)) ||
            (axis.data_type.toUpperCase() === "NUMBER" &&
              !Number.isFinite(Number(value))) ||
            (axis.data_type.toUpperCase() === "BOOLEAN" &&
              !["true", "false"].includes(value)),
        )
      ) {
        setError("Giá trị của " + axis.name + " chưa đúng cấu hình.");
        return;
      }
      if (combinations.length * entries.length > 100) {
        setError(
          "Chỉ tạo tối đa 100 tổ hợp mỗi lần trong giao diện này. Giảm số lựa chọn để kiểm tra rõ từng phân loại.",
        );
        return;
      }
      combinations = combinations.flatMap((row) =>
        entries.map((value) => ({
          ...row,
          [axis.code]:
            axis.data_type.toUpperCase() === "NUMBER"
              ? Number(value)
              : axis.data_type.toUpperCase() === "BOOLEAN"
                ? value === "true"
                : value,
        })),
      );
    }
    if (!sku.trim() || !Number.isSafeInteger(price) || price < 0) {
      setError("Nhập tiền tố SKU và giá bán hợp lệ trước khi tạo tổ hợp.");
      return;
    }
    onChange(
      combinations.map((variant_values, index) => ({
        sku: sku.trim() + "-" + String(index + 1).padStart(2, "0"),
        price_vnd: price,
        variant_values,
        is_default: index === 0,
        status: "ACTIVE",
      })),
    );
  }
  return (
    <section className="variant-matrix" aria-label="Ma trận phân loại">
      <h3>Tạo tổ hợp phân loại</h3>
      <p>
        Nhập các giá trị cách nhau bằng dấu phẩy. SKU và giá bên trên là giá trị
        khởi đầu; chưa tạo sản phẩm hoặc nhập kho.
      </p>
      <div className="variant-axis-fields">
        {axes.map((axis) => (
          <label key={axis.code}>
            {axis.name}
            <input
              value={values[axis.code] ?? ""}
              maxLength={2000}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [axis.code]: event.target.value,
                }))
              }
              placeholder={axis.allowed_values?.slice(0, 4).join(", ")}
            />
            {!!axis.allowed_values?.length && (
              <small>Giá trị được phép: {axis.allowed_values.join(", ")}</small>
            )}
          </label>
        ))}
      </div>
      <Button variant="secondary" onClick={generate}>
        {rows.length ? "Tạo lại tổ hợp (thay bản nháp)" : "Xem trước tổ hợp"}
      </Button>
      {error && <p role="alert">{error}</p>}
      {!!rows.length && (
        <>
          <p role="status">
            {rows.length} phân loại · tồn ban đầu 0 · phân loại đầu tiên là mặc
            định. Thuộc tính chung của các trục lấy theo phân loại mặc định; mỗi
            tổ hợp giữ thuộc tính riêng. Kiểm tra từng SKU / giá trước khi tạo.
          </p>
          <div
            className="market-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tổ hợp phân loại xem trước"
          >
            <table>
              <thead>
                <tr>
                  <th>Phân loại</th>
                  <th>SKU</th>
                  <th>Giá bán (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td>{Object.values(row.variant_values).join(" / ")}</td>
                    <td>
                      <input
                        required
                        maxLength={200}
                        aria-label={"SKU tổ hợp " + (index + 1)}
                        value={row.sku}
                        onChange={(event) =>
                          onChange(
                            rows.map((value, i) =>
                              i === index
                                ? { ...value, sku: event.target.value }
                                : value,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        required
                        type="number"
                        min={0}
                        max={Number.MAX_SAFE_INTEGER}
                        step={1}
                        aria-label={"Giá tổ hợp " + (index + 1)}
                        value={row.price_vnd}
                        onChange={(event) =>
                          onChange(
                            rows.map((value, i) =>
                              i === index
                                ? {
                                    ...value,
                                    price_vnd: Number(event.target.value),
                                  }
                                : value,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
