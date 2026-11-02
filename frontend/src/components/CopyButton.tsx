import { useEffect, useState } from "react";
export function CopyButton({
  value,
  label = "Sao chép nội dung",
}: {
  value: string;
  label?: string;
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
    <>
      <button
        type="button"
        className="ui-button ui-button-secondary"
        onClick={() => void copy()}
      >
        {label}
      </button>
      <p role="status">{status}</p>
    </>
  );
}
