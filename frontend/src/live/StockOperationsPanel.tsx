import { FormEvent, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callOperation } from "../api/operations";
import { ApiError } from "../api/client";
import { Loading, ErrorView, Pagination } from "../bootstrap/components";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { useCommand, useStoreAccess } from "./useLiveData";
import { timeLabel } from "./OrderFacts";

export async function readStock(variantId?: string) {
  const rows: OperationOutputs["listStoreInventory"]["items"] = [];
  for (let page = 1; page <= 200; page++) {
    const data = await callOperation("listStoreInventory", {
      query: { page, size: 100 },
    });
    rows.push(...data.items);
    if (variantId && rows.some((r) => r.variant_id === variantId)) return rows;
    if (rows.length >= data.total) return rows;
    if (!data.items.length)
      throw new ApiError(
        503,
        "STOCK_PAGE_INCOMPLETE",
        "Không tải được đủ tồn kho.",
      );
  }
  throw new ApiError(
    503,
    "STOCK_PAGE_INCOMPLETE",
    "Danh sách kho vượt giới hạn tải.",
  );
}

export function StockOperationsPanel({
  name,
}: {
  name: (id: string) => string;
}) {
  const access = useStoreAccess(),
    [tab, setTab] = useState<"LOG" | "REQUEST">("LOG"),
    [page, setPage] = useState(1);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const valid = !!from && !!to && from < to,
    dates = valid
      ? {
          from: new Date(from + "T00:00:00").toISOString(),
          to: new Date(to + "T00:00:00").toISOString(),
        }
      : undefined;
  const summary = useQuery({
    queryKey: ["inventory-summary", dates],
    queryFn: () => callOperation("getInventorySummary", { query: dates! }),
    enabled: valid && tab === "LOG",
  });
  const journal = useQuery({
    queryKey: ["inventory-journal", page, dates],
    queryFn: () =>
      callOperation("listStockMovements", {
        query: { page, size: 20, ...dates },
      }),
    enabled: valid && tab === "LOG",
  });
  return (
    <section className="boot-card mt-6">
      <div role="tablist" aria-label="Vận hành kho">
        <button
          role="tab"
          aria-selected={tab === "LOG"}
          onClick={() => setTab("LOG")}
        >
          Nhập / xuất và log kho
        </button>
        <button
          role="tab"
          aria-selected={tab === "REQUEST"}
          onClick={() => setTab("REQUEST")}
        >
          {access.owner
            ? "Duyệt đề nghị đổi số lượng"
            : "Đề nghị thay đổi số lượng"}
        </button>
      </div>
      {tab === "REQUEST" ? (
        <StockRequests name={name} />
      ) : (
        <>
          <h2>Thống kê và nhật ký kho</h2>
          <div className="market-form-grid">
            <label>
              Kho từ ngày
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Kho đến trước ngày
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          {!valid ? (
            <p role="alert">Ngày kết thúc phải sau ngày bắt đầu.</p>
          ) : (
            <>
              {summary.error ? (
                <ErrorView
                  error={summary.error}
                  onRetry={() => void summary.refetch()}
                />
              ) : !summary.data ? (
                <Loading />
              ) : (
                <div className="market-stats">
                  {[
                    ["Nhập hàng thực tế", summary.data.received_units],
                    ["Điều chỉnh tăng", summary.data.adjusted_in_units],
                    [
                      "Tăng kho chưa phân loại",
                      summary.data.unclassified_in_units,
                    ],
                    ["Xuất cho đơn", summary.data.issued_to_orders_units],
                    ["Hàng hoàn nhập lại", summary.data.returned_units],
                    ["Điều chỉnh giảm", summary.data.adjusted_out_units],
                    ["Số dư đầu / seed", summary.data.opening_units],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              )}
              <p>
                “Xuất cho đơn” gồm hàng đã trừ để xử lý đơn; chưa đồng nghĩa bán
                hoàn tất. Báo cáo bán hoàn tất nằm ở mục Báo cáo. Lọc theo ngày
                nhận trên chứng từ nếu có, ngày ghi sổ do hệ thống lưu riêng.
              </p>
              {journal.error ? (
                <ErrorView
                  error={journal.error}
                  onRetry={() => void journal.refetch()}
                />
              ) : !journal.data ? (
                <Loading />
              ) : (
                <>
                  <div className="market-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Ngày nhận / ghi sổ</th>
                          <th>Sản phẩm</th>
                          <th>Thay đổi</th>
                          <th>Nguồn / chứng từ</th>
                          <th>Lý do / người ghi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journal.data.items.map((m) => (
                          <tr key={m.id}>
                            <td>
                              {m.received_at
                                ? timeLabel(m.received_at)
                                : "Không có ngày nhận riêng"}
                              <small>Ghi sổ: {timeLabel(m.occurred_at)}</small>
                            </td>
                            <td>
                              {name(m.variant_id)}
                              {m.order_id && <p>Đơn: {m.order_id}</p>}
                            </td>
                            <td>
                              {m.delta_quantity > 0 ? "+" : ""}
                              {m.delta_quantity}
                              {m.delta_reserved !== undefined && (
                                <small>
                                  Giữ chỗ: {m.delta_reserved > 0 ? "+" : ""}
                                  {m.delta_reserved}
                                </small>
                              )}
                            </td>
                            <td>
                              {m.supplier_name ?? "—"}
                              <p>{m.source_reference ?? "—"}</p>
                            </td>
                            <td>
                              {m.reason ?? "—"}
                              <small>
                                {m.movement_kind === "RECEIPT"
                                  ? "Nhập hàng"
                                  : m.movement_kind === "CORRECTION"
                                    ? "Kiểm kê / điều chỉnh"
                                    : ""}
                              </small>
                              <small>
                                Ghi nhận:{" "}
                                {m.actor_user_id ?? "Chưa có thông tin"}
                              </small>
                              {m.requested_by &&
                                m.requested_by !== m.actor_user_id && (
                                  <small>Đề nghị: {m.requested_by}</small>
                                )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!journal.data.items.length && (
                    <p>Không có biến động kho trong khoảng này.</p>
                  )}
                  <Pagination
                    page={page}
                    size={journal.data.size}
                    total={journal.data.total}
                    onPage={setPage}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

type StockRequest = OperationOutputs["createStockRequest"];
function StockRequests({ name }: { name: (id: string) => string }) {
  const access = useStoreAccess(),
    cache = useQueryClient(),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<StockRequest>();
  const data = useQuery({
    queryKey: ["stock-requests", page],
    queryFn: () =>
      callOperation("listStockRequests", { query: { page, size: 20 } }),
  });
  const changed = () => {
    setSelected(undefined);
    void data.refetch();
    void cache.invalidateQueries({ queryKey: ["store-inventory"] });
    void cache.invalidateQueries({ queryKey: ["inventory-summary"] });
    void cache.invalidateQueries({ queryKey: ["inventory-journal"] });
  };
  return (
    <section>
      <h3>Đề nghị thay đổi tồn kho</h3>
      <p>Chỉ Owner mới được duyệt. Gửi đề nghị chưa làm thay đổi số hàng.</p>
      {data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : !data.data ? (
        <Loading />
      ) : (
        <>
          <div className="market-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Ngày / lý do</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.items.map((r) => (
                  <tr key={r.id}>
                    <td>{name(r.variant_id)}</td>
                    <td>
                      {r.delta_quantity > 0 ? "+" : ""}
                      {r.delta_quantity}
                    </td>
                    <td>
                      {timeLabel(r.created_at)}
                      <p>{r.reason}</p>
                      <small>
                        {r.supplier_name} · {r.source_reference}
                      </small>
                    </td>
                    <td>
                      {
                        {
                          PENDING: "Chờ Owner duyệt",
                          APPROVED: "Đã duyệt",
                          REJECTED: "Đã từ chối",
                        }[r.status]
                      }
                      {r.decided_at && (
                        <small>
                          {timeLabel(r.decided_at)} · {r.decision_reason}
                        </small>
                      )}
                    </td>
                    <td>
                      {access.owner && r.status === "PENDING" && (
                        <button onClick={() => setSelected(r)}>
                          Xem và quyết định
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.data.items.length && <p>Chưa có đề nghị nào.</p>}
          <Pagination
            page={page}
            size={data.data.size}
            total={data.data.total}
            onPage={setPage}
          />
        </>
      )}
      {selected && (
        <div
          className="market-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Owner duyệt thay đổi kho"
        >
          <section>
            <StockDecision
              request={selected}
              name={name(selected.variant_id)}
              done={changed}
              close={() => setSelected(undefined)}
            />
          </section>
        </div>
      )}
    </section>
  );
}
function StockDecision({
  request,
  name,
  done,
  close,
}: {
  request: StockRequest;
  name: string;
  done: () => void;
  close: () => void;
}) {
  const access = useStoreAccess(),
    command = useCommand(),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [blocked, setBlocked] = useState(false);
  const key = `pbl6_stock_decision_${access.userId}_${access.id}_${request.id}`;
  const [saved, setSaved] = useState<
    OperationInputs["decideStockRequest"]["body"] | undefined
  >(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? "null") ?? undefined;
    } catch {
      return undefined;
    }
  });
  const current = useQuery({
      queryKey: ["approval-stock", request.id],
      queryFn: () => readStock(request.variant_id),
    }),
    balance = current.data?.find((i) => i.variant_id === request.variant_id);
  const decide = (decision: "APPROVE" | "REJECT") =>
    void command.run(async () => {
      if (!balance) return;
      const body = saved ?? {
        decision,
        reason: reason.trim(),
        expected_version: request.version,
        expected_inventory_version: balance.version,
        operation_id: crypto.randomUUID(),
      };
      try {
        sessionStorage.setItem(key, JSON.stringify(body));
      } catch {}
      try {
        await callOperation("decideStockRequest", {
          path: { id: request.id },
          body,
        });
        sessionStorage.removeItem(key);
        done();
      } catch (e) {
        if (
          !(e instanceof ApiError) ||
          e.status === 0 ||
          e.status === 408 ||
          e.status >= 500
        )
          setSaved(body);
        else {
          setBlocked(true);
          setSaved(undefined);
          try {
            sessionStorage.removeItem(key);
          } catch {}
        }
        throw e;
      }
    });
  return (
    <section>
      <h2>Owner xác nhận số lượng</h2>
      <p>{name}</p>
      <p>
        Đề nghị: {request.delta_quantity > 0 ? "+" : ""}
        {request.delta_quantity} · {request.reason}
      </p>
      <p>Người đề nghị: {request.requested_by}</p>
      {current.error ? (
        <ErrorView error={current.error} />
      ) : !current.data ? (
        <Loading />
      ) : balance ? (
        <p>
          Hiện có: {balance.quantity} · Đang giữ: {balance.reserved_quantity} ·
          Sau duyệt: {balance.quantity + request.delta_quantity}
        </p>
      ) : (
        <p role="alert">Không tìm thấy tồn kho tương ứng.</p>
      )}
      <label>
        Lý do quyết định
        <input
          value={reason}
          disabled={command.busy || !!saved || blocked}
          maxLength={200}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={confirmed}
          disabled={command.busy || !!saved || blocked}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Tôi là chủ gian hàng và xác nhận số lượng, chứng từ thực tế.
      </label>
      {command.error != null && <ErrorView error={command.error} />}{" "}
      {blocked && (
        <p>Tải lại đề nghị và tồn kho để kiểm tra trước khi xử lý tiếp.</p>
      )}
      {saved ? (
        <button
          disabled={command.busy || !balance}
          onClick={() => decide(saved.decision)}
        >
          Kiểm tra lại quyết định đã gửi
        </button>
      ) : (
        <>
          <button
            disabled={
              !confirmed ||
              !reason.trim() ||
              !balance ||
              command.busy ||
              blocked
            }
            onClick={() => decide("APPROVE")}
          >
            Duyệt thay đổi số lượng
          </button>
          <button
            disabled={!reason.trim() || !balance || command.busy || blocked}
            onClick={() => decide("REJECT")}
          >
            Từ chối đề nghị
          </button>
        </>
      )}
      <button disabled={command.busy || !!saved} onClick={close}>
        Đóng
      </button>
    </section>
  );
}

export function OrderStock({
  order,
}: {
  order: OperationOutputs["getStoreOrder"];
}) {
  const access = useStoreAccess();
  const data = useQuery({
    queryKey: [
      "order-current-stock",
      order.id,
      order.version,
      order.inventory_state,
    ],
    queryFn: () => readStock(),
    enabled: access.can("inventory.store.read_adjust") && !!order.items?.length,
    staleTime: 0,
  });
  if (!order.items?.length)
    return (
      <section>
        <h3>Số hàng còn khi xử lý đơn</h3>
        <p>Chưa có mục hàng để đối chiếu kho.</p>
      </section>
    );
  return (
    <section className="boot-card">
      <h3>Số hàng còn khi xử lý đơn</h3>
      <p>
        Tồn hiện tại cho các đơn mới, không phải số hàng lúc đặt. Trạng thái kho
        của đơn: {order.inventory_state ?? "Chưa có dữ liệu"}.
      </p>
      {access.can("inventory.store.read_adjust")&&<button type="button" disabled={data.isFetching} onClick={()=>void data.refetch()}>Tải lại tồn hiện tại</button>}
      {!access.can("inventory.store.read_adjust") ? (
        <p>Bạn cần quyền xem kho để đọc tồn hiện tại.</p>
      ) : data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : !data.data ? (
        <Loading />
      ) : (
        <div className="market-table-scroll"><table>
          <thead>
            <tr>
              <th>Phân loại</th>
              <th>Trong đơn</th>
              <th>Tồn hiện tại</th>
              <th>Đang giữ</th>
              <th>Còn bán</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item, index) => {
              const row = data.data.find(
                (r) => r.variant_id === item.variant_id,
              );
              return (
                <tr key={index}>
                  <td>{String(item.sku_snapshot ?? item.variant_id ?? "—")}</td>
                  <td>{String(item.quantity ?? "—")}</td>
                  <td>{row?.quantity ?? "Chưa có dữ liệu"}</td>
                  <td>{row?.reserved_quantity ?? "—"}</td>
                  <td>{row?.available_quantity ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
    </section>
  );
}
