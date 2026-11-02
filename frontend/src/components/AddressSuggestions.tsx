import { useId } from "react";
import reference from "../data/vietnam-address-suggestions.json";
/** Local reference only: never sends recipient, phone or typed addresses to another service.
 * Free text preserves historical/non-matching addresses. Suggestions never rewrite other fields. */
export function AddressSuggestions({
  city,
  ward,
  onCity,
  onWard,
  cityLabel = "Tỉnh/thành phố",
  wardLabel = "Phường/xã",
}: {
  city: string;
  ward: string;
  onCity: (value: string) => void;
  onWard: (value: string) => void;
  cityLabel?: string;
  wardLabel?: string;
}) {
  const id = useId(),
    normal = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .toLowerCase()
        .replace(/^(tinh|thanh pho)\s+/, "")
        .trim();
  const province = reference.provinces.find(
    (p) => normal(p.name) === normal(city),
  );
  return (
    <div className="address-suggestions">
      <label>
        {cityLabel}
        <input
          required
          maxLength={200}
          autoComplete="address-level1"
          list={id + "-cities"}
          value={city}
          onChange={(e) => onCity(e.target.value)}
        />
      </label>
      <datalist id={id + "-cities"}>
        {reference.provinces.map((p) => (
          <option key={p.name} value={p.name} />
        ))}
      </datalist>
      <label>
        {wardLabel}
        <input
          required
          maxLength={200}
          autoComplete="address-level2"
          list={id + "-wards"}
          value={ward}
          onChange={(e) => onWard(e.target.value)}
        />
      </label>
      <datalist id={id + "-wards"}>
        {province?.wards.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <p className="form-hint">
        Chọn tỉnh/thành để có gợi ý phường/xã theo danh mục sau 07/2025. Có thể
        nhập nguyên văn địa chỉ được cung cấp; dữ liệu gợi ý không tự sửa địa
        chỉ đã lưu.
      </p>
    </div>
  );
}
