import {Link,useLocation,useNavigate,useSearchParams,useParams} from "react-router-dom";
import { ReturnActions } from "./ReturnActions";
import {useCustomerReturnShipping} from '../shipping/ReturnShipping';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { canInspectReturn, customerReturnUrl, ReturnRequestView, returnStatus, type ReturnRequest } from "./ReturnRequestView";
import { useAdminParties } from "../admin/AdminParties";
import { AdminReturnContext } from "./AdminReturnContext";
import { CustomerSubNav } from "../customer/CustomerSubNav";
import type {OperationInputs, OperationOutputs} from '../../api/operations.generated';
type Scope = "CUSTOMER" | "STORE" | "ADMIN";
type ReturnListView = {
  key: string;
  search: string;
  requestId: string;
  keyboard: boolean;
  windowY: number;
  tableTop: number;
  tableLeft: number;
};

function ConfirmExchangeButton({request,busy,onConfirm}:{request:ReturnRequest;busy:boolean;onConfirm:()=>void}){
  const shipping=useCustomerReturnShipping(request,true);
  const delivered=shipping.data?.items.some(item=>item.return_request_id===request.id&&item.leg==='EXCHANGE_OUTBOUND'&&item.status==='DELIVERED');
  if(['GHN','PLATFORM'].includes(request.shipping_mode??'')&&!delivered)return null;
  return <button disabled={busy} onClick={onConfirm}>Đã nhận hàng</button>;
}

