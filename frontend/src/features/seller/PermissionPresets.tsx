import { Button } from "../../components/ui/Button";
const presets = [
  { name: "Kho", permissions: ["inventory.store.read_adjust"] },
  { name: "Xử lý đơn", permissions: ["order.store.read_status_cancel"] },
  {
    name: "Đơn hàng và thu COD",
    permissions: ["order.store.read_status_cancel", "cod.store.collect"],
  },
  { name: "Catalog", permissions: ["product.store.read_write"] },
];
export function PermissionPresets({
  onChange,
  disabled,
}: {
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="permission-presets">
      <p>
        Chọn nhanh nhóm công việc. Mỗi lựa chọn thay toàn bộ bản nháp; kiểm tra
        các quyền bên dưới trước khi lưu.
      </p>
      <div className="ui-actions">
        {presets.map((preset) => (
          <Button
            key={preset.name}
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => onChange([...preset.permissions])}
          >
            {preset.name}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChange([])}
        >
          Bỏ chọn quyền
        </Button>
      </div>
    </div>
  );
}
