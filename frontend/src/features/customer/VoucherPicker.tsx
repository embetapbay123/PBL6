import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { Modal } from "../../components/Modal";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { StoreLabel } from "../../live/StoreLabel";
import { HelpCircle, Ticket, Truck } from "lucide-react";

const money = (n: number) => n.toLocaleString("vi-VN") + " ₫";

export interface SelectedVouchers {
  platform_voucher_code?: string;
  store_vouchers?: Record<string, string>; // store_id -> voucher_code
}

export function VoucherPicker({
  storeIds,
  onPick,
  onClose,
  initialVouchers,
}: {
  storeIds: string[];
  onPick: (vouchers: SelectedVouchers) => void;
  onClose: () => void;
  initialVouchers?: SelectedVouchers;
}) {
  const [page, setPage] = useState(1);
  const [inputCode, setInputCode] = useState("");
  const [selectedPlatformCode, setSelectedPlatformCode] = useState<string>(
    initialVouchers?.platform_voucher_code ?? ""
  );
  const [selectedStoreVouchers, setSelectedStoreVouchers] = useState<Record<string, string>>(
    initialVouchers?.store_vouchers ? { ...initialVouchers.store_vouchers } : {}
  );
  const [inputNotice, setInputNotice] = useState<string | null>(null);

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
    const match = list.data?.items.find((item) => item.code.toUpperCase() === trimmed);
    if (match) {
      if (match.scope === "PLATFORM") {
        setSelectedPlatformCode(match.code);
        setInputNotice(`Đã chọn mã toàn sàn: ${match.code}`);
      } else if (match.scope === "STORE" && match.store_id) {
        setSelectedStoreVouchers((prev) => ({
          ...prev,
          [match.store_id!]: match.code,
        }));
        setInputNotice(`Đã chọn mã gian hàng: ${match.code}`);
      }
    } else {
      // Cho phép áp mã chưa có trong trang hiển thị như mã toàn sàn
      setSelectedPlatformCode(trimmed);
      setInputNotice(`Đã chọn mã: ${trimmed}`);
    }
    setInputCode("");
  };

  const handleConfirm = () => {
    const cleanStoreVouchers: Record<string, string> = {};
    for (const [sId, code] of Object.entries(selectedStoreVouchers)) {
      if (code && code.trim()) {
        cleanStoreVouchers[sId] = code.trim();
      }
    }
    onPick({
      platform_voucher_code: selectedPlatformCode.trim() || undefined,
      store_vouchers: Object.keys(cleanStoreVouchers).length > 0 ? cleanStoreVouchers : undefined,
    });
    onClose();
  };

  const platformVouchers = list.data?.items.filter((v) => v.scope === "PLATFORM") ?? [];
  const storeVouchers = list.data?.items.filter((v) => v.scope === "STORE") ?? [];

  // Group store vouchers by store_id
  const storeVouchersByStore = storeVouchers.reduce<Record<string, typeof storeVouchers>>((acc, v) => {
    const sId = v.store_id || "unknown";
    if (!acc[sId]) acc[sId] = [];
    acc[sId].push(v);
    return acc;
  }, {});

  const totalSelectedCount =
    (selectedPlatformCode ? 1 : 0) + Object.keys(selectedStoreVouchers).filter((k) => !!selectedStoreVouchers[k]).length;

  return (
    <Modal label="Chọn mã giảm giá" onClose={onClose}>
      <div className="shopee-voucher-dialog">
        {/* Modal Header */}
        <header className="shopee-voucher-header">
          <h2 className="shopee-voucher-title">Chọn mã giảm giá</h2>
          <button
            type="button"
            className="shopee-voucher-help-btn"
            title="Hỗ trợ thông tin mã giảm giá"
            onClick={() =>
              alert(
                "Bạn có thể chọn cùng lúc: 01 Voucher Toàn Sàn (hoặc Miễn Phí Vận Chuyển) + 01 Voucher cho mỗi Gian Hàng trong đơn!"
              )
            }
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
              placeholder="Nhập mã voucher (Sàn hoặc Shop)"
              value={inputCode}
              maxLength={50}
              onChange={(e) => {
                setInputCode(e.target.value);
                setInputNotice(null);
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
              Chọn mã
            </button>
          </div>
        </div>

        {inputNotice && (
          <p className="text-xs text-emerald-700 px-4 py-1 m-0 font-medium">{inputNotice}</p>
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
                    <h3 className="shopee-voucher-section-title">Mã toàn sàn</h3>
                    <span className="shopee-voucher-section-subtitle">
                      {selectedPlatformCode ? `Đã chọn: ${selectedPlatformCode}` : "Có thể chọn 1 Voucher"}
                    </span>
                  </div>

                  <div className="shopee-voucher-cards-list">
                    {platformVouchers.map((v) => {
                      const isSelected = selectedPlatformCode === v.code;
                      const isPercent = v.discount_type === "PERCENT";
                      return (
                        <button
                          type="button"
                          aria-label={'Mã ' + v.code}
                          aria-pressed={isSelected}
                          key={v.id ?? v.code}
                          className={`shopee-ticket-card ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            setSelectedPlatformCode(isSelected ? "" : v.code);
                          }}
                        >
                          {/* Left Teal Badge */}
                          <div className="shopee-ticket-left is-teal">
                            <Truck size={22} className="mb-1" />
                            <span className="shopee-ticket-badge-title">PBL6</span>
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
                                Mã: <strong>{v.code}</strong> · HSD: {new Date(v.ends_at).toLocaleDateString("vi-VN")}
                              </span>

                              {/* Radio / Checkbox Indicator */}
                              <div className="shopee-ticket-radio">
                                <span className={`shopee-radio-circle ${isSelected ? "is-checked" : ""}`} />
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 2: Store Discount Vouchers */}
              {Object.keys(storeVouchersByStore).length > 0 && (
                <div className="shopee-voucher-section">
                  <div className="shopee-voucher-section-title-wrap">
                    <h3 className="shopee-voucher-section-title">Mã Giảm Giá Từ Shop</h3>
                    <span className="shopee-voucher-section-subtitle">
                      Mỗi gian hàng có thể áp dụng 1 voucher
                    </span>
                  </div>

                  {Object.entries(storeVouchersByStore).map(([storeId, vList]) => {
                    const currentStorePicked = selectedStoreVouchers[storeId];
                    return (
                      <div key={storeId} className="mb-4">
                        <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                          <span>
                            Gian hàng: <StoreLabel id={storeId} />
                          </span>
                          {currentStorePicked && (
                            <span className="text-emerald-700">Đã chọn: {currentStorePicked}</span>
                          )}
                        </div>
                        <div className="shopee-voucher-cards-list">
                          {vList.map((v) => {
                            const isSelected = selectedStoreVouchers[storeId] === v.code;
                            const isPercent = v.discount_type === "PERCENT";
                            return (
                              <button
                                type="button"
                                aria-label={'Mã ' + v.code}
                                aria-pressed={isSelected}
                                key={v.id ?? v.code}
                                className={`shopee-ticket-card ${isSelected ? "is-selected" : ""}`}
                                onClick={() => {
                                  setSelectedStoreVouchers((prev) => {
                                    const next = { ...prev };
                                    if (next[storeId] === v.code) {
                                      delete next[storeId];
                                    } else {
                                      next[storeId] = v.code;
                                    }
                                    return next;
                                  });
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
                                    </div>
                                    {v.per_customer_limit && (
                                      <span className="shopee-ticket-count-badge">x{v.per_customer_limit}</span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-2">
                                    <span className="shopee-ticket-exp">
                                      Mã: <strong>{v.code}</strong> · HSD: {new Date(v.ends_at).toLocaleDateString("vi-VN")}
                                    </span>

                                    {/* Radio / Checkbox Indicator */}
                                    <div className="shopee-ticket-radio">
                                      <span className={`shopee-radio-circle ${isSelected ? "is-checked" : ""}`} />
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
          <div className="text-xs text-slate-600 mr-auto">
            {totalSelectedCount > 0 ? (
              <span>
                Đã chọn <strong>{totalSelectedCount}</strong> voucher
                {selectedPlatformCode ? ` (Sàn: ${selectedPlatformCode})` : ""}
                {Object.keys(selectedStoreVouchers).length > 0
                  ? ` (Shop: ${Object.values(selectedStoreVouchers).join(", ")})`
                  : ""}
              </span>
            ) : (
              <span>Chưa chọn voucher nào</span>
            )}
          </div>
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
            Áp dụng
          </button>
        </footer>
      </div>
    </Modal>
  );
}
