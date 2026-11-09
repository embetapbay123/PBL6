import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { Modal } from "../../components/Modal";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { StoreLabel } from "../../live/StoreLabel";
import { HelpCircle, Ticket, Truck } from "lucide-react";

const money = (n: number) => n.toLocaleString("vi-VN") + " ₫";

export function VoucherPicker({
  storeIds,
  onPick,
  onClose,
  initialCode,
}: {
  storeIds: string[];
  onPick: (storeId: string | undefined, code: string) => void;
  onClose: () => void;
  initialCode?: string;
}) {
  const [page, setPage] = useState(1);
  const [inputCode, setInputCode] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>(initialCode ?? "");
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>();
  const [inputError, setInputError] = useState<string | null>(null);

  const ids = [...storeIds].sort().join(",");
  const list = useQuery({
    queryKey: ["available-vouchers", ids, page],
    queryFn: () =>
      callOperation("listAvailableVouchers", {
        query: { store_ids: ids, page, size: 20 },
      }),
  });

  const handleApplyInput = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;
    setSelectedCode(trimmed);
    setSelectedStoreId(undefined);
    setInputError(null);
  };

  const handleConfirm = () => {
    if (selectedCode) {
      onPick(selectedStoreId, selectedCode);
    }
    onClose();
  };

  const platformVouchers = list.data?.items.filter((v) => v.scope === "PLATFORM") ?? [];
  const storeVouchers = list.data?.items.filter((v) => v.scope === "STORE") ?? [];

  return (
    <Modal label="Chọn Shopee Voucher" onClose={onClose}>
      <div className="shopee-voucher-dialog">
        {/* Modal Header */}
        <header className="shopee-voucher-header">
          <h2 className="shopee-voucher-title">Chọn Shopee Voucher</h2>
          <button
            type="button"
            className="shopee-voucher-help-btn"
            title="Hỗ trợ thông tin mã giảm giá"
            onClick={() => alert("Mỗi đơn hàng có thể áp dụng 01 Voucher Vận chuyển và 01 Voucher Giảm giá từ Shop hoặc Sàn.")}
          >
            <span>Hỗ Trợ</span>
            <HelpCircle size={15} />
          </button>
        </header>

        {/* Voucher Input Bar */}
        <div className="shopee-voucher-input-bar">
          <label htmlFor="shopee-voucher-code-input" className="shopee-voucher-input-label">
            Mã Voucher
          </label>
          <div className="shopee-voucher-input-wrap">
            <input
              id="shopee-voucher-code-input"
              type="text"
              placeholder="Mã Shopee Voucher"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyInput();
                }
              }}
              className="shopee-voucher-text-input"
            />
            <button
              type="button"
              disabled={!inputCode.trim()}
              onClick={handleApplyInput}
              className="shopee-voucher-apply-btn"
            >
              ÁP DỤNG
            </button>
          </div>
        </div>

        {inputError && (
          <p className="text-xs text-rose-600 px-4 py-1">{inputError}</p>
        )}

        {/* Scrollable Voucher List Body */}
        <div className="shopee-voucher-body">
          {list.isPending ? (
            <Loading />
          ) : list.error ? (
            <ErrorView error={list.error} onRetry={() => void list.refetch()} />
          ) : (
            <>
              {!list.data?.items.length && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Hiện chưa có mã ưu đãi phù hợp. Bạn có thể nhập trực tiếp mã voucher vào ô tìm kiếm bên trên.
                </div>
              )}

              {/* Section 1: Platform / Free Shipping Vouchers */}
              {platformVouchers.length > 0 && (
                <div className="shopee-voucher-section">
                  <div className="shopee-voucher-section-title-wrap">
                    <h3 className="shopee-voucher-section-title">Mã Toàn Sàn &amp; Vận Chuyển</h3>
                    <span className="shopee-voucher-section-subtitle">Có thể chọn 1 Voucher</span>
                  </div>

                  <div className="shopee-voucher-cards-list">
                    {platformVouchers.map((v) => {
                      const isSelected = selectedCode === v.code;
                      const isPercent = v.discount_type === "PERCENT";
                      return (
                        <div
                          key={v.id ?? v.code}
                          className={`shopee-ticket-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedCode(isSelected ? "" : v.code);
                            setSelectedStoreId(undefined);
                          }}
                        >
                          {/* Left Teal Badge */}
                          <div className="shopee-ticket-left is-teal">
                            <Truck size={22} className="mb-1" />
                            <span className="shopee-ticket-badge-title">PBL6 VIP</span>
                            <span className="shopee-ticket-badge-sub">TOÀN SÀN</span>
                          </div>

                          {/* Right Content */}
                          <div className="shopee-ticket-right">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="shopee-ticket-title">
                                Giảm {isPercent ? `${v.discount_value}%` : money(v.discount_value)}
                                {v.max_discount_vnd ? ` tối đa ${money(v.max_discount_vnd)}` : ""}
                                {` cho đơn từ ${money(v.min_goods_vnd ?? 0)}`}
                              </h4>
                              {v.per_customer_limit && (
                                <span className="shopee-ticket-count-badge">x{v.per_customer_limit}</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span className="shopee-ticket-exp">
                                HSD: {new Date(v.ends_at).toLocaleDateString("vi-VN")}
                                <span className="shopee-ticket-terms">Điều Kiện</span>
                              </span>

                              {/* Radio Indicator */}
                              <div className="shopee-ticket-radio">
                                <span className={`shopee-radio-circle ${isSelected ? "is-checked" : ""}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Store Discount Vouchers */}
              {storeVouchers.length > 0 && (
                <div className="shopee-voucher-section">
                  <div className="shopee-voucher-section-title-wrap">
                    <h3 className="shopee-voucher-section-title">Mã Giảm Giá Từ Shop</h3>
                    <span className="shopee-voucher-section-subtitle">Có thể chọn 1 Voucher</span>
                  </div>

                  <div className="shopee-voucher-cards-list">
                    {storeVouchers.map((v) => {
                      const isSelected = selectedCode === v.code;
                      const isPercent = v.discount_type === "PERCENT";
                      return (
                        <div
                          key={v.id ?? v.code}
                          className={`shopee-ticket-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedCode(isSelected ? "" : v.code);
                            setSelectedStoreId(v.store_id);
                          }}
                        >
                          {/* Left Orange Badge */}
                          <div className="shopee-ticket-left is-orange">
                            <Ticket size={22} className="mb-1" />
                            <span className="shopee-ticket-badge-title">SHOP</span>
                            <span className="shopee-ticket-badge-sub">VOUCHER</span>
                          </div>

                          {/* Right Content */}
                          <div className="shopee-ticket-right">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="shopee-ticket-title">
                                  Giảm {isPercent ? `${v.discount_value}%` : money(v.discount_value)}
                                  {v.max_discount_vnd ? ` tối đa ${money(v.max_discount_vnd)}` : ""}
                                  {` cho đơn từ ${money(v.min_goods_vnd ?? 0)}`}
                                </h4>
                                {v.store_id && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    <StoreLabel id={v.store_id} />
                                  </div>
                                )}
                              </div>
                              {v.per_customer_limit && (
                                <span className="shopee-ticket-count-badge">x{v.per_customer_limit}</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span className="shopee-ticket-exp">
                                HSD: {new Date(v.ends_at).toLocaleDateString("vi-VN")}
                                <span className="shopee-ticket-terms">Điều Kiện</span>
                              </span>

                              {/* Radio Indicator */}
                              <div className="shopee-ticket-radio">
                                <span className={`shopee-radio-circle ${isSelected ? "is-checked" : ""}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {list.data && list.data.total > list.data.size && (
                <div className="pt-2">
                  <Pagination
                    page={page}
                    size={list.data.size}
                    total={list.data.total}
                    onPage={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="shopee-voucher-footer">
          <button
            type="button"
            className="shopee-voucher-btn-cancel"
            onClick={onClose}
          >
            TRỞ LẠI
          </button>
          <button
            type="button"
            className="shopee-voucher-btn-confirm"
            onClick={handleConfirm}
          >
            ĐỒNG Ý
          </button>
        </footer>
      </div>
    </Modal>
  );
}
