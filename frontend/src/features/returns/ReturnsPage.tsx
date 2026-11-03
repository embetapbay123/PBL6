import {Link,useSearchParams} from "react-router-dom";
import { ReturnActions } from "./ReturnActions";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../api/auth-context";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { ReturnRequestView, type ReturnRequest } from "./ReturnRequestView";
import { useAdminParties } from "../admin/AdminParties";
import { AdminReturnContext } from "./AdminReturnContext";
import { CustomerSubNav } from "../customer/CustomerSubNav";
import type {OperationInputs} from '../../api/operations.generated';
type Scope = "CUSTOMER" | "STORE" | "ADMIN";
export function ReturnsPage({ scope }: { scope: Scope }) {
  const { session } = useAuth(),
    cache = useQueryClient(),
    [page, setPage] = useState(1),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState("");
  const member = session?.context?.store_membership;
  const allowed =
    scope === "CUSTOMER"
      ? !!session?.context?.roles.includes("CUSTOMER")
      : scope === "ADMIN"
        ? !!session?.context?.role_permissions?.includes("platform.admin")
        : !!member &&
          (member.role === "OWNER" ||
            !!member.permissions?.includes("order.store.read_status_cancel"));
  const [polling, setPolling] = useState(true);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [params,setParams]=useSearchParams();
  const statuses=['REQUESTED','APPROVED','REJECTED','RECEIVED','EXCHANGE_SENT','COMPLETED'] as const;
  const statusFilter:NonNullable<OperationInputs['listStoreReturnRequests']['query']['status']>|''=scope==='STORE'?statuses.find(status=>status===params.get('status'))??'':'';
  useEffect(()=>{setPage(1)},[statusFilter]);
  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => setPolling(false), 60000);
    return () => clearTimeout(timer);
  }, [polling]);
  const query = useQuery({
    refetchInterval: (q) =>
      polling &&
      q.state.data?.items.some(
        (row) =>
          row.status === "RECEIVED" ||
          (row.status === "APPROVED" && row.conversion_status === "PROPOSED"),
      )
        ? 3000
        : false,
    queryKey: ["return-requests", scope, page, statusFilter],
    enabled: allowed,
    refetchOnWindowFocus: false,
    queryFn: () =>
      scope === "CUSTOMER"
        ? callOperation("listOwnReturnRequests", { query: { page, size: 20 } })
        : scope === "STORE"
          ? callOperation("listStoreReturnRequests", {
              query: { page, size: 20, ...(statusFilter?{status:statusFilter}:{}) },
            })
          : callOperation("listAdminReturnRequests", {
              query: { page, size: 20 },
            }),
  });
  const waiting = useQuery({
    queryKey: ['return-requests', 'STORE', 'waiting-count'],
    enabled: allowed && scope === 'STORE',
    queryFn: () => callOperation('listStoreReturnRequests', {query: {page: 1, size: 1, status: 'REQUESTED'}}),
  });
  const parties = useAdminParties(
    query.data?.items.map((r) => r.admin_context?.store_id) ?? [],
    query.data?.items.map((r) => r.admin_context?.customer_user_id) ?? [],
    scope === "ADMIN" && allowed && !query.error,
  );
  async function confirm(request: ReturnRequest) {
    if (busy) return;
    setBusy(request.id);
    setError(undefined);
    try {
      await callOperation("confirmExchangeReceived", {
        path: { id: request.id },
        body: { expected_version: request.version },
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["return-requests"] }),
        cache.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 409) await query.refetch();
    } finally {
      setBusy("");
    }
  }
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(403, "FORBIDDEN", "Bạn chưa có quyền xử lý đổi trả.")
        }
      />
    );
  return (
    <section>
      {scope === "CUSTOMER" && <CustomerSubNav />}
      <h1>
        {scope === "CUSTOMER"
          ? "Yêu cầu đổi trả của tôi"
          : "Quản lý yêu cầu đổi trả"}
      </h1>
      <div className="seller-refresh-bar"><button type="button" disabled={query.isFetching || waiting.isFetching} onClick={() => { setPolling(true); void query.refetch(); if(scope==='STORE')void waiting.refetch(); }}>Làm mới yêu cầu</button></div>
      {scope === 'STORE' && <p role="status">Chờ xét duyệt: {waiting.isLoading ? 'đang tải' : waiting.error ? 'không tải được' : waiting.data?.total ?? '—'}</p>}
      {scope === "STORE" && <nav className="order-status-tabs" aria-label="Lọc trạng thái đổi trả">{([['','Tất cả'],['REQUESTED','Chờ duyệt'],['APPROVED','Đã duyệt'],['RECEIVED','Đã nhận hàng'],['EXCHANGE_SENT','Hàng đổi đã gửi'],['COMPLETED','Hoàn tất'],['REJECTED','Đã từ chối']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={statusFilter===value} onClick={()=>{setPage(1);setParams(current=>{const next=new URLSearchParams(current);value?next.set('status',value):next.delete('status');return next;});}}>{label}</button>)}</nav>}
      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {error !== undefined && <ErrorView error={error} />}
      {scope === "ADMIN" && parties.error && (
        <ErrorView
          error={parties.error}
          onRetry={() => void parties.refetch()}
        />
      )}
      {query.data && !query.error && (
        <>
          {!query.data.items.length && (
            <Empty>
              Chưa có yêu cầu đổi trả ở trang này.
              {scope === "CUSTOMER" && (
                <>
                  {" "}
                  Mở đơn đã hoàn tất để chọn món cần hỗ trợ.{" "}
                  <Link to="/customer/orders?status=COMPLETED">
                    Xem đơn đã hoàn tất
                  </Link>
                </>
              )}
            </Empty>
          )}
          {scope === "STORE" && query.data.items.length > 0 && (
            <div className="market-table-scroll seller-returns-summary-table" style={{ margin: "14px 0 20px" }}>
              <table role="table" aria-label="Bảng tóm tắt yêu cầu đổi trả">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Mã đơn hàng</th>
                    <th>Loại</th>
                    <th>Lý do</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((r) => {
                    const activeId = selectedReturnId ?? params.get("return_id") ?? query.data!.items[0]?.id;
                    const isSelected = r.id === activeId;
                    const labelMap: Record<string, string> = {
                      REQUESTED: "Chờ duyệt",
                      APPROVED: "Đã duyệt",
                      REJECTED: "Đã từ chối",
                      RECEIVED: "Đã nhận hàng",
                      EXCHANGE_SENT: "Hàng đổi đã gửi",
                      COMPLETED: "Hoàn tất",
                    };
                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: isSelected ? "#fff7ed" : undefined,
                        }}
                      >
                        <td>
                          <strong style={{ color: "#0f172a" }}>#{r.id.slice(0, 8)}</strong>
                          <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>
                            {new Date(r.created_at).toLocaleDateString("vi-VN")}
                          </small>
                        </td>
                        <td>
                          <code style={{ fontSize: "12px", color: "#334155" }}>{r.order_id.slice(0, 8)}…</code>
                        </td>
                        <td>
                          <span className={`market-badge ${r.type === "EXCHANGE" ? "is-info" : "is-warning"}`}>
                            {r.type === "EXCHANGE" ? "Đổi hàng" : "Hoàn tiền"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: "#0f172a" }}>{r.reason}</span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <strong style={{ color: "#0f172a" }}>{r.amount_vnd.toLocaleString("vi-VN")} ₫</strong>
                        </td>
                        <td>
                          <span className="market-badge">
                            {labelMap[r.status] ?? r.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="audit-sub-btn"
                            style={{
                              padding: "4px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: isSelected ? "#ea580c" : "#ffffff",
                              color: isSelected ? "#ffffff" : "#0f172a",
                              border: isSelected ? "1px solid #ea580c" : "1px solid #94a3b8",
                            }}
                            onClick={() => {
                              setSelectedReturnId(r.id);
                              const el = document.getElementById("seller-return-detail-card");
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                          >
                            {isSelected ? "✓ Đang xem" : "🔍 Xem chi tiết"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {scope === "STORE" ? (
            (() => {
              const activeId = selectedReturnId ?? params.get("return_id") ?? query.data.items[0]?.id;
              const activeRequest = query.data.items.find((r) => r.id === activeId) ?? query.data.items[0];
              if (!activeRequest) return null;
              return (
                <div
                  id="seller-return-detail-card"
                  className="seller-return-detail-section"
                  style={{
                    border: "1px solid #fed7aa",
                    borderRadius: 12,
                    background: "#ffffff",
                    padding: 20,
                    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.07)",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #fed7aa", paddingBottom: 12, marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#c2410c" }}>
                        Hồ sơ chi tiết & Xử lý yêu cầu
                      </span>
                      <h2 style={{ margin: "4px 0 2px", fontSize: "18px", color: "#0f172a" }}>
                        {activeRequest.type === "EXCHANGE" ? "Đổi hàng" : "Hoàn tiền"} #{activeRequest.id}
                      </h2>
                      <small style={{ color: "#64748b" }}>Đơn hàng liên quan: <code>{activeRequest.order_id}</code></small>
                    </div>
                  </div>
                  <ReturnRequestView
                    key={activeRequest.id}
                    request={activeRequest}
                    scope={scope}
                    showOrderLink={false}
                  >
                    <ReturnActions
                      key={activeRequest.id}
                      request={activeRequest}
                      scope={scope}
                      refresh={async () => {
                        await cache.invalidateQueries(
                          { queryKey: ["return-requests"] },
                          { throwOnError: true },
                        );
                      }}
                    />
                  </ReturnRequestView>
                </div>
              );
            })()
          ) : (
            query.data.items.map((request) => (
              <ReturnRequestView
                key={request.id}
                request={request}
                scope={scope}
                showOrderLink={scope === "CUSTOMER"}
                context={
                  scope === "ADMIN" ? (
                    <AdminReturnContext request={request} parties={parties} />
                  ) : undefined
                }
              >
                {scope === "CUSTOMER" &&
                  request.type === "EXCHANGE" &&
                  request.status === "EXCHANGE_SENT" && (
                    <button
                      disabled={!!busy}
                      onClick={() => void confirm(request)}
                    >
                      Xác nhận đã nhận hàng đổi
                    </button>
                  )}
                {(scope !== "ADMIN" ||
                  (!!request.admin_context &&
                    parties.stores.has(request.admin_context.store_id) &&
                    parties.users.has(request.admin_context.customer_user_id) &&
                    !parties.isFetching)) && (
                  <ReturnActions
                    key={request.id}
                    request={request}
                    scope={scope}
                    refresh={async () => {
                      await cache.invalidateQueries(
                        { queryKey: ["return-requests"] },
                        { throwOnError: true },
                      );
                    }}
                  />
                )}
              </ReturnRequestView>
            ))
          )}
          <Pagination
            page={page}
            size={query.data.size}
            total={query.data.total}
            onPage={setPage}
          />
        </>
      )}
      {polling && (
        <p className="form-hint">
          Yêu cầu đang chờ xử lý được tự cập nhật trong tối đa 60 giây. Có thể
          dùng Làm mới yêu cầu để kiểm tra tiếp.
        </p>
      )}
      {!polling && (
        <p>Đã dừng tự làm mới sau 60 giây; có thể đọc lại thủ công.</p>
      )}
    </section>
  );
}
