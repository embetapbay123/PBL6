import { Button as UiButton } from "../components/ui/Button";
import { useUnsavedChanges } from "../components/useUnsavedChanges";
import { AddressSuggestions } from "../components/AddressSuggestions";
import { variantLabel } from "../components/variant-identity";
import { useCurrentOrderImages } from "../components/useCurrentOrderImages";
import { ProductImage } from "../components/ProductImage";
import { SortHeader } from '../components/SortHeader';
import { FinancialReport } from "../features/reports/FinancialReport";
import {
  InventoryReconciliation,
  inventoryPeriod,
} from "../features/seller/InventoryReconciliation";
import { StockCommitments } from "../features/seller/StockCommitments";
import { AuditActor, useAuditActorLabels } from "../features/admin/AuditActors";
import { OrderQueue } from "../components/OrderQueue";
import {
  OrderListFilters,
  OrderStatusTabs,
  useOrderListFilters,
  paymentMethodLabel,
  paymentStatusLabel,
  refundStatusLabel,
} from "../components/OrderListTools";
import {
  OrderPackingSheet,
  OrderNextStep,
  OrderTimeline,
  orderStatusLabel,
} from "../components/OrderPresentation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, ShoppingBag, Boxes, Store, ArrowRight, Pencil } from "lucide-react";
import { callOperation } from "../api/operations";
import { ApiError, isUncertainMutation } from "../api/client";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { ErrorView, Loading, Pagination } from "../bootstrap/components";
import { formatMoney, useCommand, useStoreAccess } from "./useLiveData";
import { Modal } from "../components/Modal";
import {
  StoreSetupGuide,
  StoreWorkGuide,
} from "../features/seller/StoreWorkGuide";

/** Route navigation is owned by the Seller shell; pages render only their task content. */
export function SellerSubNav() {
  return null;
}

export function SellerOverview() {
  const access = useStoreAccess();
  const store = useQuery({
    queryKey: ["own-store"],
    queryFn: () => callOperation("getOwnStore"),
  });
  const productCount = useQuery({
    queryKey: ["seller-overview", "products"],
    enabled: access.can("product.store.read_write"),
    queryFn: () =>
      callOperation("listOwnStoreProducts", { query: { page: 1, size: 1 } }),
  });
  const inventoryCount = useQuery({
    queryKey: ["seller-overview", "inventory"],
    enabled: access.can("inventory.store.read_adjust"),
    queryFn: () =>
      callOperation("listStoreInventory", { query: { page: 1, size: 1 } }),
  });
  const orderCount = useQuery({
    queryKey: ["seller-overview", "orders"],
    enabled: access.can("order.store.read_status_cancel"),
    queryFn: () =>
      callOperation("listStoreOrders", { query: { page: 1, size: 1 } }),
  });
  const pendingOrders = useQuery({queryKey:['seller-overview','pending-orders'],enabled:access.can('order.store.read_status_cancel'),queryFn:()=>callOperation('listStoreOrders',{query:{page:1,size:1,status:'PENDING'}})});
  const pendingReturns = useQuery({queryKey:['seller-overview','pending-returns'],enabled:access.can('order.store.read_status_cancel'),queryFn:()=>callOperation('listStoreReturnRequests',{query:{page:1,size:1,status:'REQUESTED'}})});
  const counts: Record<
    string,
    { data?: { total: number }; error: unknown; isPending: boolean }
  > = {
    "/seller/products": productCount,
    "/seller/inventory": inventoryCount,
    "/seller/orders": orderCount,
  };
  return (
    <section className="seller-overview">
      <SellerSubNav />
      <div className="seller-overview-header">
        <div>
          <h1>{store.data?.name ?? "Gian hàng của bạn"}</h1>
          <p>Trung tâm điều hành và tổng quan hoạt động gian hàng</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {access.can("product.store.read_write") && (
            <Link
              className="ui-button ui-button-primary"
              to="/seller/products?create=1"
            >
              + Thêm sản phẩm
            </Link>
          )}
          {access.id && (
            <Link
              className="ui-button ui-button-secondary"
              to={"/stores/" + access.id}
            >
              Xem gian hàng
            </Link>
          )}
        </div>
      </div>
      {store.error && <ErrorView error={store.error} />}
      {store.isPending && <Loading />}
      {store.data && !store.error && (
        <>
          {(!store.data.return_address || !['recipient_name','phone','line1','ward','district','city'].every(key=>String(store.data.return_address?.[key as keyof typeof store.data.return_address] ?? '').trim()))&&<div className="seller-alert-card" role="status" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}><span>⚠️ Địa chỉ nhận trả chưa đầy đủ. Chủ Store cần hoàn thiện trước khi nhận đơn mới.</span>{access.owner&&<Link to="/seller/settings" style={{ color: '#b91c1c', textDecoration: 'underline' }}>Bổ sung ngay →</Link>}</div>}
          {access.can('order.store.read_status_cancel')&&<div className="seller-work-alerts"><Link to="/seller/orders?status=PENDING"><span>Đơn chờ xác nhận:</span> <span className="seller-alert-badge">{pendingOrders.error?'Chưa tải được':pendingOrders.data?.total??'Đang tải…'}</span></Link><Link to="/seller/returns?status=REQUESTED"><span>Yêu cầu đổi trả chờ duyệt:</span> <span className="seller-alert-badge">{pendingReturns.error?'Chưa tải được':pendingReturns.data?.total??'Đang tải…'}</span></Link></div>}
          <div className="market-stats">
            {[
              ["/seller/products", "Sản phẩm", ShoppingBag],
              ["/seller/inventory", "Tồn kho", Boxes],
              ["/seller/orders", "Đơn hàng", Package],
            ]
              .filter(([href]) =>
                href === "/seller/inventory"
                  ? access.can("inventory.store.read_adjust")
                  : href === "/seller/orders"
                    ? access.can("order.store.read_status_cancel")
                    : access.can("product.store.read_write"),
              )
              .map(([href, label, Icon]) => {
                const Symbol = Icon as typeof Store;
                return (
                  <Link className="seller-overview-tile" key={String(href)} to={String(href)}>
                    <div className="seller-tile-top">
                      <h3>{String(label)}</h3>
                      <div className="seller-tile-icon"><Symbol size={22} /></div>
                    </div>
                    <p className="overview-count">
                      {counts[String(href)].error
                        ? "Chưa tải được"
                        : counts[String(href)].isPending
                          ? "Đang tải…"
                          : (counts[String(href)].data?.total.toLocaleString(
                              "vi-VN",
                            ) ?? "Chưa có dữ liệu")}
                      {String(href) === "/seller/inventory" && " phân loại"}
                    </p>
                    <span>Mở quản lý <ArrowRight size={13} className="inline" /></span>
                  </Link>
                );
              })}
          </div>
          <div className="seller-operating-info">
            <h2>Thông tin vận hành</h2>
            <p>
              Trạng thái:{" "}
              <span className={'seller-status '+(store.data.status==='ACTIVE'?'is-active':'is-inactive')}>{store.data.status==='ACTIVE'?'Đang hoạt động':store.data.status==='LOCKED'?'Đã khóa':store.data.status}</span>
            </p>
            <p>
              Phí giao hàng:{" "}
              <strong>{store.data.shipping_fee_vnd !== undefined
                ? formatMoney(store.data.shipping_fee_vnd)
                : "Chưa được cung cấp"}</strong>
            </p>
            {access.owner && (
              <Link to="/seller/settings" className="ui-button ui-button-secondary" style={{ padding: '6px 12px', fontSize: '12.5px', textDecoration: 'none' }}>Cập nhật gian hàng</Link>
            )}
          </div>
          <div className="seller-overview-guides"><details className="seller-guide"><summary>Thiết lập & điều kiện nhận đơn</summary><StoreSetupGuide store={store.data} /></details>
          <details className="seller-guide"><summary>Quyền & hướng dẫn công việc</summary><StoreWorkGuide /></details></div>
        </>
      )}
    </section>
  );
}

