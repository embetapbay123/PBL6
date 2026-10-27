import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../api/operations";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { Loading, ErrorView } from "../bootstrap/components";
import { formatMoney } from "./useLiveData";
type Voucher = OperationOutputs["createStoreVoucher"];
export function VoucherPicker({
  input,
  select,
}: {
  input: OperationInputs["suggestVouchers"]["body"];
  select: (voucher: Voucher, remove: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const data = useQuery({
    queryKey: ["voucher-suggestions", input],
    queryFn: () => callOperation("suggestVouchers", { body: input }),
    enabled: open && !!input.address_id && !!input.cart_item_ids.length,
  });
  return (
    <section className="market-voucher-picker">
      <button type="button" onClick={() => setOpen((v) => !v)}>
        {open ? "Đóng gợi ý" : "Chọn voucher / Gợi ý mã"}
      </button>
      {open && (
        <div className="boot-card" aria-label="Voucher có thể chọn">
          <h3>Ưu đãi cho giỏ hàng của bạn</h3>
          <p>
            Mỗi gian hàng dùng một mã và có thể kết hợp một mã toàn sàn. Ước
            tính sẽ được kiểm tra lại khi đặt hàng.
          </p>
          {data.error ? (
            <ErrorView error={data.error} onRetry={() => void data.refetch()} />
          ) : !data.data ? (
            <Loading />
          ) : (
            <>
              {!data.data.items.length && (
                <p>Chưa có mã ưu đãi đang có hiệu lực cho giỏ hàng này.</p>
              )}
              {data.data.items.map((item) => {
                const v = item.voucher,
                  selected =
                    v.scope === "PLATFORM"
                      ? input.platform_voucher_code === v.code
                      : input.store_vouchers?.[v.store_id ?? ""] === v.code;
                return (
                  <article
                    className="market-voucher-option"
                    key={v.id ?? v.code}
                  >
                    <div>
                      <strong>{v.code}</strong>
                      <span className="market-badge">
                        {v.scope === "PLATFORM"
                          ? "Toàn sàn"
                          : "Gian hàng " + v.store_id?.slice(-8)}
                      </span>
                    </div>
                    <p>
                      Giảm{" "}
                      {v.discount_type === "PERCENT"
                        ? v.discount_value + "%"
                        : formatMoney(v.discount_value)}
                      {v.max_discount_vnd != null
                        ? " · tối đa " + formatMoney(v.max_discount_vnd)
                        : ""}
                    </p>
                    <p>
                      Đơn từ {formatMoney(v.min_goods_vnd ?? 0)} ·{" "}
                      {v.per_customer_limit} lượt/khách
                    </p>
                    <small>
                      Hết hạn {new Date(v.ends_at).toLocaleString("vi-VN")}
                    </small>
                    <p>
                      {item.eligible
                        ? "Ước tính tiết kiệm " +
                          formatMoney(item.estimated_discount_vnd)
                        : item.reason}
                    </p>
                    <button
                      type="button"
                      disabled={
                        !selected && (!item.eligible || data.isFetching)
                      }
                      aria-pressed={selected}
                      onClick={() => select(v, selected)}
                    >
                      {selected ? "Bỏ chọn " + v.code : "Chọn " + v.code}
                    </button>
                  </article>
                );
              })}
              {data.data.truncated && (
                <p>Đang hiển thị 100 mã gần hết hạn nhất.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
