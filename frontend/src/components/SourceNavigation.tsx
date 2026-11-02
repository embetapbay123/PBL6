export const auditSources = [
  ["catalog", "Sản phẩm và kho"],
  ["commerce", "Đơn hàng và thanh toán"],
  ["identity", "Tài khoản và gian hàng"],
] as const;
export function SourceNavigation({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <nav className="workspace-sections" aria-label="Nguồn nhật ký">
      {auditSources.map(([key, label]) => (
        <button
          type="button"
          key={key}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
