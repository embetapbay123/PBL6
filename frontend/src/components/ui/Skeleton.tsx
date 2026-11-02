import { LoaderCircle, PackageSearch } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({
  label = "Đang tải…",
  variant = "inline",
}: {
  label?: string;
  variant?: "inline" | "cards" | "rows";
}) {
  return (
    <div
      className={"ui-loading ui-loading-" + variant}
      role="status"
      aria-live="polite"
    >
      <span className="ui-loading-label">
        <LoaderCircle size={18} className="ui-spinner" aria-hidden="true" />
        {label}
      </span>
      {variant !== "inline" && (
        <div className="ui-skeleton-grid" aria-hidden="true">
          {Array.from({ length: variant === "cards" ? 4 : 3 }, (_, i) => (
            <div key={i} className="ui-skeleton-item">
              {variant === "cards" && <div className="ui-skeleton-picture" />}
              <div className="ui-skeleton-line" />
              <div className="ui-skeleton-line ui-skeleton-short" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="ui-empty">
      <PackageSearch size={27} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