export function StoreSettings() {
  const access = useStoreAccess();
  const command = useCommand();
  const [round, setRound] = useState(0);
  const state = useQuery({
    queryKey: ["own-store"],
    queryFn: () => callOperation("getOwnStore"),
    enabled: access.owner,
  });
  const reload = async () => {
    if (command.busy || state.isFetching) return;
    const result = await state.refetch();
    if (result.isSuccess) {
      command.setError(undefined);
      command.setNotice(
        "Đã đọc lại thông tin gian hàng. Kiểm tra trước khi sửa tiếp.",
      );
      setRound((n) => n + 1);
    }
  };
  if (!access.owner)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Chỉ chủ gian hàng được sửa thông tin Store.",
          )
        }
      />
    );
  return (
    <section>
      <SellerSubNav />
      <h1>Thông tin gian hàng</h1>
      {state.error ? (
        <ErrorView
          error={state.error}
          onRetry={() => void reload()}
          retryBusy={state.isFetching}
        />
      ) : !state.data ? (
        <Loading />
      ) : (
        <StoreSettingsForm
          key={state.data.id + ":" + state.data.version + ":" + round}
          store={state.data}
          command={command}
          reading={state.isFetching}
          reload={() => void reload()}
        />
      )}
    </section>
  );
}
function StoreSettingsForm({
  store,
  command,
  reading,
  reload,
}: {
  store: OperationOutputs["getOwnStore"];
  command: ReturnType<typeof useCommand>;
  reading: boolean;
  reload: () => void;
}) {
  const cache = useQueryClient();
  const [editing, setEditing] = useState<'all'|'name'|'shipping'|'address'|'logo'|null>(null);
  const [name, setName] = useState(store.name),
    [shipping, setShipping] = useState(store.shipping_fee_vnd ?? 0),
    [logoUrl,setLogoUrl] = useState(store.logo_url ?? '');
  const [returnAddress, setReturnAddress] = useState(
    store.return_address ?? {
      recipient_name: "",
      phone: "",
      line1: "",
      ward: "",
      district: "",
      city: "",
    },
  );
  const dirty =
    name !== store.name ||
    shipping !== (store.shipping_fee_vnd ?? 0) ||
    logoUrl !== (store.logo_url ?? '') ||
    JSON.stringify(returnAddress) !==
      JSON.stringify(
        store.return_address ?? {
          recipient_name: "",
          phone: "",
          line1: "",
          ward: "",
          district: "",
          city: "",
        },
      );
  useUnsavedChanges(!!editing && (dirty || command.busy));
  const [stale, setStale] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (store.version === undefined || command.busy || stale || reading) return;
    void command.run(async () => {
      try {
        const updated = await callOperation("updateOwnStore", {
          body: {
            ...(editing==='all'||editing==='name'?{name}:{}),
            ...(editing==='all'||editing==='shipping'?{shipping_fee_vnd:shipping}:{}),
            ...(editing==='logo'?{logo_url:logoUrl.trim()}:{}),
            ...(editing==='all'||editing==='address'?{return_address: returnAddress}:{}),
            expected_version: store.version!,
          },
        });
        cache.setQueriesData<OperationOutputs["getOwnStore"]>(
          { queryKey: ["own-store"] },
          (previous) =>
            previous?.id === updated.id
              ? { ...previous, ...updated, logo_url: updated.logo_url }
              : previous,
        );
        void cache.invalidateQueries({ queryKey: ["own-store"] });
        command.setNotice("Đã cập nhật gian hàng.");
      } catch (e) {
        if (
          (e instanceof ApiError && e.status === 409) ||
          isUncertainMutation(e)
        )
          setStale(true);
        throw e;
      }
    });
  };
  if (!editing)
    return (
      <section
        className="boot-card store-settings-form"
        aria-label="Thông tin gian hàng hiện tại"
      >
        <div className="seller-store-identity">{store.logo_url ? <span className="seller-store-avatar"><ProductImage src={store.logo_url} name={store.name} alt={'Ảnh đại diện '+store.name}/></span> : <span className="seller-store-avatar" aria-hidden="true">{store.name.trim().charAt(0).toLocaleUpperCase('vi-VN') || 'S'}</span>}<div><strong>{store.name}</strong><p>Gian hàng của bạn</p><UiButton variant="ghost" size="sm" onClick={()=>setEditing('logo')}>Sửa ảnh đại diện</UiButton></div></div>
        <dl className="read-only-fields">
          <div>
            <dt>Tên gian hàng</dt>
            <dd>{store.name}</dd>
            <UiButton variant="ghost" size="sm" onClick={()=>setEditing('name')}>Sửa tên gian hàng</UiButton>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd><span className={'seller-status '+(store.status==='ACTIVE'?'is-active':'is-inactive')}>{store.status === "ACTIVE" ? "Đang hoạt động" : store.status==='LOCKED'?"Đã khóa":store.status}</span></dd>
          </div>
          <div>
            <dt>Phí giao hàng</dt>
            <dd>{store.shipping_fee_vnd===undefined?'Chưa có dữ liệu':formatMoney(store.shipping_fee_vnd)}</dd>
            <UiButton variant="ghost" size="sm" onClick={()=>setEditing('shipping')}>Sửa phí giao hàng</UiButton>
          </div>
          <div>
            <dt>Địa chỉ nhận hàng trả</dt>
            <dd>
              {store.return_address ? (
                <>
                  <strong>
                    {store.return_address.recipient_name} ·{" "}
                    {store.return_address.phone}
                  </strong>
                  <br />
                  {[
                    store.return_address.line1,
                    store.return_address.ward,
                    store.return_address.district,
                    store.return_address.city,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </>
              ) : (
                "Chưa hoàn thiện. Cần bổ sung trước khi nhận đơn mới."
              )}
            </dd>
            <UiButton variant="ghost" size="sm" onClick={()=>setEditing('address')}>Sửa địa chỉ nhận trả</UiButton>
          </div>
        </dl>
        <UiButton variant="secondary" type="button" onClick={() => setEditing('all')}><Pencil size={15} aria-hidden="true" /> Chỉnh sửa gian hàng</UiButton>
        {command.notice && <p role="status">{command.notice}</p>}
      </section>
    );
  return (
    <form className="boot-card store-settings-form" onSubmit={submit}>
      <h2>{editing==='name'?'Sửa tên gian hàng':editing==='shipping'?'Sửa phí giao hàng':editing==='address'?'Sửa địa chỉ nhận hàng trả':editing==='logo'?'Sửa ảnh đại diện':'Chỉnh sửa gian hàng'}</h2>
      {editing==='logo' && <label>Đường dẫn ảnh đại diện<input autoFocus type="url" maxLength={2048} placeholder="https://..." value={logoUrl} disabled={command.busy || stale || reading} onChange={event=>setLogoUrl(event.target.value)} /><small>Nhập đường dẫn ảnh HTTP(S); để trống để gỡ ảnh.</small></label>}
      {(editing==='all'||editing==='name')&&
      <label>
        Tên gian hàng
        <input
          autoFocus
          required
          disabled={command.busy || stale || reading}
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      }
      {(editing==='all'||editing==='shipping')&&
      <label>
        Phí giao hàng (VND)
        <input
          autoFocus={editing === 'shipping'}
          required
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          step={1}
          type="number"
          disabled={command.busy || stale || reading}
          value={shipping}
          onChange={(e) => setShipping(Number(e.target.value))}
        />
      </label>
      }
      {(editing==='all'||editing==='address')&&
      <fieldset disabled={command.busy || stale || reading}>
        <legend>Địa chỉ nhận hàng trả</legend>
        <p>
          Cần hoàn thiện trước khi nhận đơn mới. Thay đổi địa chỉ này không thay
          snapshot đơn đang mở.
        </p>
        {Object.entries({
          recipient_name: "Người nhận hàng trả",
          phone: "Điện thoại nhận trả",
          line1: "Địa chỉ nhận trả",
          district: "Quận / huyện nhận trả",
        }).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required
              autoComplete={key === 'recipient_name' ? 'name' : key === 'phone' ? 'tel' : key === 'line1' ? 'street-address' : 'address-level2'}
              maxLength={key === "line1" ? 500 : key === "phone" ? 30 : 200}
              value={returnAddress[key as keyof typeof returnAddress]}
              onChange={(e) =>
                setReturnAddress({ ...returnAddress, [key]: e.target.value })
              }
            />
          </label>
        ))}
        <AddressSuggestions
          city={returnAddress.city}
          ward={returnAddress.ward}
          onCity={(city) =>
            setReturnAddress((current) => ({ ...current, city }))
          }
          onWard={(ward) =>
            setReturnAddress((current) => ({ ...current, ward }))
          }
        />
      </fieldset>
      }
      <div className="ui-actions">
        <button
          disabled={
            command.busy || stale || reading || store.version === undefined
          }
        >
          Lưu thông tin
        </button>
        <UiButton
          type="button"
          variant="secondary"
          disabled={command.busy || stale || reading}
          onClick={() => {
            setName(store.name);
            setShipping(store.shipping_fee_vnd ?? 0);
            setLogoUrl(store.logo_url ?? '');
            setReturnAddress(
              store.return_address ?? {
                recipient_name: "",
                phone: "",
                line1: "",
                ward: "",
                district: "",
                city: "",
              },
            );
            setEditing(null);
          }}
        >
          Hủy thay đổi
        </UiButton>
      </div>
      {command.error != null && (
        <ErrorView
          error={command.error}
          onRetry={reload}
          retryBusy={command.busy || reading}
        />
      )}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      {stale && (
        <p>
          Dữ liệu hoặc kết quả đã thay đổi. Thử lại chỉ đọc thông tin gian hàng;
          kiểm tra kết quả trước khi gửi một thay đổi mới.
        </p>
      )}
    </form>
  );
}

