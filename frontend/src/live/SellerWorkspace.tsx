import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Boxes, Store, ArrowRight } from "lucide-react";
import { callOperation } from "../api/operations";
import { ApiError } from "../api/client";
import type {
  OperationInputs,
  OperationOutputs,
} from "../api/operations.generated";
import { ErrorView, Loading, Pagination } from "../bootstrap/components";
import { formatMoney, useCommand, useStoreAccess } from "./useLiveData";
import { StockOperationsPanel, OrderStock } from "./StockOperationsPanel";
import { OrderFacts } from "./OrderFacts";
import { ReturnControls } from "./ReturnControls";

export function SellerSubNav() {
  const access = useStoreAccess();
  return (
    <nav
      className="seller-subnav"
      style={{
        display: "flex",
        gap: "0.5rem",
        borderBottom: "1px solid #e2e8f0",
        paddingBottom: "0.75rem",
        marginBottom: "1.5rem",
        overflowX: "auto",
        flexWrap: "wrap",
      }}
    >
      <Link
        to="/seller"
        style={{
          fontWeight: 500,
          color: "#475569",
          textDecoration: "none",
          padding: "0.35rem 0.75rem",
          borderRadius: "6px",
          background: "#f1f5f9",
        }}
      >
        Tổng quan
      </Link>
      {access.can("product.store.read_write") && (
        <Link
          to="/seller/products"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Sản phẩm
        </Link>
      )}
      {access.can("inventory.store.read_adjust") && (
        <Link
          to="/seller/inventory"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Tồn kho
        </Link>
      )}
      {access.can("order.store.read_status_cancel") && (
        <Link
          to="/seller/orders"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Đơn hàng
        </Link>
      )}
      {access.owner && (
        <Link
          to="/seller/vouchers"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Voucher Store
        </Link>
      )}
      {access.owner && (
        <Link
          to="/seller/staff"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Nhân viên Store
        </Link>
      )}
      {access.owner && (
        <Link
          to="/seller/reports"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Báo cáo
        </Link>
      )}
      {access.owner && (
        <Link
          to="/seller/settings"
          style={{
            fontWeight: 500,
            color: "#475569",
            textDecoration: "none",
            padding: "0.35rem 0.75rem",
            borderRadius: "6px",
            background: "#f1f5f9",
          }}
        >
          Cài đặt Store
        </Link>
      )}
    </nav>
  );
}

