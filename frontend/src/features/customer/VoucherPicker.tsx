import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { Modal } from "../../components/Modal";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { StoreLabel } from "../../live/StoreLabel";
const money = (n: number) => n.toLocaleString("vi-VN") + " ₫";
export function VoucherPicker({
  storeIds,
  onPick,
  onClose,
}: {
  storeIds: string[];
  onPick: (storeId: string | undefined, code: string) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1),
    ids = [...storeIds].sort().join(",");
  const list = useQuery({
    queryKey: ["available-vouchers", ids, page],
    queryFn: () =>
      callOperation("listAvailableVouchers", {
        query: { store_ids: ids, page, size: 12 },
      }),
  });
  return (
    <Modal label="Chọn mã ưu đãi" onClose={onClose}>
      <h2>Chọn mã ưu đãi</h2>
      <p>
        Mã đang mở của sàn và các cửa hàng trong đơn. Điều kiện và lượt còn lại
        được kiểm tra lại khi áp dụng và đặt hàng.
      </p>
      {list.isPending ? (
        <Loading />
      ) : list.error ? (
        <ErrorView error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <>
          {!list.data?.items.length && (
            <p>
              Hiện chưa có mã gợi ý. Bạn vẫn có thể nhập mã được cửa hàng cung
              cấp.
            </p>
          )}
          <div className="voucher-options">
            {list.data?.items.map((v) => (
              <article className="voucher-option" key={v.id ?? v.code}>
                <h3>{v.code}</h3>
                <p>
                  {v.scope === "PLATFORM" ? (
                    "Ưu đãi toàn sàn"
                  ) : (
                    <StoreLabel id={v.store_id!} />
                  )}
                </p>
                <strong>
                  Giảm{" "}
                  {v.discount_type === "PERCENT"
                    ? v.discount_value + "%"
                    : money(v.discount_value)}
                </strong>
                {v.max_discount_vnd !== undefined && (
                  <p>Tối đa {money(v.max_discount_vnd)}</p>
                )}
                <p>
                  Tiền hàng từ {money(v.min_goods_vnd ?? 0)} ·{" "}
                  {v.per_customer_limit} lượt/khách
                </p>
                <p>Đến {new Date(v.ends_at).toLocaleString("vi-VN")}</p>
                <button
                  className="ui-button ui-button-secondary"
                  onClick={() => {
                    onPick(
                      v.scope === "STORE" ? v.store_id : undefined,
                      v.code,
                    );
                    onClose();
                  }}
                >
                  Chọn {v.code}
                </button>
              </article>
            ))}
          </div>
          {list.data && (
            <Pagination
              page={page}
              size={list.data.size}
              total={list.data.total}
              onPage={setPage}
            />
          )}
        </>
      )}
      <button type="button" onClick={onClose}>
        Đóng danh sách ưu đãi
      </button>
    </Modal>
  );
}