export function StoreInventory() {
  const cache = useQueryClient();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const view =
    params.get("view") ??
    (location.hash === "#stock-history"
      ? "history"
      : location.hash === "#stock-reconciliation"
        ? "reconciliation"
        : params.has("history_page")
          ? "history"
          : "inventory");
  const sectionLink = (section: string) => {
    const next = new URLSearchParams(params);
    next.set("view", section);
    return "/seller/inventory?" + next;
  };

  const parsed = (key: string) => {
    const value = Number(params.get(key));
    return Number.isSafeInteger(value) && value >= 1 && value <= 1000000
      ? value
      : 1;
  };
  const page = parsed("page"),
    movementsPage = parsed("history_page");
  const setPage = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });
  const setMovementsPage = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("history_page", String(value));
      next.set("view", "history");
      return next;
    });
  const filters = {
    ...(params.get("q") ? { q: params.get("q")! } : {}),
    ...(params.get("product_id")
      ? { product_id: params.get("product_id")! }
      : {}),
    ...(params.get("variant_id")
      ? { variant_id: params.get("variant_id")! }
      : {}),
  };
  const historyPeriod = inventoryPeriod(
    params.get("stock_from"),
    params.get("stock_to"),
  );
  const access = useStoreAccess(),
    [adjustmentNotice, setAdjustmentNotice] = useState(""),
    [selected, setSelected] =
      useState<OperationOutputs["listStoreInventory"]["items"][number]>();
  const sortValue = params.get('sort');
  const sort = sortValue === 'NAME_ASC' || sortValue === 'NAME_DESC' || sortValue === 'AVAILABLE_ASC' || sortValue === 'AVAILABLE_DESC' ? sortValue : undefined;
  const stockValue=params.get('stock');
  const stock=stockValue==='IN_STOCK'||stockValue==='LOW'||stockValue==='OUT'?stockValue:undefined;
  const setInventoryFilter=(key:string,value:string)=>setParams(current=>{const next=new URLSearchParams(current);value?next.set(key,value):next.delete(key);next.set('page','1');return next;});
  const inventory = useQuery({
    queryKey: ["store-inventory", page, filters, sort,stock],
    queryFn: ({ signal }) =>
      callOperation(
        "listStoreInventory",
        { query: { page, size: 20, ...filters, ...(sort ? {sort} : {}),...(stock?{stock}:{}) } },
        { signal },
      ),
    enabled: access.can("inventory.store.read_adjust"),
  });
  const inventoryImages = useCurrentOrderImages(inventory.data?.items ?? []);
  const movements = useQuery({
    queryKey: ["store-stock-movements", movementsPage, filters, historyPeriod],
    queryFn: ({ signal }) =>
      callOperation(
        "listStockMovements",
        {
          query: {
            page: movementsPage,
            size: 10,
            ...filters,
            ...historyPeriod,
          },
        },
        { signal },
      ),
    enabled: access.can("inventory.store.read_adjust"),
  });
  const actors = useAuditActorLabels(
    "STORE",
    access.owner
      ? (movements.data?.items.map((row) => row.actor_user_id) ?? [])
      : [],
  );
  const variantName = (item: {
    product_title?: string;
    sku?: string;
    variant_values?: Record<string, string>;
    variant_id: string;
  }) => {
    const values = variantLabel(item.variant_values, "");
    return item.product_title
      ? `${item.product_title} · ${values || "Phân loại tiêu chuẩn"}${item.sku ? ` · SKU: ${item.sku}` : ""}`
      : `Chưa tải được thông tin phân loại (${item.variant_id})`;
  };
  if (!access.can("inventory.store.read_adjust"))
    return (
      <ErrorView
        error={
          new ApiError(403, "FORBIDDEN", "Bạn chưa có quyền quản lý tồn kho.")
        }
      />
    );
  return (
    <section className="seller-inventory-page">
      <SellerSubNav />
      <h1>Quản lý tồn kho</h1>
      {adjustmentNotice && (
        <div role="status" className="ui-alert ui-alert-success">
          <span>Đã ghi nhận điều chỉnh: {adjustmentNotice}. </span>
          <Link to={sectionLink("history")}>Xem bút toán mới nhất</Link>
        </div>
      )}
      <button
        type="button"
        disabled={inventory.isFetching || movements.isFetching}
        onClick={() =>
          void Promise.all(
            [
              "store-inventory",
              "store-stock-movements",
              "inventory-reconciliation",
              "stock-commitments",
            ].map((key) => cache.invalidateQueries({ queryKey: [key] })),
          )
        }
      >
        Đọc lại tồn kho và đối chiếu
      </button>
      {inventory.isFetching && inventory.data && (
        <p role="status">
          Đang cập nhật số lượng tồn kho. Vui lòng chờ trước khi điều chỉnh
          tiếp.
        </p>
      )}
      <details className="inventory-explanation"><summary>Cách đọc số tồn và lượng đang giữ</summary><p className="text-slate-500">
        Theo dõi tồn thương mại, lượng đang giữ và điều chỉnh có lý do. Số này
        không phải số đếm vật lý: đơn COD có thể đã trừ tồn trước khi bàn giao.
      </p></details>
      <form
        className="inventory-search"
        key={JSON.stringify(filters)}
        onSubmit={(event) => {
          event.preventDefault();
          const q = String(
            new FormData(event.currentTarget).get("q") ?? "",
          ).trim();
          setParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("page");
            next.delete("history_page");
            next.delete("commitments_page");
            if (q) next.set("q", q);
            else next.delete("q");
            return next;
          });
        }}
      >
        <label>
          Tìm hàng theo tên, SKU hoặc phân loại
          <input
            type="search"
            name="q"
            maxLength={200}
            defaultValue={filters.q ?? ""}
          />
        </label>
        <button type="submit">Tìm trong toàn bộ kho</button>
        {Object.keys(filters).length > 0 && (
          <Link to="/seller/inventory">Bỏ lọc kho</Link>
        )}
      </form>
      {(filters.product_id || filters.variant_id) && (
        <p role="note">
          Đang xem{" "}
          {filters.variant_id
            ? "một phân loại"
            : "các phân loại của một sản phẩm"}{" "}
          từ liên kết. Bộ lọc áp dụng cho cả tồn và lịch sử; bỏ lọc để tìm toàn
          Store.
        </p>
      )}
      <nav className="workspace-sections" aria-label="Khu vực quản lý kho">
        {[
          ["inventory", "Tồn có thể bán"],
          ["history", "Lịch sử biến động"],
          ["reconciliation", "Đối chiếu theo kỳ"],
          ["commitments", "Hàng đang giữ / đã trừ"],
        ].map(([key, label]) => (
          <Link
            key={key}
            aria-current={view === key ? "page" : undefined}
            to={sectionLink(key)}
          >
            {label}
          </Link>
        ))}
      </nav>
      {inventory.error ? (
        <ErrorView
          error={inventory.error}
          onRetry={() => void inventory.refetch()}
        />
      ) : !inventory.data ? (
        <Loading />
      ) : (
        <>
          {view === "inventory" && (
            <>
              <nav className="order-status-tabs" aria-label="Lọc nhanh tồn kho">{[['','Tất cả'],['IN_STOCK','Còn hàng'],['LOW','Sắp hết (1–4)'],['OUT','Hết hàng']].map(([value,label])=><button key={value} type="button" aria-pressed={(stock??'')===value} onClick={()=>setInventoryFilter('stock',value)}>{label}</button>)}</nav>
              <div className="boot-card market-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <SortHeader label="Sản phẩm / SKU" value={sort} ascending="NAME_ASC" descending="NAME_DESC" onChange={value=>setInventoryFilter('sort',value)}/>
                      <th style={{ width: '15%' }}>Tồn thương mại</th>
                      <th style={{ width: '15%' }}>Đang giữ</th>
                      <SortHeader label="Có thể bán" value={sort} ascending="AVAILABLE_ASC" descending="AVAILABLE_DESC" onChange={value=>setInventoryFilter('sort',value)}/>
                      <th style={{ width: '22%', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.data.items.map((item) => (
                      <tr key={item.variant_id}>
                        <td>
                          <div className="seller-inventory-identity">
                            {inventoryImages.get(item.variant_id) && (
                              <div className="order-item-current-image">
                                <ProductImage src={inventoryImages.get(item.variant_id)} name={item.product_title ?? 'sản phẩm'} alt="Ảnh sản phẩm hiện tại"/>
                                <small>Ảnh hiện tại</small>
                              </div>
                            )}
                            <div>
                              <strong style={{ display: 'block', fontSize: '13.5px', color: '#0f172a' }}>{variantName(item)}</strong>
                              {item.product_id && (
                                <div className="inventory-item-links">
                                  <Link to={'/products/'+item.product_id}>Xem sản phẩm</Link>
                                  {access.can('product.store.read_write') && (
                                    <Link to={'/seller/products/'+item.product_id+'/edit'}>Chỉnh sửa</Link>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '14px', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ fontSize: '14px', color: '#64748b' }}>{item.reserved_quantity}</td>
                        <td>
                          <span className={'market-badge ' + (item.available_quantity === 0 ? 'is-danger' : item.available_quantity < 5 ? 'is-warning' : 'is-success')} style={{ fontWeight: 700, fontSize: '13px' }}>
                            {item.available_quantity}
                          </span>
                          {item.available_quantity === 0 ? <span className="seller-low-stock"> · Hết hàng</span> : item.available_quantity < 5 && <span className="seller-low-stock"> · Còn ít (dưới 5)</span>}
                        </td>
                        <td className="inventory-row-actions" style={{ textAlign: 'right' }}>
                          <button
                            className="ui-button ui-button-secondary"
                            style={{ padding: '5px 12px', fontSize: '12.5px', marginRight: '6px' }}
                            disabled={
                              !item.product_title || inventory.isFetching
                            }
                            onClick={() => setSelected(item)}
                          >
                            Điều chỉnh
                          </button>
                          <Link
                            className="inventory-history-link"
                            to={
                              "/seller/inventory?variant_id=" +
                              item.variant_id +
                              "#stock-history"
                            }
                          >
                            Xem biến động
                          </Link>
                          <Link
                            className="inventory-history-link"
                            to={
                              "/seller/inventory?variant_id=" +
                              item.variant_id +
                              "#stock-reconciliation"
                            }
                          >
                            Đối chiếu kỳ
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!inventory.data.items.length && (
                  <p>Chưa có phân loại nào trong kho.</p>
                )}
              </div>
              <Pagination
                page={page}
                size={inventory.data.size}
                total={inventory.data.total}
                onPage={setPage}
              />
            </>
          )}
          {view === "reconciliation" && (
            <InventoryReconciliation variantId={filters.variant_id} />
          )}
          {view === "commitments" && <StockCommitments filters={filters} />}
          {view === "history" && (
            <div id="stock-history" className="boot-card mt-4">
              <h2>Lịch sử biến động kho</h2>
              <form key={(params.get("stock_from")??"")+":"+(params.get("stock_to")??"")} className="stock-period-filter" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget),from=String(data.get('from')??''),to=String(data.get('to')??'');const end=event.currentTarget.elements.namedItem('to') as HTMLInputElement;end.setCustomValidity(!inventoryPeriod(from,to)?'Chọn kỳ hợp lệ: ngày kết thúc không trước ngày bắt đầu, tối đa 366 ngày.':'');if(!event.currentTarget.reportValidity())return;setParams(current=>{const next=new URLSearchParams(current);next.set('stock_from',from);next.set('stock_to',to);next.set('history_page','1');return next;});}}><label>Từ ngày<input name="from" type="date" required defaultValue={params.get('stock_from')??''}/></label><label>Đến hết ngày<input name="to" type="date" required defaultValue={params.get('stock_to')??''} onChange={event=>event.target.setCustomValidity('')}/></label><button type="submit">Lọc lịch sử</button><button type="button" onClick={()=>setParams(current=>{const next=new URLSearchParams(current);next.delete('stock_from');next.delete('stock_to');next.set('history_page','1');return next;})}>Bỏ lọc ngày</button></form>
              {filters.variant_id &&
                inventory.data?.items.some(
                  (item) => item.variant_id === filters.variant_id,
                ) && (
                  <button
                    type="button"
                    disabled={inventory.isFetching}
                    onClick={() =>
                      setSelected(
                        inventory.data!.items.find(
                          (item) => item.variant_id === filters.variant_id,
                        ),
                      )
                    }
                  >
                    Điều chỉnh
                  </button>
                )}
              {historyPeriod && (
                <p role="note">
                  Đang lọc bút toán từ {params.get("stock_from")} đến hết{" "}
                  {params.get("stock_to")} theo giờ Việt Nam. Bút toán ngoài kỳ
                  này không xuất hiện trong lịch sử đang xem.
                </p>
              )}
              <p className="text-slate-500">
                Nhật ký các lần nhập, xuất và điều chỉnh kho.
              </p>
              {movements.isPending && <Loading />}
              {movements.error && (
                <ErrorView
                  error={movements.error}
                  onRetry={() => void movements.refetch()}
                />
              )}
              {movements.data && (
                <>
                  <div className="market-table-scroll mt-4">
                    <table>
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Phân loại / SKU</th>
                          <th>Δ tồn / giữ</th>
                          <th>Tồn / giữ trước → sau</th>
                          <th>Nguồn / người thao tác</th>
                          <th>Lý do</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movements.data.items.map((m) => (
                          <tr key={m.id}>
                            <td>
                              {m.recorded_at || m.occurred_at
                                ? new Date(
                                    (m.recorded_at ?? m.occurred_at)!,
                                  ).toLocaleString("vi-VN", {
                                    timeZone: "Asia/Ho_Chi_Minh",
                                  })
                                : "—"}
                              {!m.recorded_at && (
                                <p>
                                  Thời điểm lịch sử cũ, chưa có mốc ghi bút toán
                                  xác định
                                </p>
                              )}
                            </td>
                            <td>{variantName(m)}{m.product_id&&<span className="inventory-item-links"><Link to={'/products/'+m.product_id}>Xem sản phẩm</Link><Link to={'/seller/inventory?variant_id='+m.variant_id}>Xem tồn hiện tại</Link></span>}</td>
                            <td
                              style={{
                                color:
                                  m.delta_quantity > 0 ? "green" : "crimson",
                                fontWeight: 600,
                              }}
                            >
                              {m.delta_quantity > 0
                                ? `+${m.delta_quantity}`
                                : m.delta_quantity}{" "}
                              /{" "}
                              {m.delta_reserved == null
                                ? "Chưa có dữ liệu giữ"
                                : m.delta_reserved > 0
                                  ? `+${m.delta_reserved}`
                                  : m.delta_reserved}
                            </td>
                            <td>
                              {m.quantity_before == null ? "Lịch sử cũ chưa có mốc đối chiếu" : <div className="stock-change"><span>Tồn: {m.quantity_before} → {m.quantity_after}</span><span>Đang giữ: {m.reserved_before} → {m.reserved_after}</span></div>}
                            </td>
                            <td>
                              {m.order_id && access.can('order.store.read_status_cancel') ? <Link to={'/seller/orders?q='+m.order_id}>Đơn #{m.order_id.slice(-8).toUpperCase()}</Link> : m.order_id ? `Đơn #${m.order_id.slice(-8).toUpperCase()}` : "Điều chỉnh"}
                              <br />
                              {!m.actor_user_id ? (
                                "Lịch sử cũ chưa có người thao tác"
                              ) : access.owner ? (
                                <AuditActor
                                  id={m.actor_user_id}
                                  labels={actors.labels}
                                  loading={actors.isPending}
                                  error={actors.error}
                                />
                              ) : m.actor_user_id === access.userId ? (
                                "Bạn"
                              ) : m.actor_user_id ===
                                "00000000-0000-0000-0000-000000000000" ? (
                                "Hệ thống"
                              ) : (
                                <>
                                  Nhân sự cửa hàng
                                  <br />
                                  <small>{m.actor_user_id}</small>
                                </>
                              )}
                            </td>
                            <td>{m.reason ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!movements.data.items.length && (
                      <p>Chưa có biến động kho nào được ghi nhận.</p>
                    )}
                  </div>
                  <Pagination
                    page={movementsPage}
                    size={movements.data.size}
                    total={movements.data.total}
                    onPage={setMovementsPage}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
      {selected && (
        <StockAdjustment
          key={selected.variant_id + ":" + selected.version}
          item={selected}
          name={variantName(selected)}
          close={() => setSelected(undefined)}
          done={(reason) => {
            setAdjustmentNotice(reason);
            setSelected(undefined);
            void cache.invalidateQueries({ queryKey: ["store-inventory"] });
            if (movementsPage !== 1) setMovementsPage(1);
            void cache.invalidateQueries({
              queryKey: ["store-stock-movements"],
            });
            void cache.invalidateQueries({
              queryKey: ["inventory-reconciliation"],
            });
            void cache.invalidateQueries({ queryKey: ["stock-commitments"] });
          }}
        />
      )}
    </section>
  );
}
function StockAdjustment({
  item,
  name,
  close,
  done,
}: {
  item: OperationOutputs["listStoreInventory"]["items"][number];
  name: string;
  close: () => void;
  done: (reason: string) => void;
}) {
  const access = useStoreAccess(),
    command = useCommand();
  const storageKey = `pbl6_stock_attempt_${access.userId}_${access.id}_${item.variant_id}`;
  const [restored] = useState<
    OperationInputs["adjustInventory"]["body"] | undefined
  >(() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      return v?.variant_id === item.variant_id &&
        typeof v.operation_id === "string" &&
        Number.isInteger(v.delta_quantity) &&
        Number.isInteger(v.expected_version) &&
        typeof v.reason === "string"
        ? v
        : undefined;
    } catch {
      return undefined;
    }
  });
  const [mode, setMode] = useState<"ADD" | "REMOVE" | "DELTA">(
    restored ? "DELTA" : "ADD",
  );
  const [amount, setAmount] = useState(restored?.delta_quantity ?? 1),
    [reason, setReason] = useState(restored?.reason ?? ""),
    [uncertain, setUncertain] = useState(!!restored),
    [stale, setStale] = useState(false);
  const pending = useRef<
    OperationInputs["adjustInventory"]["body"] | undefined
  >(restored);
  const clear = () => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* storage may be unavailable */
    }
  };
  const delta = mode === "REMOVE" ? -amount : amount;
  const nextQuantity = item.quantity + delta;
  const valid =
    Number.isInteger(delta) &&
    delta !== 0 &&
    Math.abs(delta) <= 2147483647 &&
    Number.isInteger(nextQuantity) &&
    nextQuantity <= 2147483647 &&
    nextQuantity >= item.reserved_quantity &&
    (mode === "DELTA" || amount > 0);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!pending.current && !valid) return;
    void command.run(async () => {
      if (!pending.current)
        pending.current = {
          variant_id: item.variant_id,
          delta_quantity: delta,
          reason: reason.trim(),
          operation_id: crypto.randomUUID(),
          expected_version: item.version,
        };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
      } catch {
        /* Keep the immutable request in memory if storage is unavailable. */
      }
      try {
        await callOperation("adjustInventory", { body: pending.current });
        const submittedReason = pending.current.reason;
        clear();
        done(submittedReason);
      } catch (e) {
        if (
          !(e instanceof ApiError) ||
          e.status === 0 ||
          e.status === 408 ||
          e.status >= 500
        )
          setUncertain(true);
        else if (e.status === 409) {
          setStale(true);
          setUncertain(false);
          clear();
        } else if (!uncertain) {
          pending.current = undefined;
          clear();
        }
        throw e;
      }
    });
  };
  return (
    <Modal
      label="Điều chỉnh tồn kho"
      onClose={close}
      busy={command.busy || uncertain}
    >
      <form onSubmit={submit}>
        <h2>Điều chỉnh tồn kho</h2>
        <p>{name}</p>
        <p>
          Tồn thương mại: {item.quantity}; đang giữ: {item.reserved_quantity};
          khả dụng: {item.available_quantity}.
        </p>
        <p className="text-muted">Tồn thương mại là số lượng hệ thống đang quản lý; đang giữ là hàng dành cho đơn chưa xử lý xong; khả dụng là phần còn có thể bán.</p>
        <p>
          Đơn đã consume có thể chưa bàn giao. Khi kiểm kê thực tế, hãy đối
          chiếu các đơn đó trước; không nhập số đếm vật lý vào ô thay đổi.
        </p>
        <label>
          Loại điều chỉnh
          <select
            value={mode}
            disabled={uncertain || stale || command.busy}
            onChange={(e) => {
              setMode(e.target.value as typeof mode);
              setAmount(1);
            }}
          >
            <option value="ADD">Nhập thêm</option>
            <option value="REMOVE">Giảm hàng hỏng / thiếu</option>
            <option value="DELTA">Điều chỉnh bù có dấu (+ / −)</option>
          </select>
        </label>
        <label>
          {mode === "DELTA" ? "Số lượng thay đổi có dấu" : "Số lượng"}
          <input
            type="number"
            min={mode === "DELTA" ? -2147483647 : 1}
            max={2147483647}
            step={1}
            required
            value={Number.isNaN(amount) ? "" : amount}
            disabled={uncertain || stale || command.busy}
            onChange={(e) =>
              setAmount(e.target.value === "" ? NaN : Number(e.target.value))
            }
          />
        </label>
        <label>
          Lý do
          <input
            required
            maxLength={200}
            value={reason}
            disabled={uncertain || stale || command.busy}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {!uncertain && (
          <div role="status">
            {valid
              ? `Sau điều chỉnh: tồn thương mại ${item.quantity} → ${nextQuantity}; đang giữ ${item.reserved_quantity}; khả dụng ${item.available_quantity} → ${nextQuantity - item.reserved_quantity}.`
              : "Số lượng phải là số nguyên khác 0; tồn sau điều chỉnh không được thấp hơn lượng đang giữ hoặc vượt giới hạn."}
          </div>
        )}
        {command.error != null && <ErrorView error={command.error} />}{" "}
        {uncertain && (
          <p role="status">
            Chưa xác định kết quả. Thử lại sẽ dùng đúng yêu cầu trước đó.
          </p>
        )}
        {stale && (
          <p>
            Dữ liệu đã thay đổi. Đóng và tải lại kho trước khi điều chỉnh tiếp.
          </p>
        )}
        <div className="ui-actions">
          <button
            disabled={
              command.busy || stale || (!uncertain && !valid) || !reason.trim()
            }
          >
            {uncertain ? "Thử lại điều chỉnh" : "Lưu điều chỉnh"}
          </button>
          <button
            type="button"
            disabled={command.busy || uncertain}
            onClick={close}
          >
            Đóng
          </button>
        </div>
      </form>
    </Modal>
  );
}

type StoreOrder = OperationOutputs["getStoreOrder"];
export function StoreOrders() {
  const access = useStoreAccess(),
    filters = useOrderListFilters(true),
    [selected, setSelected] = useState<StoreOrder>(),
    [detailError, setDetailError] = useState<unknown>();
  const data = useQuery({
    queryKey: ["store-orders", filters.query],
    staleTime: 0,
    queryFn: ({ signal }) =>
      callOperation("listStoreOrders", { query: filters.query }, { signal }),
    enabled: access.can("order.store.read_status_cancel"),
  });
  const detailGeneration = useRef(0);
  useEffect(
    () => () => {
      detailGeneration.current++;
    },
    [],
  );
  useEffect(() => {
    detailGeneration.current++;
    setSelected(undefined);
  }, [JSON.stringify(filters.query)]);
  useEffect(() => {
    if (
      data.data &&
      !data.isFetching &&
      !data.error &&
      filters.page > Math.max(1, Math.ceil(data.data.total / data.data.size))
    )
      filters.set(
        "page",
        String(Math.max(1, Math.ceil(data.data.total / data.data.size))),
        { replace: true },
      );
  }, [data.data, data.isFetching, data.error, filters.page]);
  async function open(id: string) {
    const ticket = ++detailGeneration.current;
    setDetailError(undefined);
    try {
      const result = await callOperation("getStoreOrder", { path: { id } });
      if (ticket === detailGeneration.current) setSelected(result);
    } catch (e) {
      if (ticket === detailGeneration.current) setDetailError(e);
    }
  }
  if (!access.can("order.store.read_status_cancel"))
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Bạn chưa có quyền xem và xử lý đơn hàng.",
          )
        }
      />
    );
  return (
    <section>
      <SellerSubNav />
      <h1>Đơn hàng Store</h1>
      <p className="text-slate-500">
        Chỉ các đơn thuộc gian hàng đang hoạt động của bạn.
      </p>
      <OrderStatusTabs filters={filters} />
      <OrderListFilters filters={filters} />
      {detailError != null && <ErrorView error={detailError} />}{" "}
      {data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : !data.data ? (
        <Loading />
      ) : (
        <>
          <p className="table-result-note">{data.data.total} đơn phù hợp · Bấm tiêu đề cột để đổi thứ tự thời gian hoặc số tiền.</p>
          <OrderQueue orders={data.data.items} sort={filters.query.sort} onSort={value=>filters.set('sort',value)} onOpen={(id) => void open(id)} />
          <Pagination
            page={filters.page}
            size={data.data.size}
            total={data.data.total}
            onPage={(page) => filters.set("page", String(page))}
          />
        </>
      )}
      {selected && (
        <StoreOrderActions
          key={selected.id}
          order={selected}
          close={() => {
            detailGeneration.current++;
            setSelected(undefined);
          }}
          updated={(o) => {
            setSelected(o);
            void data.refetch();
          }}
        />
      )}
    </section>
  );
}
function StoreOrderActions({
  order,
  close,
  updated,
}: {
  order: StoreOrder;
  close: () => void;
  updated: (o: StoreOrder) => void;
}) {
  const access = useStoreAccess(),
    command = useCommand(),
    [stale, setStale] = useState(false),
    [reason, setReason] = useState(""),
    [cash, setCash] = useState(false);
  const next: Record<
    string,
    "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED"
  > = {
    PENDING: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "COMPLETED",
  };
  const run = (kind: "next" | "cancel" | "cod") =>
    void command.run(async () => {
      try {
        let result: StoreOrder;
        if (kind === "next")
          result = await callOperation("transitionStoreOrder", {
            path: { id: order.id },
            body: {
              to_status: next[order.status],
              expected_version: order.version,
            },
          });
        else if (kind === "cancel")
          result = await callOperation("cancelStoreOrder", {
            path: { id: order.id },
            body: { reason: reason.trim(), expected_version: order.version },
          });
        else
          result = await callOperation("collectCod", {
            path: { id: order.id },
            body: {
              expected_version: order.version,
              amount_collected_vnd: order.amounts.payable_vnd,
            },
          });
        setCash(false);
        updated(result);
        command.setNotice("Đã cập nhật đơn hàng.");
      } catch (e) {
        setStale(true);
        throw e;
      }
    });
  const reload = () =>
    void command.run(async () => {
      updated(await callOperation("getStoreOrder", { path: { id: order.id } }));
      setStale(false);
      setCash(false);
    });
  return (
    <Modal label="Xử lý đơn Store" onClose={close} busy={command.busy}>
      <h2>Xử lý đơn hàng</h2>
      <p>Mã đơn: <strong>#{order.id.slice(-8).toUpperCase()}</strong> <small>({order.id})</small></p>
      <p>
        Trạng thái: <strong>{orderStatusLabel(order.status)}</strong> ·{" "}
        {paymentMethodLabel(order.payment_method)}
      </p>
      <p>
        Tổng thanh toán:{" "}
        <strong>{formatMoney(order.amounts.payable_vnd)}</strong>
      </p>
      <p>
        Thanh toán:{" "}
        {paymentStatusLabel(order.payment_status, order.amounts.payable_vnd)}
      </p>
      {order.refund_status && (
        <p>
          {order.refund_status === "SUCCEEDED"
            ? "Đã hoàn tiền"
            : "Chưa xác nhận hoàn tiền"}{" "}
          · {refundStatusLabel(order.refund_status)}
        </p>
      )}
      <div className="seller-order-layout"><div className="seller-order-information"><OrderPackingSheet order={order} /><OrderTimeline order={order} /></div><div className="seller-order-commands">
      {command.error != null && <ErrorView error={command.error} />}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      {stale && (
        <p>Đọc lại đơn để xác minh trạng thái trước khi thực hiện tiếp.</p>
      )}
      <OrderNextStep order={order} store />
      {order.status === "SHIPPED" && order.payment_status !== "SUCCEEDED" && (
        <p role="status">
          Chưa thể hoàn tất vì chưa xác nhận đủ tiền.
          {order.payment_method === "COD" && !access.can("cod.store.collect")
            ? " Bạn thiếu quyền ghi nhận COD. Cần Owner hoặc nhân viên được cấp quyền thu tiền xác nhận."
            : " Hãy ghi nhận khoản đã thu hoặc đối soát thanh toán trước."}
        </p>
      )}
      {next[order.status] && (
        <button
          disabled={
            command.busy ||
            stale ||
            (order.status === "SHIPPED" && order.payment_status !== "SUCCEEDED")
          }
          onClick={() => run("next")}
        >
          {
            {
              CONFIRMED: "Xác nhận đơn",
              PROCESSING: "Bắt đầu chuẩn bị hàng",
              SHIPPED: "Đã kiểm đủ hàng và bàn giao",
              COMPLETED: "Xác nhận giao thành công và hoàn tất",
            }[next[order.status]]
          }
        </button>
      )}
      {["AWAITING_PAYMENT", "PENDING", "CONFIRMED"].includes(order.status) && (
        <form
          className="seller-order-cancel"
          onSubmit={(e) => {
            e.preventDefault();
            run("cancel");
          }}
        >
          <label>
            Lý do hủy đơn
            <input
              required
              maxLength={200}
              value={reason}
              disabled={command.busy || stale}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button disabled={command.busy || stale || !reason.trim()}>
            Xác nhận hủy đơn
          </button>
        </form>
      )}
      {order.status === "SHIPPED" &&
        order.payment_method === "COD" &&
        order.payment_status === "PENDING" &&
        access.can("cod.store.collect") && (
          <section className="boot-card">
            <h3>Ghi nhận thu COD</h3>
            <label>
              <input
                type="checkbox"
                checked={cash}
                disabled={command.busy || stale}
                onChange={(e) => setCash(e.target.checked)}
              />
              Tôi đã nhận đủ {formatMoney(order.amounts.payable_vnd)} bằng tiền
              mặt.
            </label>
            <button
              disabled={!cash || command.busy || stale}
              onClick={() => run("cod")}
            >
              Ghi nhận đã thu tiền
            </button>
          </section>
        )}
      {order.status === "SHIPPED" && (
        <Link to={"/seller/delivery-returns?order_id=" + order.id}>
          Ghi nhận giao thất bại / theo dõi hoàn về
        </Link>
      )}
      </div></div>
      <div className="ui-actions">
        <button onClick={reload} disabled={command.busy}>
          Đọc lại đơn
        </button>
        <button onClick={close} disabled={command.busy}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}

export function StoreReports() {
  return <FinancialReport />;
}