export function SellerOverview() {
  const access = useStoreAccess();
  const store = useQuery({
    queryKey: ["own-store"],
    queryFn: () => callOperation("getOwnStore"),
  });
  return (
    <section>
      <SellerSubNav />
      <h1>{store.data?.name ?? "Gian hàng của bạn"}</h1>
      {store.error && <ErrorView error={store.error} />}
      {store.isPending && <Loading />}
      {store.data && !store.error && (
        <>
          <p className="text-slate-500">
            Quản lý sản phẩm, tồn kho và xử lý các đơn hàng trong gian hàng của
            bạn.
          </p>
          <div className="market-stats mt-6">
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
                  <div key={String(href)}>
                    <Symbol className="text-emerald-600" size={25} />
                    <h3>{String(label)}</h3>
                    <Link to={String(href)}>
                      Mở quản lý <ArrowRight size={13} className="inline" />
                    </Link>
                  </div>
                );
              })}
          </div>
          <div className="boot-card mt-6">
            <h2>Thông tin vận hành</h2>
            <p>
              Trạng thái:{" "}
              <span className="market-badge">{store.data.status}</span>
            </p>
            <p>
              Phí giao hàng:{" "}
              {store.data.shipping_fee_vnd !== undefined
                ? formatMoney(store.data.shipping_fee_vnd)
                : "Chưa được cung cấp"}
            </p>
            {access.owner && (
              <Link to="/seller/settings">Cập nhật gian hàng</Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function StoreSettings() {
  const access = useStoreAccess();
  const [round, setRound] = useState(0);
  const state = useQuery({
    queryKey: ["own-store", round],
    queryFn: () => callOperation("getOwnStore"),
    enabled: access.owner,
  });
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
        <ErrorView error={state.error} onRetry={() => void state.refetch()} />
      ) : !state.data ? (
        <Loading />
      ) : (
        <StoreSettingsForm
          key={state.data.id + ":" + state.data.version + ":" + round}
          store={state.data}
          reload={() => setRound((n) => n + 1)}
        />
      )}
    </section>
  );
}
function StoreSettingsForm({
  store,
  reload,
}: {
  store: OperationOutputs["getOwnStore"];
  reload: () => void;
}) {
  const command = useCommand(),
    [name, setName] = useState(store.name),
    [shipping, setShipping] = useState(store.shipping_fee_vnd ?? 0);
  const [stale, setStale] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (store.version === undefined) return;
    void command.run(async () => {
      try {
        await callOperation("updateOwnStore", {
          body: {
            name,
            shipping_fee_vnd: shipping,
            expected_version: store.version!,
          },
        });
        command.setNotice("Đã cập nhật gian hàng.");
        reload();
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) setStale(true);
        throw e;
      }
    });
  };
  return (
    <form className="boot-card" onSubmit={submit}>
      <label>
        Tên gian hàng
        <input
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Phí giao hàng (VND)
        <input
          required
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          step={1}
          type="number"
          value={shipping}
          onChange={(e) => setShipping(Number(e.target.value))}
        />
      </label>
      <p>Trạng thái: {store.status}</p>
      <button disabled={command.busy || stale || store.version === undefined}>
        Lưu thông tin
      </button>
      {command.error != null && (
        <ErrorView error={command.error} onRetry={reload} />
      )}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      {stale && <p>Tải lại dữ liệu trước khi sửa tiếp.</p>}
    </form>
  );
}

