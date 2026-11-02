import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui/Button";
export function CopyButton({
  value,
  label = "Sao chép nội dung",
  compact = false,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState("");
  useEffect(() => setStatus(""), [value]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Đã sao chép nội dung.");
    } catch {
      setStatus(
        "Không thể sao chép tự động. Vui lòng chọn và sao chép nội dung bên trên.",
      );
    }
  }
  return (
    <span className={compact ? "ui-copy ui-copy-compact" : "ui-copy"}>
      <Button
        variant="secondary"
        size={compact ? "sm" : "md"}
        onClick={() => void copy()}
      >
        {status === "Đã sao chép nội dung." ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
        {label}
      </Button>
      <span className="ui-copy-feedback" role="status">
        {status}
      </span>
    </span>
  );
}
