import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ErrorView, Loading } from "../../bootstrap/components";
import { Alert } from "../../components/ui/Alert";

const today = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  return parts.year + "-" + parts.month + "-" + parts.day;
};
const validDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
export function inventoryPeriod(from: string | null, to: string | null) {
  if (!from || !to || !validDay(from) || !validDay(to)) return;
  const a = Date.parse(from + "T00:00:00+07:00"),
    b = Date.parse(to + "T00:00:00+07:00") + 86400000;
  if (a >= b || b - a > 366 * 86400000) return;
  return { from: new Date(a).toISOString(), to: new Date(b).toISOString() };
}
const clock = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const issueLabels: Record<string, string> = {
  NO_TRUSTED_HISTORY: "Chưa có mốc lịch sử đủ căn cứ",
  LEGACY_PERIOD: "Kỳ chọn bắt đầu trước mốc ghi bút toán đã xác định",
  VERSION_GAP: "Thiếu hoặc trùng bước phiên bản kho",
  CHECKPOINT_MISMATCH:
    "Mốc số lượng chưa nối khớp với lịch sử hoặc số hiện tại",
  TIME_ORDER_UNCERTAIN: "Thứ tự thời gian ghi chưa được xác nhận",
  HISTORY_LIMIT: "Lịch sử vượt giới hạn đối chiếu trực tuyến",
};
export function InventoryReconciliation({ variantId }: { variantId?: string }) {
  const [params, setParams] = useSearchParams(),
    day = today(),
    from = params.get("stock_from") ?? day.slice(0, 7) + "-01",
    to = params.get("stock_to") ?? day;
  const [fromDraft, setFromDraft] = useState(from),
    [toDraft, setToDraft] = useState(to),
    [validation, setValidation] = useState("");
  useEffect(() => {
    setFromDraft(from);
    setToDraft(to);
    setValidation("");
  }, [from, to]);
  const period = inventoryPeriod(from, to);
  const sourceParams = new URLSearchParams(params);
  sourceParams.set("stock_from", from);
  sourceParams.set("stock_to", to);
  sourceParams.delete("history_page");
  const query = useQuery({
    queryKey: ["inventory-reconciliation", variantId, period],
    enabled: !!variantId && !!period,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      callOperation(
        "getInventoryReconciliation",
        { query: { variant_id: variantId!, ...period! } },
        { signal },
      ),
  });
  return (
    <section
      id="stock-reconciliation"
      className="boot-card mt-4"
      aria-label="Đối chiếu kho theo kỳ"
    >
      <h2>Đối chiếu tồn thương mại theo kỳ</h2>
      <p>
        Tồn thương mại và lượng giữ được đối chiếu riêng. Hủy khi mới giữ khác
        với hoàn kho sau khi đã trừ. Không dùng số này làm số đếm vật lý.
      </p>
      {!variantId ? (
        <p>Trong bảng tồn, mở Thêm → Đối chiếu kỳ ở phân loại cần kiểm tra.</p>
      ) : (
        <>
          <form
            className="stock-period-filter"
            onSubmit={(event) => {
              event.preventDefault();
              if (!inventoryPeriod(fromDraft, toDraft)) {
                setValidation(
                  "Chọn ngày hợp lệ, từ ngày không sau đến ngày, tối đa 366 ngày.",
                );
                return;
              }
              setValidation("");
              setParams((current) => {
                const next = new URLSearchParams(current);
                next.set("stock_from", fromDraft);
                next.set("stock_to", toDraft);
                next.set("view", "reconciliation");
                next.delete("history_page");
                return next;
              });
            }}
          >
            <label>
              Từ ngày (giờ Việt Nam)
              <input
                type="date"
                required
                value={fromDraft}
                onChange={(event) => setFromDraft(event.target.value)}
              />
            </label>
            <label>
              Đến hết ngày (giờ Việt Nam)
              <input
                type="date"
                required
                value={toDraft}
                onChange={(event) => setToDraft(event.target.value)}
              />
            </label>
            <button type="submit">Đối chiếu</button>
          </form>
          {(validation || !period) && (
            <p role="alert">
              {validation ||
                "Kỳ trên liên kết không hợp lệ. Chọn lại kỳ không quá 366 ngày."}
            </p>
          )}
          {period &&
            (query.error ? (
              <ErrorView
                error={query.error}
                onRetry={() => void query.refetch()}
              />
            ) : query.isPending ? (
              <Loading />
            ) : (
              query.data && (
                <>
                  <h3>
                    {query.data.product_title ?? "Phân loại chưa có tên"} ·{" "}
                    {Object.values(query.data.variant_values ?? {}).join(" / ")}
                    {query.data.sku && <> · SKU: {query.data.sku}</>}
                  </h3>
                  {query.data.product_id&&<p className="inventory-item-links"><Link to={'/products/'+query.data.product_id}>Xem sản phẩm</Link><Link to={'/seller/inventory?variant_id='+variantId}>Xem tồn hiện tại</Link></p>}
                  <p>
                    Ảnh đọc lúc {clock(query.data.as_of)} (giờ Việt Nam). Tính
                    từ thời điểm hệ thống ghi bút toán; không thay thời gian cũ
                    bằng thời gian giả.{" "}
                    {query.data.period_open &&
                      "Kỳ chưa kết thúc; số liệu chỉ đến thời điểm đọc."}
                  </p>

                  {query.data.coverage === "COMPLETE" &&
                  query.data.opening &&
                  query.data.closing ? (
                    <>
                      <p role="status">
                        Đã nối khớp các mốc phiên bản và biến động trong kỳ.
                      </p>

                      {/* Visual Balance Sheet — 3-column grid */}
                      <div className="stock-balance-grid" role="region" aria-label="Bảng cân đối tồn kho">
                        {/* Opening column */}
                        <div className="stock-balance-col is-opening">
                          <div className="stock-balance-col-header">Đầu kỳ</div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Tồn thương mại</span>
                            <span className="stock-balance-value">{query.data.opening.quantity.toLocaleString("vi-VN")}</span>
                          </div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Đang giữ</span>
                            <span className="stock-balance-value">{query.data.opening.reserved_quantity.toLocaleString("vi-VN")}</span>
                          </div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Có thể bán</span>
                            <span className="stock-balance-value">{query.data.opening.available_quantity.toLocaleString("vi-VN")}</span>
                          </div>
                        </div>

                        {/* Changes column */}
                        <div className="stock-balance-col is-change">
                          <div className="stock-balance-col-header">Biến động trong kỳ</div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Tồn thương mại</span>
                            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                              <span className="stock-balance-value is-in">+{query.data.totals.quantity_in.toLocaleString("vi-VN")}</span>
                              <span className="stock-balance-value is-out">-{query.data.totals.quantity_out.toLocaleString("vi-VN")}</span>
                            </span>
                          </div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Đang giữ</span>
                            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                              <span className="stock-balance-value is-in">+{query.data.totals.reserved_in.toLocaleString("vi-VN")}</span>
                              <span className="stock-balance-value is-out">-{query.data.totals.reserved_out.toLocaleString("vi-VN")}</span>
                            </span>
                          </div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Có thể bán</span>
                            <span className="stock-balance-value" style={{ color: "#64748b", fontSize: 13 }}>Tồn thương mại − đang giữ</span>
                          </div>
                        </div>

                        {/* Closing column */}
                        <div className="stock-balance-col is-closing">
                          <div className="stock-balance-col-header">Cuối kỳ</div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Tồn thương mại</span>
                            <span className="stock-balance-value">{query.data.closing.quantity.toLocaleString("vi-VN")}</span>
                          </div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Đang giữ</span>
                            <span className="stock-balance-value">{query.data.closing.reserved_quantity.toLocaleString("vi-VN")}</span>
                          </div>
                          <div className="stock-balance-row">
                            <span className="stock-balance-label">Có thể bán</span>
                            <span className="stock-balance-value">{query.data.closing.available_quantity.toLocaleString("vi-VN")}</span>
                          </div>
                        </div>
                      </div>

                      {/* Current snapshot footer */}
                      <div className="stock-balance-footer">
                        <dl className="stock-balance-footer-metric">
                          <dt>Tồn thương mại hiện tại</dt>
                          <dd>{query.data.current.quantity.toLocaleString("vi-VN")}</dd>
                        </dl>
                        <dl className="stock-balance-footer-metric">
                          <dt>Đang giữ hiện tại</dt>
                          <dd>{query.data.current.reserved_quantity.toLocaleString("vi-VN")}</dd>
                        </dl>
                        <dl className="stock-balance-footer-metric">
                          <dt>Có thể bán hiện tại</dt>
                          <dd>{query.data.current.available_quantity.toLocaleString("vi-VN")}</dd>
                        </dl>
                      </div>
                      <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                        Đây là ảnh đọc của kho; trạng thái đơn phía dưới được đọc riêng.
                      </p>

                      {/* Tóm tắt kỳ */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                        <span className="market-badge">
                          Bút toán có mốc ghi: {query.data.totals.movement_count.toLocaleString("vi-VN")}
                        </span>
                        <span className="market-badge is-warning">
                          Bút toán lịch sử chưa có mốc: {query.data.totals.undated_count.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div role="status">
                      <Alert level="warning">
                        Chưa đủ căn cứ chốt tồn đầu/cuối kỳ. Không suy lịch sử
                        từ số hiện tại.
                      </Alert>
                      <ul>
                        {query.data.issues.map((issue) => (
                          <li key={issue}>{issueLabels[issue]}</li>
                        ))}
                      </ul>
                      {query.data.coverage_from && (
                        <p>
                          Có mốc ghi bút toán từ{" "}
                          {clock(query.data.coverage_from)}; có thể chọn kỳ sau
                          mốc này để đối chiếu.
                        </p>
                      )}
                    </div>
                  )}

                  <Link
                    to={{
                      pathname: "/seller/inventory",
                      search:
                        "?" +
                        new URLSearchParams({
                          ...Object.fromEntries(sourceParams),
                          view: "history",
                        }).toString(),
                      hash: "#stock-history",
                    }}
                  >
                    Xem bút toán nguồn
                  </Link>
                  <button
                    type="button"
                    disabled={query.isFetching}
                    onClick={() => void query.refetch()}
                  >
                    Làm mới
                  </button>
                </>
              )
            ))}
        </>
      )}
    </section>
  );
}
