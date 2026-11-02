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
      {scope === "STORE" && <nav className="order-status-tabs" aria-label="Lọc trạng thái đổi trả">{([['','Tất cả'],['REQUESTED','Chờ duyệt'],['APPROVED','Đã duyệt'],['RECEIVED','Đã nhận hàng'],['EXCHANGE_SENT','Đã gửi hàng đổi'],['COMPLETED','Hoàn tất'],['REJECTED','Đã từ chối']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={statusFilter===value} onClick={()=>{setPage(1);setParams(current=>{const next=new URLSearchParams(current);value?next.set('status',value):next.delete('status');return next;});}}>{label}</button>)}</nav>}
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
          {query.data.items.map((request) => (
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
          ))}
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
