import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../api/auth-context";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { CashChart, downloadReportCsv } from "./CashChart";
import { Button } from "../../components/ui/Button";
import { Download, Sparkles, CheckCircle2, Clock, Wallet, Calendar, ArrowDownRight } from "lucide-react";

type Scope = "STORE" | "ADMIN";
type Summary = Pick<
  OperationOutputs["getStoreReport"],
  | "period_start"
  | "period_end"
  | "order_value_vnd"
  | "completed_goods_revenue_vnd"
  | "collected_vnd"
  | "refunded_vnd"
  | "shipping_fee_vnd"
  | "order_count"
> &
  Partial<
    Pick<
      OperationOutputs["getStoreReport"],
      | "store_id"
      | "timezone"
      | "unresolved_collected_vnd"
      | "unresolved_refunded_vnd"
      | "cash_series"
      | "low_stock_variant_ids"
      | "revenue_series"
    >
  >;
const money = (value: number) => value.toLocaleString("vi-VN") + " ₫";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const time = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
function day(value: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  return parts.year + "-" + parts.month + "-" + parts.day;
}
function dateValid(value: string) {
  return (
    /^\d{4}-\d\d-\d\d$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
const sources: Record<string, string> = {
  OWNER_ATTESTED:
    "Thời điểm biên nhận do Owner xác nhận thủ công; không phải ngân hàng kiểm chứng",
  SYSTEM_RECEIVED:
    "Thời điểm hệ thống tiếp nhận; chưa có timestamp giao dịch được provider xác minh",
  SYSTEM_CONFIRMED: "Thời điểm hệ thống xác nhận giao dịch",
};
const countLabels = {
  order_count: "Số đơn tạo trong kỳ",
  order_value_vnd: "Giá trị đơn tạo trong kỳ",
  completed_goods_revenue_vnd: "Giá trị hàng hoàn tất của đơn tạo trong kỳ",
  shipping_fee_vnd: "Phí giao của đơn tạo trong kỳ",
  collected_vnd: "Tiền xác nhận thu trong kỳ",
  refunded_vnd: "Tiền xác nhận hoàn trong kỳ",
} as const;

export function FinancialReport({ scope = "STORE" }: { scope?: Scope }) {
  const { session } = useAuth(),
    [params, setParams] = useSearchParams(),
    context = session?.context,
    cache = useQueryClient();
  const validViews = ['summary', 'cash', 'entries', 'gaps'] as const;
  const paramKey = scope === "ADMIN" ? "view" : "tab";
  const rawView = scope === "ADMIN"
    ? params.get("view") ?? params.get("report_tab") ?? "summary"
    : params.get("tab") ?? params.get("view") ?? "summary";
  const reportView = validViews.find((v) => v === rawView) ?? "summary";
  const setReportView = (view: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (view && view !== "summary") {
        next.set(paramKey, view);
      } else {
        next.delete(paramKey);
        if (paramKey === "tab") next.delete("view");
      }
      return next;
    });
  };
  const [reading, setReading] = useState(false),
    flight = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const allowed =
    scope === "ADMIN"
      ? !!context?.roles.includes("ADMIN") &&
        !!context.role_permissions?.includes("platform.admin")
      : !!context?.roles.includes("STORE_OWNER") &&
        context.store_membership?.role === "OWNER" &&
        context.store_membership.status === "ACTIVE";
  const today = day(new Date()),
    tomorrow = day(new Date(Date.now() + 86400000));
  const from = params.get("from") ?? today.slice(0, 7) + "-01",
    to = params.get("to") ?? tomorrow,
    store = scope === "ADMIN" ? (params.get("store_id") ?? "") : "";
  const granularity = params.get("granularity") === "MONTH" ? "MONTH" : "DAY";
  const [draftFrom, setFrom] = useState(from),
    [draftTo, setTo] = useState(to),
    [draftStore, setStore] = useState(store),
    [draftUnit, setUnit] = useState(granularity),
    [showGaps, setShowGaps] = useState(false);
  useEffect(() => {
    setFrom(from);
    setTo(to);
    setStore(store);
    setUnit(granularity);
  }, [from, to, store, granularity]);
  const valid =
    dateValid(from) &&
    dateValid(to) &&
    from < to &&
    (!store || uuid.test(store));
  const draftValid = dateValid(draftFrom) && dateValid(draftTo) && draftFrom < draftTo &&
    (!draftStore || uuid.test(draftStore));
  const draftChanged = draftFrom !== from || draftTo !== to || draftStore !== store || draftUnit !== granularity;

  const applyQuickRange = (type: 'today' | '7days' | '30days' | 'this_month') => {
    let f = today;
    let t = tomorrow;
    if (type === 'today') {
      f = today;
      t = tomorrow;
    } else if (type === '7days') {
      const d = new Date(Date.now() - 6 * 86400000);
      f = day(d);
      t = tomorrow;
    } else if (type === '30days') {
      const d = new Date(Date.now() - 29 * 86400000);
      f = day(d);
      t = tomorrow;
    } else if (type === 'this_month') {
      f = today.slice(0, 7) + '-01';
      t = tomorrow;
    }
    setFrom(f);
    setTo(t);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("from", f);
      next.set("to", t);
      next.delete("money_page");
      next.delete("gap_page");
      return next;
    });
  };

  const period: { from: string; to: string; granularity: "DAY" | "MONTH" } = {
    from: from + "T00:00:00+07:00",
    to: to + "T00:00:00+07:00",
    granularity,
  };
  const query = useQuery<Summary>({
    queryKey: ["financial-report", scope, period, store],
    staleTime: 0,
    enabled: allowed && valid,
    queryFn: async ({ signal }) =>
      scope === "ADMIN"
        ? callOperation(
            "getPlatformMoneyReport",
            { query: { ...period, ...(store ? { store_id: store } : {}) } },
            { signal },
          )
        : callOperation("getStoreReport", { query: period }, { signal }),
  });
  async function reload() {
    if (flight.current || !allowed || !valid) return;
    flight.current = true;
    setReading(true);
    try {
      await cache.refetchQueries({
        type: "active",
        predicate: (q) =>
          [
            "financial-report",
            "report-money-entries",
            "report-unresolved",
          ].includes(String(q.queryKey[0])),
      });
    } finally {
      flight.current = false;
      if (alive.current) setReading(false);
    }
  }
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            scope === "ADMIN"
              ? "Cần quyền quản trị báo cáo."
              : "Báo cáo dành cho Owner hiện hành.",
          )
        }
      />
    );
  return (
    <section className="seller-financial-report">
      <h1>
        {scope === "ADMIN"
          ? "Báo cáo thu / hoàn toàn sàn"
          : "Báo cáo gian hàng"}
      </h1>
      <details className="report-definition"><summary>Cách tính</summary><p>
        Kỳ theo giờ Việt Nam (Asia/Ho_Chi_Minh): gồm đầu ngày bắt đầu, không gồm
        đầu ngày kết thúc. Thu / hoàn tính theo sự kiện tiền đã xác nhận, độc
        lập ngày tạo đơn. Giá trị đơn và hàng hoàn tất là nhóm đơn tạo trong kỳ;
        các số này không phải lợi nhuận hoặc tiền chi trả Owner.
      </p></details>

      <div className="shopee-quick-dates" role="group" aria-label="Chọn nhanh kỳ báo cáo">
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} /> Kỳ nhanh:
        </span>
        <button
          type="button"
          className={`shopee-date-btn ${from === today && to === tomorrow ? 'is-active' : ''}`}
          onClick={() => applyQuickRange('today')}
        >
          Hôm nay
        </button>
        <button
          type="button"
          className={`shopee-date-btn ${from === day(new Date(Date.now() - 6 * 86400000)) && to === tomorrow ? 'is-active' : ''}`}
          onClick={() => applyQuickRange('7days')}
        >
          7 ngày qua
        </button>
        <button
          type="button"
          className={`shopee-date-btn ${from === day(new Date(Date.now() - 29 * 86400000)) && to === tomorrow ? 'is-active' : ''}`}
          onClick={() => applyQuickRange('30days')}
        >
          30 ngày qua
        </button>
        <button
          type="button"
          className={`shopee-date-btn ${from === today.slice(0, 7) + '-01' && to === tomorrow ? 'is-active' : ''}`}
          onClick={() => applyQuickRange('this_month')}
        >
          Tháng này
        </button>
      </div>

      <form
        className="market-form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draftValid || reading) return;
          if (!draftChanged) {
            if (!query.isFetching) void reload();
            return;
          }
          setParams((current) => {
            const next = new URLSearchParams(current);
            next.set("from", draftFrom);
            next.set("to", draftTo);
            next.set("granularity", draftUnit);
            if (scope === "ADMIN") {
              draftStore
                ? next.set("store_id", draftStore)
                : next.delete("store_id");
            }
            next.delete("money_page");
            next.delete("gap_page");
            return next;
          });
        }}
      >
        <label>
          Từ ngày (bao gồm)
          <input
            required
            type="date"
            value={draftFrom}
            max={draftTo || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Đến trước ngày (không bao gồm)
          <input
            required
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label>
          Nhóm theo
          <select
            value={draftUnit}
            onChange={(event) => setUnit(event.target.value as "DAY" | "MONTH")}
          >
            <option value="DAY">Ngày</option>
            <option value="MONTH">Tháng</option>
          </select>
        </label>
        {scope === "ADMIN" && (
          <label>
            Mã Store (để trống xem toàn sàn)
            <input
              value={draftStore}
              maxLength={36}
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              onChange={(event) => setStore(event.target.value.trim())}
            />
          </label>
        )}
        <Button type="submit" loading={reading} disabled={!draftValid || (!draftChanged && query.isFetching)}>
          Xem báo cáo
        </Button>
      </form>
      {!valid ? (
        <p role="alert">
          Cần khoảng ngày hợp lệ với ngày bắt đầu trước ngày kết thúc và mã
          Store đúng định dạng.
        </p>
      ) : query.error ? (
        <ErrorView
          error={query.error}
          onRetry={() => void reload()}
          retryBusy={reading}
        />
      ) : query.isPending ? (
        <Loading />
      ) : (
        query.data && (
          <>
            <nav className="order-status-tabs" aria-label="Nội dung báo cáo">{[['summary','Tổng hợp'],['cash','Thu / hoàn theo kỳ'],['entries','Giao dịch'],['gaps','Khoản chưa rõ ngày']].map(([value,label])=><button type="button" key={value} aria-pressed={reportView===value} onClick={()=>setReportView(value)}>{label}</button>)}</nav>
            <div className="report-current-period">
              <p role="status">
                <strong>Kỳ đang xem:</strong> <time dateTime={from}>{from}</time> đến trước <time dateTime={to}>{to}</time> (giờ Việt Nam)
                {scope === "ADMIN" && ` · ${store || "Toàn sàn"}`}
              </p>
              <small>Cập nhật lúc {time(new Date(query.dataUpdatedAt).toISOString())}</small>
            </div>
            <div hidden={reportView!=='summary'}>
              {/* Shopee Uni Settlement Advice */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Sparkles size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.5 }}>
                  <strong>Quy tắc Quyết toán Doanh thu Shopee:</strong> Tiền hàng chỉ chuyển thành <strong>Đã quyết toán (Khả dụng)</strong> sau khi đơn hàng được giao thành công và Người mua không phát sinh khiếu nại/trả hàng. Các đơn đang vận chuyển hoặc mới giao sẽ nằm ở mục <strong>Chờ quyết toán</strong>.
                </div>
              </div>

              {/* Shopee Settlement 4 Cards */}
              <div className="shopee-settlement-grid">
                <div className="shopee-settlement-card is-settled">
                  <div className="shopee-settlement-card-header">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} /> Đã quyết toán (Khả dụng)
                    </span>
                    <span className="shopee-settlement-badge is-settled">✓ Sẵn sàng rút</span>
                  </div>
                  <div className="shopee-settlement-amount" style={{ color: '#166534' }}>
                    {money(query.data.completed_goods_revenue_vnd)}
                  </div>
                  <div className="shopee-settlement-note">
                    Tiền hàng hoàn tất không khiếu nại, có thể rút về tài khoản ngân hàng.
                  </div>
                </div>

                <div className="shopee-settlement-card is-pending">
                  <div className="shopee-settlement-card-header">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} /> Chờ quyết toán
                    </span>
                    <span className="shopee-settlement-badge is-pending">⏳ Đang xử lý</span>
                  </div>
                  <div className="shopee-settlement-amount" style={{ color: '#ea580c' }}>
                    {money(
                      (query.data.order_value_vnd || 0) - (query.data.completed_goods_revenue_vnd || 0) - (query.data.refunded_vnd || 0) > 0
                        ? query.data.order_value_vnd - query.data.completed_goods_revenue_vnd - query.data.refunded_vnd
                        : (query.data.unresolved_collected_vnd || 0)
                    )}
                  </div>
                  <div className="shopee-settlement-note">
                    Đơn hàng đang giao hoặc đang trong hạn xử lý trả hàng / khiếu nại.
                  </div>
                </div>

                <div className="shopee-settlement-card is-refund">
                  <div className="shopee-settlement-card-header">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ArrowDownRight size={16} /> Tiền đã hoàn trả / Hủy
                    </span>
                    <span className="shopee-settlement-badge is-refund">↩ Đã khấu trừ</span>
                  </div>
                  <div className="shopee-settlement-amount" style={{ color: '#dc2626' }}>
                    {money(query.data.refunded_vnd)}
                  </div>
                  <div className="shopee-settlement-note">
                    Các khoản hoàn trả người mua do hủy đơn hoặc khiếu nại thành công.
                  </div>
                </div>

                <div className="shopee-settlement-card is-gmv">
                  <div className="shopee-settlement-card-header">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wallet size={16} /> Tổng phát sinh (GMV)
                    </span>
                    <span className="shopee-settlement-badge is-gmv">★ {query.data.order_count.toLocaleString('vi-VN')} đơn</span>
                  </div>
                  <div className="shopee-settlement-amount" style={{ color: '#0f172a' }}>
                    {money(query.data.order_value_vnd)}
                  </div>
                  <div className="shopee-settlement-note">
                    Tổng giá trị các đơn hàng người mua đặt trong khoảng thời gian này.
                  </div>
                </div>
              </div>
              <div className="market-table-scroll financial-summary-table" role="region" aria-label="Bảng tổng hợp chỉ tiêu tài chính">
                <table>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '45%' }}>Chỉ tiêu trong kỳ</th>
                      <th scope="col" style={{ width: '25%' }}>Phân loại</th>
                      <th scope="col" style={{ width: '30%', textAlign: 'right' }}>Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(countLabels).map(([key, label]) => {
                      const isMoney = key !== 'order_count';
                      const isCollect = key === 'collected_vnd';
                      const isRefund = key === 'refunded_vnd';
                      const isRev = key === 'completed_goods_revenue_vnd' || key === 'order_value_vnd';
                      const category = isRefund ? 'Chi trả / Hoàn tiền' : isCollect ? 'Dòng tiền vào' : isRev ? 'Doanh số bán' : key === 'shipping_fee_vnd' ? 'Vận chuyển' : 'Số lượng';
                      const badgeClass = isRefund ? 'money-kind is-refund' : isCollect ? 'money-kind is-collection' : 'market-badge';
                      return (
                        <tr key={key}>
                          <th scope="row">
                            <strong style={{ display: 'block', fontSize: '13.5px' }}>{label}</strong>
                          </th>
                          <td>
                            <span className={badgeClass}>{category}</span>
                          </td>
                          <td style={{
                            color: isCollect ? '#15803d' : isRefund ? '#b91c1c' : '#0f172a',
                            fontWeight: 700,
                            textAlign: 'right'
                          }}>
                            {!isMoney
                              ? query.data!.order_count.toLocaleString('vi-VN')
                              : (isCollect ? '+ ' : isRefund ? '- ' : '') + money(query.data![key as keyof typeof countLabels])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                <Button
                  variant="secondary"
                  disabled={query.isFetching || reading}
                  onClick={() =>
                    downloadReportCsv({
                      scope:
                        scope === "STORE"
                          ? (context!.store_membership!.store_id ??
                            "Store hiện hành")
                          : store || "Toàn sàn",
                      from,
                      to,
                      summary: Object.fromEntries(
                        Object.entries(countLabels).map(([key, label]) => [
                          label,
                          query.data![key as keyof typeof countLabels],
                        ]),
                      ),
                      rows: query.data!.cash_series,
                    })
                  }
                >
                  <Download size={16} aria-hidden="true" />
                  Xuất tổng hợp CSV
                </Button>
                <p className="form-hint" style={{ margin: 0 }}>
                  Bản xuất CSV gồm tổng hợp và chuỗi thu/hoàn của kỳ đang xem.
                </p>
              </div>
            </div><div hidden={reportView!=='cash'}>{!!query.data.cash_series?.length && (
              <details className="report-chart-disclosure"><summary>Biểu đồ</summary><CashChart rows={query.data.cash_series} /></details>
            )}
            <h2>
              Thu / hoàn theo {granularity === "DAY" ? "ngày" : "tháng"} phát
              sinh
            </h2>
            {query.data.cash_series?.length ? (
              <div
                className="market-table-scroll"
                role="region"
                aria-label="Thu hoàn theo thời gian"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Đầu kỳ nhỏ (giờ Việt Nam)</th>
                      <th>Đã thu</th>
                      <th>Đã hoàn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.cash_series.map((row) => (
                      <tr key={row.bucket_start}>
                        <td>{time(row.bucket_start)}</td>
                        <td>{money(row.collected_vnd)}</td>
                        <td>{money(row.refunded_vnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>
                {query.data.cash_series
                  ? "Không có sự kiện tiền đã xác nhận trong kỳ."
                  : "Bản đọc chưa cung cấp chuỗi sự kiện tiền."}
              </p>
            )}
            </div><div hidden={reportView!=='entries'}><h2>Đường đối chiếu từng khoản tiền</h2>
            <MoneyEntries
              key={scope + from + to + store}
              scope={scope}
              from={period.from}
              to={period.to}
              store={store}
            />
            </div><div hidden={reportView!=='gaps'}><h2>Lịch sử chưa xác định được ngày</h2>
            <p>
              Các khoản bên dưới nằm ngoài kỳ đã chọn, vì chưa có sự kiện tiền
              với timestamp được đối chiếu. Không gán ngày tạo đơn cho ngày thu
              hoặc hoàn.
            </p>
            <p>
              Đã thu chưa rõ ngày:{" "}
              {query.data.unresolved_collected_vnd === undefined
                ? "Chưa có dữ liệu"
                : money(query.data.unresolved_collected_vnd)}{" "}
              · Đã hoàn chưa rõ ngày:{" "}
              {query.data.unresolved_refunded_vnd === undefined
                ? "Chưa có dữ liệu"
                : money(query.data.unresolved_refunded_vnd)}
            </p>
            <button
              aria-expanded={showGaps}
              onClick={() => setShowGaps((value) => !value)}
            >
              {showGaps
                ? "Đóng danh sách khoản chưa rõ ngày"
                : "Xem khoản chưa rõ ngày"}
            </button>
            {showGaps && (
              <UnresolvedEntries
                key={scope + store}
                scope={scope}
                store={store}
              />
            )}
            {query.data.low_stock_variant_ids && (
              <p>
                Biến thể sắp hết hàng: {query.data.low_stock_variant_ids.length}
                . Đây là dữ liệu kho hiện hành, không suy tồn lịch sử từ kỳ báo
                cáo tiền.
              </p>
            )}
            </div>
          </>
        )
      )}
    </section>
  );
}
function orderLink(scope: Scope, id: string) {
  return (
    (scope === "STORE" ? "/seller/orders?" : "/admin?tab=orders&") +
    "q=" +
    encodeURIComponent(id)
  );
}
function useEntryPage(key: "money_page" | "gap_page") {
  const [params, setParams] = useSearchParams(),
    raw = Number(params.get(key)),
    page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
  return {
    page,
    set: (value: number, options?: { replace?: boolean }) =>
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set(key, String(value));
        return next;
      }, options),
  };
}
function MoneyEntries({
  scope,
  from,
  to,
  store,
}: {
  scope: Scope;
  from: string;
  to: string;
  store: string;
}) {
  const paging = useEntryPage("money_page");
  const query = useQuery<OperationOutputs["listStoreMoneyMovements"]>({
    queryKey: ["report-money-entries", scope, from, to, store, paging.page],
    staleTime: 0,
    queryFn: async ({ signal }) =>
      scope === "ADMIN"
        ? callOperation(
            "listAdminMoneyMovements",
            {
              query: {
                from,
                to,
                page: paging.page,
                size: 20,
                ...(store ? { store_id: store } : {}),
              },
            },
            { signal },
          )
        : callOperation(
            "listStoreMoneyMovements",
            { query: { from, to, page: paging.page, size: 20 } },
            { signal },
          ),
  });
  useEffect(() => {
    if (
      query.data &&
      !query.isFetching &&
      !query.error &&
      paging.page > Math.max(1, Math.ceil(query.data.total / query.data.size))
    )
      paging.set(Math.max(1, Math.ceil(query.data.total / query.data.size)), {
        replace: true,
      });
  }, [query.data, query.isFetching, query.error, paging.page]);
  return (
    <section aria-label="Sự kiện tiền đã xác nhận">
      {query.isFetching && query.data && <Loading />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            {!query.data.items.length ? (
              !query.isFetching && (
                <p>Không có sự kiện tiền đã xác nhận trong khoảng này.</p>
              )
            ) : (
              <div className="market-table-scroll financial-money-table" tabIndex={0} role="region" aria-label="Các giao dịch tiền trong kỳ"><table><thead><tr><th>Loại</th><th>Số tiền</th><th>Phát sinh</th><th>Đơn hàng</th><th>Nguồn đối chiếu</th></tr></thead><tbody>
                {query.data.items.map((row) => (
                  <tr key={row.id}>
                    <td><span className={'money-kind '+(row.kind==='COLLECTION'?'is-collection':'is-refund')}>{row.kind === "COLLECTION" ? "Thu" : "Hoàn"}</span></td>
                    <td className="money-cell">{money(row.amount_vnd)}</td>
                    <td><time dateTime={row.occurred_at}>
                      {time(row.occurred_at)}
                    </time>
                    <p>{sources[row.time_source] ?? row.time_source}</p>
                    </td><td>
                    <Link to={orderLink(scope, row.order_id)}>
                      Đối chiếu đơn #{row.order_id.slice(-8).toUpperCase()}
                    </Link>
                    {scope === "ADMIN" && <p>Store: {row.store_id}</p>}
                    </td><td><details>
                      <summary>Nguồn dữ liệu</summary>
                      <p>
                        Nguồn: {row.source_type} · {row.source_id}
                      </p>
                      <p>Payment: {row.payment_id}</p>
                      <p>Journal: {row.id}</p>
                      <p>
                        Hệ thống ghi nhận lúc {time(row.recorded_at)}; mốc này
                        có thể khác thời điểm phát sinh.
                      </p>
                    </details></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
            <Pagination
              page={paging.page}
              size={query.data.size}
              total={query.data.total}
              onPage={paging.set}
            />
          </>
        )
      )}
    </section>
  );
}
function UnresolvedEntries({ scope, store }: { scope: Scope; store: string }) {
  const paging = useEntryPage("gap_page");
  const query = useQuery<OperationOutputs["listStoreUnresolvedMoneyMovements"]>(
    {
      queryKey: ["report-unresolved", scope, store, paging.page],
      staleTime: 0,
      queryFn: async ({ signal }) =>
        scope === "ADMIN"
          ? callOperation(
              "listAdminUnresolvedMoneyMovements",
              {
                query: {
                  page: paging.page,
                  size: 20,
                  ...(store ? { store_id: store } : {}),
                },
              },
              { signal },
            )
          : callOperation(
              "listStoreUnresolvedMoneyMovements",
              { query: { page: paging.page, size: 20 } },
              { signal },
            ),
    },
  );
  useEffect(() => {
    if (
      query.data &&
      !query.isFetching &&
      !query.error &&
      paging.page > Math.max(1, Math.ceil(query.data.total / query.data.size))
    )
      paging.set(Math.max(1, Math.ceil(query.data.total / query.data.size)), {
        replace: true,
      });
  }, [query.data, query.isFetching, query.error, paging.page]);
  return (
    <section aria-label="Khoản lịch sử chưa rõ ngày">
      {query.isFetching && query.data && <Loading />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            {!query.data.items.length ? (
              !query.isFetching && (
                <p>Không có khoản lịch sử thiếu mốc tiền trong phạm vi này.</p>
              )
            ) : (
              <ul className="financial-money-list">
                {query.data.items.map((row) => (
                  <li key={row.payment_id + row.kind}>
                    <strong>
                      {row.kind === "COLLECTION" ? "Thu" : "Hoàn"}{" "}
                      {money(row.amount_vnd)}
                    </strong>{" "}
                    · {row.payment_method}
                    <p>
                      Chưa có mốc tiền được xác minh. Cần đối chiếu nguồn; không
                      cộng khoản này vào kỳ đang xem.
                    </p>
                    <Link to={orderLink(scope, row.order_id)}>
                      Đối chiếu đơn {row.order_id}
                    </Link>
                    <p>Payment: {row.payment_id}</p>
                    {scope === "ADMIN" && <p>Store: {row.store_id}</p>}
                  </li>
                ))}
              </ul>
            )}
            <Pagination
              page={paging.page}
              size={query.data.size}
              total={query.data.total}
              onPage={paging.set}
            />
          </>
        )
      )}
    </section>
  );
}
