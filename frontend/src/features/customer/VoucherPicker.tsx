import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { Modal } from "../../components/Modal";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { StoreLabel } from "../../live/StoreLabel";
import { Ticket } from "lucide-react";
import type {OperationInputs, OperationOutputs} from "../../api/operations.generated";

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
  selection,
}: {
  storeIds: string[];
  onPick: (vouchers: SelectedVouchers, result: OperationOutputs['suggestCheckoutVouchers']) => void | boolean | Promise<void | boolean>;
  onClose: () => void;
  initialVouchers?: SelectedVouchers;
  selection: OperationInputs['suggestCheckoutVouchers']['body'];
}) {
  const [page, setPage] = useState(1);
  const [inputCode, setInputCode] = useState("");
  const [selectedPlatformCode, setSelectedPlatformCode] = useState<string>(
    initialVouchers?.platform_voucher_code ?? ""
  );
  const [selectedStoreVouchers, setSelectedStoreVouchers] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialVouchers?.store_vouchers ?? {}).filter(([id]) => storeIds.includes(id)))
  );
  const [inputNotice, setInputNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [resolvedContext, setResolvedContext] = useState('');
  const [result, setResult] = useState<OperationOutputs['suggestCheckoutVouchers'] | null>(null);
  const currentSelection = {platform_voucher_code: selectedPlatformCode || undefined, store_vouchers: selectedStoreVouchers};
  const chosen = useRef(currentSelection);
  chosen.current = currentSelection;
  const dirty = useRef(Boolean(selectedPlatformCode || Object.keys(selectedStoreVouchers).length));
  const {mode: _mode, code: _code, store_vouchers: _stores, platform_voucher_code: _platform, ...baseSelection} = selection;
  const contextKey = JSON.stringify(baseSelection);
  const latestContext = useRef(contextKey);
  latestContext.current = contextKey;
  const flight = useRef<AbortController | null>(null);
  const lastRequest = useRef<{mode: 'AUTO' | 'MANUAL'; vouchers: SelectedVouchers; code?: string}>({mode: 'AUTO', vouchers: {}});
  const run = useCallback(async (mode: 'AUTO' | 'MANUAL', vouchers: SelectedVouchers, code?: string) => {
    lastRequest.current = {mode, vouchers, code};
    flight.current?.abort();
    const controller = new AbortController();
    flight.current = controller;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await callOperation('suggestCheckoutVouchers', {
        body: {...JSON.parse(contextKey), ...vouchers, mode, ...(code ? {code} : {})},
      }, {signal: controller.signal});
      if (controller.signal.aborted || latestContext.current !== contextKey) return null;
      setSelectedPlatformCode(response.selected.platform_voucher_code ?? '');
      setSelectedStoreVouchers(response.selected.store_vouchers ?? {});
      chosen.current = {platform_voucher_code: response.selected.platform_voucher_code, store_vouchers: response.selected.store_vouchers ?? {}};
      setResult(response);
      setResolvedContext(contextKey);
      return response;
    } catch (cause) {
      if (!controller.signal.aborted && latestContext.current === contextKey)
        setError(cause instanceof Error ? cause.message : 'Chưa kiểm tra được mã. Hãy thử lại.');
      return null;
    } finally {
      if (flight.current === controller) setPending(false);
    }
  }, [contextKey]);

  useEffect(() => {
    void run(dirty.current ? 'MANUAL' : 'AUTO', dirty.current ? chosen.current : {});
    return () => flight.current?.abort();
  }, [run]);

  const ids = [...storeIds].sort().join(",");
  const list = useQuery({
    queryKey: ["available-vouchers", ids, page],
    queryFn: () =>
      callOperation("listAvailableVouchers", {
        query: { store_ids: ids, page, size: 20 },
      }),
  });

  const handleApplyInput = async () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;
    dirty.current = true;
    const response = await run('MANUAL', chosen.current, trimmed);
    if (response) {
      setInputCode('');
      setInputNotice(`Đã chọn mã ${trimmed}.`);
    }
  };

  const handleConfirm = async () => {
    if (pending || committing) return;
    setCommitting(true);
    try {
      const response = await run('MANUAL', chosen.current);
      if (response && latestContext.current === contextKey) {
        const accepted = await onPick(response.selected, response);
        if (accepted !== false) onClose();
        else setError('Thông tin đặt hàng vừa thay đổi. Kiểm tra lại rồi áp dụng mã lần nữa.');
      }
    } finally {setCommitting(false);}
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
      <div className="shopee-voucher-dialog" aria-busy={pending || committing}>
        {/* Modal Header */}
        <header className="shopee-voucher-header">
          <h2 className="shopee-voucher-title">Chọn mã giảm giá</h2>
          <button type="button" className="shopee-voucher-apply-btn" disabled={pending || committing}
            onClick={() => {dirty.current = true; void run('AUTO', {});}}>Tự chọn lại</button>
        </header>

        {/* Voucher Input Bar */}
        <div className="shopee-voucher-input-bar">
          <label htmlFor="shopee-voucher-code-input" className="shopee-voucher-input-label">
            Mã giảm giá
          </label>
          <div className="shopee-voucher-input-wrap">
            <input
              id="shopee-voucher-code-input"
              type="text"
              placeholder="Nhập mã giảm giá"
              value={inputCode}
              maxLength={200}
              onChange={(e) => {
                setInputCode(e.target.value);
                setInputNotice(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !pending) {
                  e.preventDefault();
                  handleApplyInput();
                }
              }}
              className="shopee-voucher-text-input"
            />
            <button
              type="button"
              disabled={!inputCode.trim() || pending || committing}
              onClick={handleApplyInput}
              className="shopee-voucher-apply-btn"
            >
              Chọn mã
            </button>
          </div>
        </div>

        {inputNotice && (
          <p role="status" className="text-xs text-emerald-700 px-4 py-1 m-0 font-medium">{inputNotice}</p>
        )}
        <div className="voucher-suggestion-summary" aria-live="polite" aria-busy={pending}>
          {pending ? <p>Đang tính ưu đãi…</p> : result && resolvedContext === contextKey && <>
            <p><strong>{result.optimality === 'OPTIMAL' ? 'Ưu đãi tốt nhất' : result.optimality === 'LIMITED' ? 'Gợi ý ưu đãi' : 'Ưu đãi đã chọn'}</strong> · Tiết kiệm {money(result.discount_total_vnd)}</p>
            <p>{result.quote ? 'Tổng thanh toán' : 'Tiền hàng sau giảm'}: <strong>{money(result.quote?.payable_total_vnd ?? result.net_goods_total_vnd)}</strong>{!result.quote && ' (chưa gồm phí giao hàng)'}</p>
          </>}
          {error && <p role="alert">{error} <button type="button" disabled={pending || committing} onClick={() => {const retry = lastRequest.current; void run(retry.mode, retry.vouchers, retry.code);}}>Thử lại</button></p>}
          <button type="button" disabled={pending || committing} onClick={() => {dirty.current = true; setInputNotice(null); void run('MANUAL', {});}}>Bỏ tất cả</button>
          <details><summary>Điều kiện áp dụng</summary><p>Tối đa một mã sàn và một mã mỗi gian hàng. Mã sàn tính trên tiền hàng sau giảm của gian hàng. Lượt dùng được kiểm tra lại khi đặt hàng.</p></details>
        </div>

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
                          disabled={pending || committing}
                          onClick={() => {dirty.current = true; setInputNotice(null); void run('MANUAL', {...chosen.current, platform_voucher_code: isSelected ? undefined : v.code});}}
                        >
                          {/* Left Teal Badge */}
                          <div className="shopee-ticket-left is-teal">
                            <Ticket size={22} className="mb-1" />
                            <span className="shopee-ticket-badge-title">PBL6</span>
                              <span className="shopee-ticket-badge-sub">TOÀN SÀN</span>
                          </div>

                          {/* Right Content */}
                          <div className="shopee-ticket-right">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="shopee-ticket-title">
                                Giảm {isPercent ? `${v.discount_value}%` : money(v.discount_value)}
                                {v.max_discount_vnd != null ? ` tối đa ${money(v.max_discount_vnd)}` : ""}
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
                    <h3 className="shopee-voucher-section-title">Mã gian hàng</h3>
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
                                disabled={pending || committing}
                                onClick={() => {
                                  dirty.current = true; setInputNotice(null);
                                  const next = {...chosen.current.store_vouchers};
                                  if (isSelected) delete next[storeId]; else next[storeId] = v.code;
                                  void run('MANUAL', {...chosen.current, store_vouchers: next});
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
                                        {v.max_discount_vnd != null ? ` tối đa ${money(v.max_discount_vnd)}` : ""}
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
            disabled={pending || committing || !result || resolvedContext !== contextKey || Boolean(error)}
            onClick={handleConfirm}
          >
            Áp dụng
          </button>
        </footer>
      </div>
    </Modal>
  );
}