function CustomerReturnsTable({ requests }: { requests: ReturnRequest[] }) {
  if (!requests.length) return null;
  return (
    <div className="market-table-scroll customer-returns-list">
      <table aria-label="Danh sách yêu cầu đổi trả">
        <thead>
          <tr>
            <th scope="col">Yêu cầu</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <th scope="row">
                {request.type === "EXCHANGE" ? "Đổi hàng" : "Trả hàng"}
                <small>Đơn #{request.order_id.slice(-8).toUpperCase()}</small>
                <small>{request.amount_vnd.toLocaleString("vi-VN")} ₫ · <time dateTime={request.created_at}>
                  {new Date(request.created_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                </time></small>
              </th>
              <td>
                <span className="market-badge">{returnStatus[request.status] ?? request.status}</span>
                {request.conversion_status === "PROPOSED" && <small>Chờ bạn phản hồi</small>}
              </td>
              <td>
                <Link to={customerReturnUrl(request)} aria-label={`Xem chi tiết đơn ${request.order_id.slice(-8).toUpperCase()}`}>
                  Xem chi tiết
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReturnsPage({ scope }: { scope: Scope }) {
  const { session } = useAuth(),
    cache = useQueryClient(),
    [localPage, setLocalPage] = useState(1),
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
  const [polling, setPolling] = useState(scope !== "ADMIN");
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [params,setParams]=useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const listView = useRef<ReturnListView | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const tableScroll = useRef<HTMLDivElement>(null);
  const backLink = useRef<HTMLAnchorElement>(null);
  const origin = location.state?.returnList as ReturnListView | undefined;
  const urlPage = Number(params.get("page"));
  const page = (scope === "STORE" || scope === "ADMIN")
    ? Number.isSafeInteger(urlPage) && urlPage > 0 ? urlPage : 1
    : localPage;
  function setPage(nextPage: number) {
    if (scope !== "STORE" && scope !== "ADMIN") return setLocalPage(nextPage);
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage > 1) next.set("page", String(nextPage));
      else next.delete("page");
      return next;
    });
  }
  const { id: routeReturnId } = useParams();
  const returnIdFromUrl = routeReturnId ?? params.get("return_id");
  const customerOrderId = scope === "CUSTOMER" ? (params.get("order_id") ?? null) : null;
  const storeReturnId = scope === "STORE" ? returnIdFromUrl : null;
  const storeOrderId = storeReturnId ? params.get("order_id") : null;
  const adminSearch = scope === "ADMIN" ? (params.get("q") ?? "").trim().toLowerCase() : "";
  const adminOrderId = scope === "ADMIN" ? params.get("order_id") : null;
  const statuses=['REQUESTED','APPROVED','REJECTED','RECEIVED','EXCHANGE_SENT','COMPLETED'] as const;
  const statusFilter:NonNullable<OperationInputs['listStoreReturnRequests']['query']['status']>|''=(scope==='STORE'||scope==='ADMIN')?statuses.find(status=>status===params.get('status'))??'':'';
  useEffect(() => {
    setSelectedReturnId(null);
  }, [statusFilter, adminSearch, adminOrderId, page]);
  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => setPolling(false), 60000);
    return () => clearTimeout(timer);
  }, [polling]);
  const query = useQuery<OperationOutputs["listOwnReturnRequests"]>({
    refetchInterval: (q) =>
      scope !== "ADMIN" &&
      polling &&
      q.state.data?.items.some(
        (row) =>
          row.status === "RECEIVED" ||
          (row.status === "APPROVED" && row.conversion_status === "PROPOSED"),
      )
        ? 3000
        : false,
    queryKey: storeReturnId
      ? ["return-requests", "STORE", "detail", member?.store_id, storeReturnId, storeOrderId]
      : ["return-requests", scope, customerOrderId ? 1 : page, statusFilter, customerOrderId, adminSearch, adminOrderId],
    enabled: allowed,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (storeReturnId) {
        for (let lookupPage = 1; ; lookupPage++) {
          const result = await callOperation("listStoreReturnRequests", {
            query: { page: lookupPage, size: 20, ...(storeOrderId ? { order_id: storeOrderId } : {}) },
          }, { signal });
          const request = result.items.find((row) => row.id === storeReturnId);
          if (request || !result.items.length || lookupPage * result.size >= result.total) {
            return { ...result, items: request ? [request] : [] };
          }
        }
      }
      if (scope === "CUSTOMER")
        return callOperation("listOwnReturnRequests", {
          query: customerOrderId ? { order_id: customerOrderId, page: 1, size: 20 } : { page, size: 20 },
        }, { signal });
      if (scope === "STORE")
        return callOperation("listStoreReturnRequests", {
          query: { page, size: 20, ...(statusFilter ? { status: statusFilter } : {}) },
        }, { signal });
      if (scope === "ADMIN") {
        if (statusFilter || adminSearch || adminOrderId) {
          let allItems: OperationOutputs["listAdminReturnRequests"]["items"] = [];
          for (let lookupPage = 1; ; lookupPage++) {
            const result = await callOperation("listAdminReturnRequests", { query: { page: lookupPage, size: 50, ...(adminOrderId ? { order_id: adminOrderId } : {}) } }, { signal });
            allItems.push(...result.items);
            if (lookupPage * result.size >= result.total || result.items.length === 0) break;
          }

          let storeNameById = new Map<string, string>();
          let userTextById = new Map<string, string>();
          if (adminSearch) {
            const uniqueStoreIds = [...new Set(allItems.map((r) => r.admin_context?.store_id).filter((id): id is string => !!id))];
            const uniqueUserIds = [...new Set(allItems.map((r) => r.admin_context?.customer_user_id).filter((id): id is string => !!id))];

            const storePromises: Promise<any>[] = [];
            for (let i = 0; i < uniqueStoreIds.length; i += 100) {
              const chunk = uniqueStoreIds.slice(i, i + 100);
              storePromises.push(
                callOperation("listStores", { query: { page: 1, size: 100, ids: chunk.join(",") } }, { signal }).catch(() => ({ items: [] }))
              );
            }
            const userPromises: Promise<any>[] = [];
            for (let i = 0; i < uniqueUserIds.length; i += 100) {
              const chunk = uniqueUserIds.slice(i, i + 100);
              userPromises.push(
                callOperation("listUsers", { query: { page: 1, size: 100, ids: chunk.join(",") } }, { signal }).catch(() => ({ items: [] }))
              );
            }

            const [storeResults, userResults] = await Promise.all([
              Promise.all(storePromises),
              Promise.all(userPromises),
            ]);

            for (const res of storeResults) {
              for (const s of (res?.items ?? [])) {
                if (s.id && s.name) storeNameById.set(s.id, s.name);
              }
            }
            for (const res of userResults) {
              for (const u of (res?.items ?? [])) {
                if (u.id) {
                  const text = [u.email, u.display_name].filter(Boolean).join(" ");
                  userTextById.set(u.id, text);
                }
              }
            }
          }

          const normalize = (str: string) =>
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

          const queryClean = adminSearch.toLowerCase().trim();
          const queryWithoutHash = queryClean.replace(/^#/, "").trim();
          const queryNorm = normalize(queryClean);
          const queryNormWithoutHash = normalize(queryWithoutHash);

          const filtered = allItems.filter((r) => {
            if (adminOrderId && r.order_id !== adminOrderId) return false;
            if (statusFilter && r.status !== statusFilter) return false;
            if (adminSearch) {
              const rId = r.id.toLowerCase();
              const rIdShort = r.id.slice(0, 8).toLowerCase();
              const rIdEnd = r.id.slice(-8).toLowerCase();
              const orderId = r.order_id.toLowerCase();
              const orderIdShort = r.order_id.slice(-8).toLowerCase();

              const matchesId =
                rId.includes(queryWithoutHash) ||
                ("#" + rId).includes(queryClean) ||
                rIdShort.includes(queryWithoutHash) ||
                ("#" + rIdShort).includes(queryClean) ||
                rIdEnd.includes(queryWithoutHash) ||
                ("#" + rIdEnd).includes(queryClean);

              const matchesOrder =
                orderId.includes(queryWithoutHash) ||
                ("#" + orderId).includes(queryClean) ||
                orderIdShort.includes(queryWithoutHash) ||
                ("#" + orderIdShort).includes(queryClean);

              const storeId = (r.admin_context?.store_id ?? "").toLowerCase();
              const storeName = storeNameById.get(r.admin_context?.store_id ?? "") ?? "";
              const matchesStore =
                (storeId && (storeId.includes(queryWithoutHash) || storeId.includes(queryClean))) ||
                (storeName && (
                  storeName.toLowerCase().includes(queryClean) ||
                  storeName.toLowerCase().includes(queryWithoutHash) ||
                  normalize(storeName).includes(queryNorm) ||
                  normalize(storeName).includes(queryNormWithoutHash)
                ));

              const customerId = (r.admin_context?.customer_user_id ?? "").toLowerCase();
              const userText = userTextById.get(r.admin_context?.customer_user_id ?? "") ?? "";
              const matchesCustomer =
                (customerId && (customerId.includes(queryWithoutHash) || customerId.includes(queryClean))) ||
                (userText && (
                  userText.toLowerCase().includes(queryClean) ||
                  userText.toLowerCase().includes(queryWithoutHash) ||
                  normalize(userText).includes(queryNorm) ||
                  normalize(userText).includes(queryNormWithoutHash)
                ));

              if (!matchesId && !matchesOrder && !matchesStore && !matchesCustomer) return false;
            }
            return true;
          });
          const pageSize = 20;
          const startIndex = (page - 1) * pageSize;
          return {
            items: filtered.slice(startIndex, startIndex + pageSize),
            total: filtered.length,
            page,
            size: pageSize,
          };
        }
        return callOperation("listAdminReturnRequests", { query: { page, size: 20 } }, { signal });
      }
      return { items: [], total: 0, page: 1, size: 20 };
    },
  });
  const waiting = useQuery({
    queryKey: ['return-requests', 'STORE', 'waiting-count'],
    enabled: allowed && scope === 'STORE' && !storeReturnId,
    queryFn: () => callOperation('listStoreReturnRequests', {query: {page: 1, size: 1, status: 'REQUESTED'}}),
  });
  useLayoutEffect(() => {
    if (scope !== "STORE" || !storeReturnId || !origin) return;
    listView.current = origin;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (origin.keyboard) backLink.current?.focus({ preventScroll: true });
  }, [scope, storeReturnId, origin]);
  useLayoutEffect(() => {
    if (scope !== "STORE" || storeReturnId) return;
    const saved = listView.current;
    if (!saved || saved.key !== location.key || (!query.data && !query.error)) return;
    const frame = requestAnimationFrame(() => {
      listView.current = null;
      tableScroll.current?.scrollTo({ top: saved.tableTop, left: saved.tableLeft, behavior: "instant" });
      window.scrollTo({ top: saved.windowY, behavior: "instant" });
      if (saved.keyboard) {
        const opener = document.getElementById(`open-return-${saved.requestId}`);
        if (opener) opener.focus({ preventScroll: true });
        else listHeading.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [scope, storeReturnId, location.key, query.data, query.error]);
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
  if (scope === "STORE" && returnIdFromUrl) {
    const activeRequest = query.error ? undefined : query.data?.items.find((r) => r.id === returnIdFromUrl);
    return (
      <section className="seller-return-detail-page">
        <div style={{ margin: "14px 0 16px" }}>
          <Link
            ref={backLink}
            to={{ pathname: "/seller/returns", search: origin?.search ?? "" }}
            onClick={(event) => {
              if (!origin || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              navigate(-1);
            }}
            className="audit-sub-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 600,
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #94a3b8",
              borderRadius: 8,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            ← Quay lại danh sách đổi trả
          </Link>
          <button
            type="button"
            className="audit-sub-btn"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            style={{
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: 600,
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #94a3b8",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Làm mới
          </button>
        </div>

        {query.isLoading && <Loading />}
        {query.error && <ErrorView error={query.error} onRetry={() => void query.refetch()} />}
        {activeRequest ? (
          <div
            id="seller-return-detail-card"
            className="seller-return-detail-section"
            style={{
              border: "1px solid #fed7aa",
              borderRadius: 12,
              background: "#ffffff",
              padding: 24,
              boxShadow: "0 4px 14px rgba(234, 88, 12, 0.07)",
            }}
          >
            {!canInspectReturn(activeRequest, scope) && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #fed7aa", paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#c2410c" }}>
                  Hồ sơ chi tiết & Xử lý yêu cầu
                </span>
                <h1 style={{ margin: "6px 0 4px", fontSize: "20px", color: "#0f172a" }}>
                  {activeRequest.type === "EXCHANGE" ? "Đổi hàng" : "Hoàn tiền"} #{activeRequest.id.slice(-8).toUpperCase()}
                </h1>
                <small style={{ color: "#64748b" }}>Đơn hàng #{activeRequest.order_id.slice(-8).toUpperCase()}</small>
              </div>
            </div>}
            <ReturnRequestView
              key={activeRequest.id}
              request={activeRequest}
              scope={scope}
              detail
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
        ) : (
          query.isSuccess && <Empty>Không tìm thấy thông tin yêu cầu đổi trả này.</Empty>
        )}
        {!polling && (
          <p>Đã dừng tự làm mới sau 60 giây. Bấm Làm mới để kiểm tra.</p>
        )}
      </section>
    );
  }

  const customerDetail =
    scope === "CUSTOMER" &&
    (!!returnIdFromUrl ||
      (!!customerOrderId && (query.data?.items?.length ?? 0) === 1));
  const activeCustomerRequest = customerDetail
    ? (returnIdFromUrl
        ? query.data?.items.find((request) => request.id === returnIdFromUrl)
        : query.data?.items?.[0])
    : undefined;

  return (
    <section>
      {scope === "CUSTOMER" && <CustomerSubNav />}
      {customerDetail && <Link to="/customer/returns">← Quay lại danh sách đổi trả</Link>}
      <h1 ref={listHeading} tabIndex={-1}>
        {customerDetail ? "Chi tiết yêu cầu đổi trả" : scope === "CUSTOMER"
          ? "Yêu cầu đổi trả của tôi"
          : "Quản lý yêu cầu đổi trả"}
      </h1>
      <div className="seller-refresh-bar"><button type="button" disabled={query.isFetching || waiting.isFetching} onClick={() => { if(scope!=='ADMIN') setPolling(true); void query.refetch(); if(scope==='STORE')void waiting.refetch(); }}>Làm mới</button></div>
      {scope === 'STORE' && <p role="status">Chờ xét duyệt: {waiting.isLoading ? 'đang tải' : waiting.error ? 'không tải được' : waiting.data?.total ?? '—'}</p>}
      {scope === "ADMIN" && (
        <form
          className="admin-return-search-form"
          style={{ display: "flex", gap: "8px", margin: "10px 0" }}
          onSubmit={(e) => {
            e.preventDefault();
            const val = ((e.currentTarget.elements.namedItem("q") as HTMLInputElement)?.value ?? "").trim();
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.delete("page");
              val ? next.set("q", val) : next.delete("q");
              return next;
            });
          }}
        >
          <input
            ref={searchInputRef}
            key={params.get("q") ?? ""}
            name="q"
            type="search"
            placeholder="Tìm theo mã yêu cầu, mã đơn hàng, gian hàng..."
            defaultValue={params.get("q") ?? ""}
            style={{ maxWidth: "360px", padding: "6px 12px", fontSize: "13px" }}
          />
          <button type="submit" className="ui-button ui-button-secondary" style={{ padding: "6px 14px", fontSize: "13px" }}>
            Tìm kiếm
          </button>
          {params.get("q") && (
            <button
              type="button"
              className="ui-button ui-button-secondary"
              style={{ padding: "6px 10px", fontSize: "13px" }}
              onClick={() => {
                if (searchInputRef.current) searchInputRef.current.value = "";
                setParams((current) => {
                  const next = new URLSearchParams(current);
                  next.delete("q");
                  next.delete("page");
                  return next;
                });
              }}
            >
              Xóa tìm kiếm
            </button>
          )}
        </form>
      )}
      {scope === "ADMIN" && adminOrderId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "8px 14px",
            borderRadius: 8,
            margin: "10px 0",
            fontSize: "13px",
            color: "#1e3a8a",
          }}
        >
          <span>
            Đang lọc theo đơn hàng <strong>#{adminOrderId.slice(-8).toUpperCase()}</strong>
          </span>
          <button
            type="button"
            className="ui-button ui-button-secondary"
            style={{ padding: "4px 10px", fontSize: "12px", background: "#ffffff" }}
            onClick={() => {
              setParams((current) => {
                const next = new URLSearchParams(current);
                next.delete("order_id");
                next.delete("page");
                return next;
              });
            }}
          >
            Xem tất cả đổi trả
          </button>
        </div>
      )}
      {(scope === "STORE" || scope === "ADMIN") && <nav className="order-status-tabs" aria-label="Lọc trạng thái đổi trả">{([['','Tất cả'],['REQUESTED','Chờ duyệt'],['APPROVED','Đã duyệt'],['RECEIVED','Đã nhận hàng'],['EXCHANGE_SENT','Hàng đổi đã gửi'],['COMPLETED','Hoàn tất'],['REJECTED','Đã từ chối']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={statusFilter===value} onClick={()=>{setParams(current=>{const next=new URLSearchParams(current);next.delete('page');value?next.set('status',value):next.delete('status');return next;});}}>{label}</button>)}</nav>}
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
          {customerDetail && !activeCustomerRequest && <Empty>Không tìm thấy yêu cầu đổi trả này.</Empty>}
          {!customerDetail && !query.data.items.length && (
            <Empty>
              {scope === "CUSTOMER" ? (
                <>
                  <p>Bạn chưa có yêu cầu đổi trả.</p>
                  <Link className="ui-button ui-button-secondary" to="/customer/orders?status=COMPLETED">
                    Xem đơn đã hoàn tất
                  </Link>
                </>
              ) : scope === "ADMIN" && (statusFilter || adminSearch || adminOrderId) ? "Không có yêu cầu đổi trả nào phù hợp với bộ lọc." : "Chưa có yêu cầu đổi trả ở trang này."}
            </Empty>
          )}
          {scope === "STORE" && query.data.items.length > 0 && (
            <div ref={tableScroll} className="market-table-scroll seller-returns-summary-table" style={{ margin: "14px 0 20px" }}>
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
                    const activeAdminRequest =
                      (selectedReturnId ? query.data!.items.find((x) => x.id === selectedReturnId) : undefined) ??
                      (params.get("return_id") ? query.data!.items.find((x) => x.id === params.get("return_id")) : undefined) ??
                      query.data!.items[0];
                    const isSelected = r.id === activeAdminRequest?.id;
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
                          <strong style={{ color: "#0f172a" }}>#{r.id.slice(-8).toUpperCase()}</strong>
                          <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>
                            {new Date(r.created_at).toLocaleDateString("vi-VN")}
                          </small>
                        </td>
                        <td>
                          <code style={{ fontSize: "12px", color: "#334155" }} title={r.order_id}>#{r.order_id.slice(-8).toUpperCase()}</code>
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
                          <Link
                            id={`open-return-${r.id}`}
                            to={`/seller/returns?${new URLSearchParams({ return_id: r.id, order_id: r.order_id })}`}
                            onClick={(event) => {
                              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                              event.preventDefault();
                              const returnList: ReturnListView = {
                                key: location.key,
                                search: location.search,
                                requestId: r.id,
                                keyboard: event.detail === 0,
                                windowY: window.scrollY,
                                tableTop: tableScroll.current?.scrollTop ?? 0,
                                tableLeft: tableScroll.current?.scrollLeft ?? 0,
                              };
                              navigate(event.currentTarget.pathname + event.currentTarget.search, { state: { returnList } });
                            }}
                            className="audit-sub-btn"
                            style={{
                              padding: "5px 14px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: "#ffffff",
                              color: "#0f172a",
                              border: "1px solid #94a3b8",
                              textDecoration: "none",
                              display: "inline-block",
                            }}
                          >
                            🔍 Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {scope === "ADMIN" && query.data.items.length > 0 && (
            <div className="market-table-scroll admin-returns-summary-table" style={{ margin: "14px 0 20px" }}>
              <table role="table" aria-label="Bảng tóm tắt yêu cầu đổi trả hệ thống">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Mã đơn hàng</th>
                    <th>Gian hàng</th>
                    <th>Khách mua</th>
                    <th>Loại</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((r) => {
                    const activeId =
                      selectedReturnId ??
                      (adminOrderId ? query.data!.items.find((x) => x.order_id === adminOrderId)?.id : undefined) ??
                      params.get("return_id") ??
                      query.data!.items[0]?.id;
                    const isSelected = r.id === activeId;
                    const labelMap: Record<string, string> = {
                      REQUESTED: "Chờ duyệt",
                      APPROVED: "Đã duyệt",
                      REJECTED: "Đã từ chối",
                      RECEIVED: "Đã nhận hàng",
                      EXCHANGE_SENT: "Hàng đổi đã gửi",
                      COMPLETED: "Hoàn tất",
                    };
                    const storeName = (r.admin_context?.store_id && parties.stores.get(r.admin_context.store_id)?.name) || r.admin_context?.store_id || "—";
                    const buyerEmail = (r.admin_context?.customer_user_id && parties.users.get(r.admin_context.customer_user_id)?.email) || r.admin_context?.customer_user_id || "—";
                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: isSelected ? "#fff7ed" : undefined,
                        }}
                      >
                        <td>
                          <strong style={{ color: "#0f172a" }}>#{r.id.slice(-8).toUpperCase()}</strong>
                          <small style={{ display: "block", color: "#64748b", fontSize: "11px" }}>
                            {new Date(r.created_at).toLocaleDateString("vi-VN")}
                          </small>
                        </td>
                        <td>
                          <code style={{ fontSize: "12px", color: "#334155" }} title={r.order_id}>
                            #{r.order_id.slice(-8).toUpperCase()}
                          </code>
                        </td>
                        <td>
                          <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 500 }}>{storeName}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: "12.5px", color: "#475569" }}>{buyerEmail}</span>
                        </td>
                        <td>
                          <span className={`market-badge ${r.type === "EXCHANGE" ? "is-info" : "is-warning"}`}>
                            {r.type === "EXCHANGE" ? "Đổi hàng" : "Hoàn tiền"}
                          </span>
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
                            onClick={() => setSelectedReturnId(r.id)}
                            style={{
                              padding: "5px 14px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: 6,
                              cursor: "pointer",
                              background: isSelected ? "#ea580c" : "#ffffff",
                              color: isSelected ? "#ffffff" : "#0f172a",
                              border: isSelected ? "1px solid #ea580c" : "1px solid #94a3b8",
                            }}
                          >
                            {isSelected ? "Đang xem" : "Xem hồ sơ"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {scope === "STORE" ? null : scope === "CUSTOMER" && !customerDetail ? (
            <CustomerReturnsTable requests={query.data.items} />
          ) : scope === "ADMIN" ? (
            (() => {
              const request =
                (selectedReturnId ? query.data.items.find((x) => x.id === selectedReturnId) : undefined) ??
                (adminOrderId ? query.data.items.find((x) => x.order_id === adminOrderId) : undefined) ??
                (params.get("return_id") ? query.data.items.find((x) => x.id === params.get("return_id")) : undefined) ??
                query.data.items[0];
              if (!request) return null;
              return (
                <div
                  key={request.id}
                  className="admin-return-detail-card"
                  style={{
                    border: "1px solid #fed7aa",
                    borderRadius: 12,
                    background: "#ffffff",
                    padding: 20,
                    marginBottom: 20,
                    boxShadow: "0 4px 14px rgba(234, 88, 12, 0.07)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #fed7aa", paddingBottom: 12, marginBottom: 16 }}>
                    <div>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#c2410c" }}>
                        Hồ sơ đổi trả đang xử lý
                      </span>
                      <h2 style={{ margin: "4px 0 2px", fontSize: "18px", color: "#0f172a" }}>
                        {request.type === "EXCHANGE" ? "Đổi hàng" : "Hoàn tiền"} · Đơn #{request.order_id.slice(-8).toUpperCase()}
                      </h2>
                      <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                        Gian hàng: <strong>{(request.admin_context?.store_id && parties.stores.get(request.admin_context.store_id)?.name) || request.admin_context?.store_id || "—"}</strong> · Khách: {(request.admin_context?.customer_user_id && parties.users.get(request.admin_context.customer_user_id)?.email) || request.admin_context?.customer_user_id || "—"} · Số tiền: <strong style={{ color: "#b91c1c" }}>{request.amount_vnd.toLocaleString("vi-VN")} ₫</strong>
                      </p>
                    </div>
                    <span className="market-badge" style={{ fontSize: "13px" }}>
                      {returnStatus[request.status] ?? request.status}
                    </span>
                  </div>
                  <ReturnRequestView
                    request={request}
                    scope={scope}
                    showOrderLink={false}
                    context={
                      <AdminReturnContext request={request} parties={parties} />
                    }
                  >
                    {((!!request.admin_context &&
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
                </div>
              );
            })()
          ) : (
            (customerDetail ? (activeCustomerRequest ? [activeCustomerRequest] : []) : query.data.items).map((request) => (
              <ReturnRequestView
                key={request.id}
                request={request}
                scope={scope}
                showOrderLink={true}
              >
                {request.type === "EXCHANGE" &&
                  request.status === "EXCHANGE_SENT" && (
                    <ConfirmExchangeButton request={request} busy={!!busy} onConfirm={() => void confirm(request)} />
                  )}
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
              </ReturnRequestView>
            ))
          )}
          {!customerDetail && <Pagination
            page={page}
            size={query.data.size}
            total={query.data.total}
            onPage={setPage}
          />}
        </>
      )}
      {!polling && (
        <p>Đã dừng tự làm mới sau 60 giây. Bấm Làm mới để kiểm tra.</p>
      )}
    </section>
  );
}
