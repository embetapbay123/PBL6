import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ErrorView, Loading } from "../../bootstrap/components";

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
        <p>Chọn “Đối chiếu kỳ” ở phân loại cần kiểm tra.</p>
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
            <button type="submit">Đối chiếu kỳ đã chọn</button>
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
                      <p>
                        Cuộn ngang bảng để xem đủ cột Tăng, Giảm và Cuối kỳ.
                      </p>
                      <div
                        className="market-table-scroll"
                        role="region"
                        aria-label="Số đầu và cuối kỳ"
                        tabIndex={0}
                      >
                        <table>
                          <thead>
                            <tr>
                              <th>Đại lượng</th>
                              <th>Đầu kỳ</th>
                              <th>Tăng</th>
                              <th>Giảm</th>
                              <th>Cuối kỳ</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th>Tồn thương mại</th>
                              <td>{query.data.opening.quantity}</td>
                              <td>{query.data.totals.quantity_in}</td>
                              <td>{query.data.totals.quantity_out}</td>
                              <td>{query.data.closing.quantity}</td>
                            </tr>
                            <tr>
                              <th>Đang giữ</th>
                              <td>{query.data.opening.reserved_quantity}</td>
                              <td>{query.data.totals.reserved_in}</td>
                              <td>{query.data.totals.reserved_out}</td>
                              <td>{query.data.closing.reserved_quantity}</td>
                            </tr>
                            <tr>
                              <th>Có thể bán</th>
                              <td>{query.data.opening.available_quantity}</td>
                              <td colSpan={2}>Tồn thương mại − đang giữ</td>
                              <td>{query.data.closing.available_quantity}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div role="status">
                      <p>
                        Chưa đủ căn cứ chốt tồn đầu/cuối kỳ. Không suy lịch sử
                        từ số hiện tại.
                      </p>
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
                  <p>
                    Bút toán có thời điểm ghi xác định trong kỳ:{" "}
                    {query.data.totals.movement_count}. Bút toán lịch sử chưa có
                    thời điểm ghi xác định: {query.data.totals.undated_count}.
                  </p>
                  <p>
                    Hiện tại: tồn thương mại {query.data.current.quantity}; đang
                    giữ {query.data.current.reserved_quantity}; có thể bán{" "}
                    {query.data.current.available_quantity}. Đây là ảnh đọc của
                    kho; trạng thái đơn phía dưới được đọc riêng.
                  </p>
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
                    Làm mới đối chiếu kỳ
                  </button>
                </>
              )
            ))}
        </>
      )}
    </section>
  );
}
