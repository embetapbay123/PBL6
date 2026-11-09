import type { OperationInputs } from '../../api/operations.generated';
import type { ReturnRequest } from './ReturnRequestView';
import { variantLabel } from '../../components/variant-identity';

type Line = NonNullable<OperationInputs['updateStoreReturnRequest']['body']['inspection']>[number];
const fields = [
  ['received_quantity', 'Thực nhận'],
  ['resellable_quantity', 'Bán lại được'],
  ['damaged_quantity', 'Hỏng / không bán lại'],
  ['pending_quantity', 'Chờ kiểm'],
] as const;
const count = (n: number) => Number.isFinite(n) ? n : 0;

export function ReturnInspectionFields({ items, lines, onChange, locked, id }: {
  items: NonNullable<ReturnRequest['items']>;
  lines: Line[];
  onChange: (lines: Line[]) => void;
  locked: boolean;
  id: string;
}) {
  const ordered = items.reduce((sum, item) => sum + item.quantity, 0);
  const received = lines.reduce((sum, line) => sum + count(line.received_quantity), 0);
  const pending = lines.reduce((sum, line) => sum + count(line.pending_quantity), 0);
  return <section className="return-inspection" aria-label="Số lượng kiểm hàng">
    <p className="return-inspection-overview">
      Đã nhận <strong>{received}/{ordered}</strong> · Thiếu <strong>{Math.max(0, ordered - received)}</strong> · Chờ kiểm <strong>{pending}</strong>
    </p>
    <div className="return-inspection-items">
      {items.map((item, index) => {
        const line = lines[index];
        if (!line) return null;
        const assigned = count(line.resellable_quantity) + count(line.damaged_quantity) + count(line.pending_quantity);
        const validNumbers = fields.every(([field]) => Number.isSafeInteger(line[field]) && line[field] >= 0);
        const difference = count(line.received_quantity) - assigned;
        const invalid = !validNumbers || line.received_quantity > item.quantity || difference !== 0;
        const error = !validNumbers ? 'Nhập số nguyên từ 0 trở lên.' : line.received_quantity > item.quantity
          ? `Thực nhận không được vượt ${item.quantity} món đã mua.`
          : difference > 0 ? `Còn ${difference} món chưa phân loại. Bổ sung vào Bán lại được, Hỏng hoặc Chờ kiểm.`
          : difference < 0 ? `Phân loại đang vượt ${-difference} món so với thực nhận. Kiểm tra lại các ô số.` : '';
        const snapshot = item.product_snapshot as Record<string, unknown> | undefined;
        const title = typeof snapshot?.title === 'string' ? snapshot.title : 'Sản phẩm trong đơn';
        return <fieldset id={id + '-line-' + index} tabIndex={-1} key={item.order_item_id} disabled={locked}
          className={'return-inspection-item' + (invalid ? ' has-error' : '')}>
          <legend className="sr-only">{title} · Mục {index + 1}</legend>
          <div className="return-inspection-product">
            <div><strong>{title}</strong><p>{variantLabel(snapshot?.variant_values as Record<string, unknown> | undefined, 'Phân loại tiêu chuẩn')}{item.sku_snapshot && <span> · SKU: {item.sku_snapshot}</span>}</p></div>
            <span className="return-inspection-purchased">Đã mua <strong>{item.quantity}</strong></span>
          </div>
          <div className="return-inspection-quantities">
            {fields.map(([field, label]) => <div key={field}>
              <label htmlFor={id + '-' + index + '-' + field}>{label}</label>
              <input id={id + '-' + index + '-' + field} required type="number" inputMode="numeric" min={0} max={item.quantity} step={1}
                aria-invalid={invalid || undefined} aria-describedby={error ? id + '-' + index + '-error' : undefined}
                value={Number.isNaN(line[field]) ? '' : line[field]}
                onChange={event => onChange(lines.map((current, n) => n === index ? {...current, [field]: event.target.value === '' ? NaN : Number(event.target.value)} : current))}/>
            </div>)}
          </div>
          {error && <p className="return-inspection-error" role="alert" id={id + '-' + index + '-error'}>Mục {index + 1}: {error}</p>}
        </fieldset>;
      })}
    </div>
  </section>;
}
