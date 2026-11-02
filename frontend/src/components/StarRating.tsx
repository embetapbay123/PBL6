import { useId } from "react";
import { Star } from "lucide-react";
export function StarRating({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  const value = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  return (
    <span
      className="star-rating"
      role="img"
      aria-label={`${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} trên 5 sao${count !== undefined ? `, ${count} đánh giá` : ""}`}
    >
      <span aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={17}
            fill={n <= Math.round(value) ? "currentColor" : "none"}
          />
        ))}
      </span>
      <span aria-hidden="true">
        {value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}/5
        {count !== undefined ? ` · ${count} đánh giá` : ""}
      </span>
    </span>
  );
}
export function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="star-picker" disabled={disabled}>
      <legend>Số sao</legend>
      <div>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n}>
            <input
              type="radio"
              name={id}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-label={`${n} sao`}
            />
            <Star
              aria-hidden="true"
              size={27}
              fill={n <= value ? "currentColor" : "none"}
            />
          </label>
        ))}
        <span aria-hidden="true">{value}/5</span>
      </div>
    </fieldset>
  );
}