export function StoreInventory() {
  const access = useStoreAccess(),
    [page, setPage] = useState(1),
    [stockNotice, setStockNotice] = useState(""),
    [selected, setSelected] =
      useState<OperationOutputs["listStoreInventory"]["items"][number]>();
  const inventory = useQuery({
    queryKey: ["store-inventory", page],
    queryFn: () =>
      callOperation("listStoreInventory", { query: { page, size: 20 } }),
    enabled: access.can("inventory.store.read_adjust"),
  });
  const products = useQuery({
    queryKey: ["store-variant-names"],
    queryFn: () =>
      callOperation("listOwnStoreProducts", { query: { page: 1, size: 100 } }),
    enabled:
      access.can("inventory.store.read_adjust") &&
      access.can("product.store.read_write"),
  });
  const variantName = (id: string) => {
    for (const p of products.data?.items ?? []) {
      const v = p.variants?.find((v) => v.id === id);
      if (v) return p.title + " · " + v.sku;
    }
    return id;
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
    <section>
      <SellerSubNav />
      <h1>Quản lý tồn kho</h1>
      {stockNotice && <p role="status">{stockNotice}</p>}
      <p className="text-slate-500">
        Theo dõi số lượng sẵn có và ghi nhận nhập, xuất kho có lý do.
      </p>
      {inventory.error ? (
        <ErrorView
          error={inventory.error}
          onRetry={() => void inventory.refetch()}
        />
      ) : !inventory.data ? (
        <Loading />
      ) : (
        <>
          <div className="boot-card market-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm / SKU</th>
                  <th>Trong kho</th>
                  <th>Đang giữ</th>
                  <th>Có thể bán</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.data.items.map((item) => (
                  <tr key={item.variant_id}>
                    <td>{variantName(item.variant_id)}</td>
                    <td>{item.quantity}</td>
                    <td>{item.reserved_quantity}</td>
                    <td>
                      <span className="market-badge">
                        {item.available_quantity}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setSelected(item)}>
                        Điều chỉnh
                      </button>
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
          <StockOperationsPanel name={variantName} />
        </>
      )}
      {selected && (
        <div
          className="market-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Điều chỉnh tồn kho"
        >
          <section>
            <StockAdjustment
              key={selected.variant_id + ":" + selected.version}
              item={selected}
              name={variantName(selected.variant_id)}
              close={() => setSelected(undefined)}
              done={() => {
                setSelected(undefined);
                setStockNotice(
                  access.owner
                    ? "Đã ghi nhận thay đổi kho."
                    : "Đã gửi đề nghị, tồn kho chưa thay đổi. Chờ Owner duyệt.",
                );
                void inventory.refetch();
              }}
            />
          </section>
        </div>
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
  done: () => void;
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
  const localTime = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const [adjustmentKind, setAdjustmentKind] = useState<
    "RECEIPT" | "CORRECTION"
  >(restored?.adjustment_kind ?? "RECEIPT");
  const [receivedAt, setReceivedAt] = useState(() =>
      localTime(restored?.received_at),
    ),
    [supplier, setSupplier] = useState(restored?.supplier_name ?? ""),
    [reference, setReference] = useState(restored?.source_reference ?? ""),
    [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [delta, setDelta] = useState(restored?.delta_quantity ?? 1),
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
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void command.run(async () => {
      if (!pending.current)
        pending.current = {
          variant_id: item.variant_id,
          delta_quantity: delta,
          reason: reason.trim(),
          operation_id: crypto.randomUUID(),
          expected_version: item.version,
          adjustment_kind: delta > 0 ? adjustmentKind : "CORRECTION",
          ...(receivedAt
            ? { received_at: new Date(receivedAt).toISOString() }
            : {}),
          ...(supplier.trim() ? { supplier_name: supplier.trim() } : {}),
          ...(reference.trim() ? { source_reference: reference.trim() } : {}),
        };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(pending.current));
      } catch {
        /* Keep the immutable request in memory if storage is unavailable. */
      }
      try {
        if (access.owner)
          await callOperation("adjustInventory", { body: pending.current });
        else
          await callOperation("createStockRequest", { body: pending.current });
        clear();
        done();
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
    <form onSubmit={submit}>
      <h2>Điều chỉnh tồn kho</h2>
      <p>{name}</p>
      <p>
        Hiện có: {item.quantity}; đang giữ: {item.reserved_quantity}.
      </p>
      <label>
        Số lượng thay đổi
        <input
          type="number"
          min={-2147483647}
          max={2147483647}
          step={1}
          required
          value={delta}
          disabled={uncertain || stale || command.busy}
          onChange={(e) => setDelta(Number(e.target.value))}
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
      <label>
        Loại thay đổi
        <select
          value={delta > 0 ? adjustmentKind : "CORRECTION"}
          disabled={uncertain || stale || command.busy || delta <= 0}
          onChange={(e) =>
            setAdjustmentKind(e.target.value as "RECEIPT" | "CORRECTION")
          }
        >
          <option value="RECEIPT">Nhập hàng từ bên ngoài</option>
          <option value="CORRECTION">Điều chỉnh / kiểm kê</option>
        </select>
      </label>
      <label>
        Ngày nhận hàng / chứng từ
        <input
          type="datetime-local"
          value={receivedAt}
          required={delta > 0}
          disabled={uncertain || stale || command.busy}
          onChange={(e) => setReceivedAt(e.target.value)}
        />
      </label>
      <label>
        Nhà cung cấp / nguồn nhập
        <input
          maxLength={200}
          value={supplier}
          disabled={uncertain || stale || command.busy}
          onChange={(e) => setSupplier(e.target.value)}
        />
      </label>
      <label>
        Số chứng từ / phiếu nhập
        <input
          maxLength={200}
          value={reference}
          disabled={uncertain || stale || command.busy}
          onChange={(e) => setReference(e.target.value)}
        />
      </label>
      {access.owner ? (
        <label>
          <input
            type="checkbox"
            checked={ownerConfirmed}
            disabled={uncertain || stale || command.busy}
            onChange={(e) => setOwnerConfirmed(e.target.checked)}
          />
          Tôi là chủ gian hàng, xác nhận thay đổi số lượng và chứng từ thực tế.
        </label>
      ) : (
        <p>Nhân viên gửi đề nghị. Tồn chỉ thay đổi sau khi Owner duyệt.</p>
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
      <button
        disabled={
          command.busy ||
          stale ||
          delta === 0 ||
          !reason.trim() ||
          (access.owner && !ownerConfirmed && !uncertain)
        }
      >
        {uncertain
          ? "Thử lại điều chỉnh"
          : access.owner
            ? "Lưu điều chỉnh"
            : "Gửi đề nghị cho Owner"}
      </button>
      <button
        type="button"
        disabled={command.busy || uncertain}
        onClick={close}
      >
        Đóng
      </button>
    </form>
  );
}

type StoreOrder = OperationOutputs["getStoreOrder"];
export function StoreOrders() {
  const access = useStoreAccess(),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<StoreOrder>(),
    [detailError, setDetailError] = useState<unknown>();
  const data = useQuery({
    queryKey: ["store-orders", page],
    queryFn: () =>
      callOperation("listStoreOrders", { query: { page, size: 20 } }),
    enabled: access.can("order.store.read_status_cancel"),
  });
  async function open(id: string) {
    setDetailError(undefined);
    try {
      setSelected(await callOperation("getStoreOrder", { path: { id } }));
    } catch (e) {
      setDetailError(e);
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
      {detailError != null && <ErrorView error={detailError} />}{" "}
      {data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : !data.data ? (
        <Loading />
      ) : (
        <>
          <div className="boot-card market-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Trạng thái</th>
                  <th>Thanh toán</th>
                  <th>Tổng tiền</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.items.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>
                      <span className="market-badge">{o.status}</span>
                    </td>
                    <td>
                      {o.payment_method} · {o.payment_status ?? "Chưa xác nhận"}
                    </td>
                    <td>{formatMoney(o.amounts.payable_vnd)}</td>
                    <td>
                      <button onClick={() => void open(o.id)}>Xem đơn</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.data.items.length && <p>Chưa có đơn hàng ở trang này.</p>}
          </div>
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
          aria-label="Xử lý đơn Store"
        >
          <section>
            <StoreOrderActions
              key={selected.id}
              order={selected}
              close={() => setSelected(undefined)}
              updated={(o) => {
                setSelected(o);
                void data.refetch();
              }}
            />
          </section>
        </div>
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
    <div>
      <h2>Xử lý đơn hàng</h2>
      <p>{order.id}</p>
      <p>
        Trạng thái: <strong>{order.status}</strong> · {order.payment_method}
      </p>
      <p>
        Tổng thanh toán:{" "}
        <strong>{formatMoney(order.amounts.payable_vnd)}</strong>
      </p>
      <p>Thanh toán: {order.payment_status ?? "Chưa xác nhận"}</p>
      {order.refund_status && (
        <p>
          {order.refund_status === "SUCCEEDED"
            ? "Đã hoàn tiền"
            : "Chưa xác nhận hoàn tiền"}{" "}
          · {order.refund_status}
        </p>
      )}
      <OrderFacts order={order} />
      <OrderStock order={order} />
      <ReturnControls
        order={order}
        store
        updated={(value) => {
          updated(value);
          setStale(false);
          setCash(false);
        }}
      />
      {order.items?.map((i, index) => (
        <div className="border-b border-slate-100 py-2" key={index}>
          <p>
            {String(
              (i.product_snapshot as { title?: string } | undefined)?.title ??
                i.product_id ??
                "Mục đơn",
            )}
          </p>
          <small>Số lượng: {String(i.quantity ?? "—")}</small>
        </div>
      ))}
      {command.error != null && <ErrorView error={command.error} />}{" "}
      {command.notice && <p role="status">{command.notice}</p>}
      {stale && (
        <p>Đọc lại đơn để xác minh trạng thái trước khi thực hiện tiếp.</p>
      )}
      {next[order.status] &&
        !["REQUESTED", "APPROVED"].includes(
          order.return_case?.status ?? "",
        ) && (
          <button
            disabled={
              command.busy ||
              stale ||
              (order.status === "SHIPPED" &&
                order.payment_status !== "SUCCEEDED")
            }
            onClick={() => run("next")}
          >
            Chuyển sang {next[order.status]}
          </button>
        )}
      {["AWAITING_PAYMENT", "PENDING", "CONFIRMED"].includes(order.status) && (
        <form
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
        !["REQUESTED", "APPROVED"].includes(order.return_case?.status ?? "") &&
        order.payment_method === "COD" &&
        order.payment_status !== "SUCCEEDED" &&
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
      <button onClick={reload} disabled={command.busy}>
        Đọc lại đơn
      </button>
      <button onClick={close} disabled={command.busy}>
        Đóng
      </button>
    </div>
  );
}

export function StoreReports() {
  const access = useStoreAccess();
  const now = new Date();
  const [from, setFrom] = useState(() =>
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(() =>
      new Date(now.getTime() + 86400000).toISOString().slice(0, 10),
    );
  const data = useQuery({
    queryKey: ["store-report", from, to],
    queryFn: () =>
      callOperation("getStoreReport", {
        query: {
          from: from + "T00:00:00Z",
          to: to + "T00:00:00Z",
          granularity: "DAY",
        },
      }),
    enabled: access.owner && !!from && !!to && from < to,
  });
  if (!access.owner)
    return (
      <ErrorView
        error={
          new ApiError(403, "FORBIDDEN", "Báo cáo dành cho chủ gian hàng.")
        }
      />
    );
  const labels = {
    order_count: "Số đơn hàng",
    order_value_vnd: "Giá trị đơn hàng",
    completed_goods_revenue_vnd: "Doanh thu hàng đã hoàn tất",
    collected_vnd: "Đã thu",
    refunded_vnd: "Đã hoàn",
    shipping_fee_vnd: "Phí giao hàng",
  };
  return (
    <section>
      <SellerSubNav />
      <h1>Báo cáo gian hàng</h1>
      <p>
        Số liệu bán hoàn tất của các đơn được tạo trong khoảng ngày đã chọn;
        hàng xuất cho đơn chưa hoàn tất được tách trong thống kê kho.
      </p>
      <div className="market-form-grid">
        <label>
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {from >= to ? (
        <p role="alert">Ngày kết thúc phải sau ngày bắt đầu.</p>
      ) : data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : !data.data ? (
        <Loading />
      ) : (
        <>
          <div className="boot-card">
            <h3>Số hàng bán hoàn tất</h3>
            <strong>{data.data.completed_units ?? "Chưa có số liệu"}</strong>
          </div>
          <div className="market-stats">
            {Object.entries(labels).map(([key, label]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>
                  {key === "order_count"
                    ? data.data!.order_count
                    : formatMoney(data.data![key as keyof typeof labels])}
                </strong>
              </div>
            ))}
          </div>
          <div className="boot-card mt-6">
            <h2>Doanh thu theo ngày</h2>
            {!data.data.revenue_series.length ? (
              <p>Chưa có doanh thu hoàn tất trong khoảng đã chọn.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Doanh thu hàng hoàn tất</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.revenue_series.map((v) => (
                    <tr key={v.bucket_start}>
                      <td>
                        {new Date(v.bucket_start).toLocaleDateString("vi-VN")}
                      </td>
                      <td>{formatMoney(v.completed_goods_revenue_vnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p>
              Biến thể sắp hết hàng: {data.data.low_stock_variant_ids.length}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
