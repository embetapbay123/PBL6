import { RefundRecoveryPanel } from "./RefundRecoveryPanel";
import { AfterSaleHistory } from "./AfterSaleHistory";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import type {
  OperationInputs,
  OperationOutputs,
} from "../../api/operations.generated";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import {
  OrderItemIdentity,
  OrderPackingSheet,
} from "../../components/OrderPresentation";
import { useCommand, useStoreAccess } from "../../live/useLiveData";
import { CodRefundForm } from "./CodRefundForm";
import { ContactStoreButton } from "../customer/ContactStoreButton";
import { InspectionSummary } from "../../components/InspectionSummary";
import {useCurrentOrderImages} from '../../components/useCurrentOrderImages';
type Case = OperationOutputs["getOwnDeliveryReturn"];
type Line = OperationInputs["inspectDeliveryReturn"]["body"]["lines"][number];
type Command = { operation_id: string };
const statusLabel = {
  OPEN: "Giao thất bại — chờ hàng hoàn về",
  RECEIVED: "Đã ghi nhận kiểm hàng",
  SETTLING: "Đang đối chiếu tồn và tiền",
  CLOSED: "Đã đóng hoàn về",
};
export function useCaseCommand<T extends Command>(key: string) {
  const command = useCommand();
  const [saved] = useState<T | undefined>(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
      return value && typeof value.operation_id === "string"
        ? value
        : undefined;
    } catch {
      return undefined;
    }
  });
  const pending = useRef<T | undefined>(saved),
    [uncertain, setUncertain] = useState(!!saved),
    [stale, setStale] = useState(false);
  const clear = () => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* immutable request stays in memory */
    }
  };
  async function run(
    create: () => T,
    send: (body: T) => Promise<unknown>,
    done: () => Promise<unknown>,
  ) {
    if (stale) return;
    await command.run(async () => {
      pending.current ??= create();
      try {
        sessionStorage.setItem(key, JSON.stringify(pending.current));
      } catch {
        /* retain in memory */
      }
      try {
        await send(pending.current);
        clear();
        pending.current = undefined;
        setUncertain(false);
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.status === 0 ||
          error.status === 408 ||
          error.status >= 500
        )
          setUncertain(true);
        else {
          clear();
          pending.current = undefined;
          setUncertain(false);
          // Validation rejection is definitive: keep the draft editable and
          // create a fresh operation ID after correction. Conflicts/auth errors
          // still require an explicit readback; transport failures keep retry ID.
          setStale(error.status !== 422);
        }
        throw error;
      }
      try {
        await done();
      } catch {
        setStale(true);
        throw new ApiError(
          503,
          "READBACK_REQUIRED",
          "Thao tác đã được server xác nhận nhưng chưa đọc lại được dữ liệu. Chỉ tải lại hồ sơ; không gửi giao dịch lần nữa.",
        );
      }
    });
  }
  return {
    ...command,
    uncertain,
    stale,
    saved: pending.current,
    run,
    reset: () => {
      if (uncertain) return;
      clear();
      pending.current = undefined;
      setStale(false);
      command.setError(undefined);
    },
  };
}
export function CaseFeedback({
  state,
  reload,
}: {
  state: { error: unknown; uncertain: boolean; stale: boolean; busy: boolean };
  reload: () => void;
}) {
  return (
    <>
      {state.error != null && <ErrorView error={state.error} />}{" "}
      {state.uncertain && (
        <p role="status">
          Chưa rõ kết quả. Thử lại dùng đúng nội dung và operation ID cũ; không
          ghi thêm giao dịch.
        </p>
      )}
      {state.stale && (
        <>
          <p>Dữ liệu hoặc quyền đã thay đổi. Đọc lại trước khi tiếp tục.</p>
          <button type="button" onClick={reload} disabled={state.busy}>
            Đọc lại hồ sơ
          </button>
        </>
      )}
    </>
  );
}
export function DeliveryCaseView({
  record,
  children,
  scope = "CUSTOMER",
}: {
  record: Case;
  children?: ReactNode;
  scope?: "CUSTOMER" | "STORE" | "ADMIN";
}) {
  const images=useCurrentOrderImages(record.items);
  return (
    <article className="boot-card">
      <h2>
        {statusLabel[record.status as keyof typeof statusLabel] ??
          record.status}
      </h2>
      <p>Đơn #{record.order_id.slice(-8).toUpperCase()}</p>
      <ol className="return-progress" aria-label="Tiến trình hoàn về">
        {[
          ["OPEN", "Giao thất bại"],
          ["RECEIVED", "Nhận và kiểm hàng"],
          ["SETTLING", "Đối chiếu tồn / tiền"],
          ["CLOSED", "Đóng hồ sơ"],
        ].map(([step, label]) => (
          <li
            key={step}
            aria-current={record.status === step ? "step" : undefined}
          >
            {label}
          </li>
        ))}
      </ol>
      <p>Lý do: {record.reason}</p>
      <div className="delivery-case-items">{record.items.map(item=><OrderItemIdentity key={item.order_item_id} item={item} currentImage={images.get(item.variant_id)}/>)}</div>
      <p>
        Hàng:{" "}
        {record.inventory_status === "APPLIED"
          ? "Đã đối chiếu lượng đủ điều kiện bán lại"
          : "Chưa xác nhận cộng tồn theo kiểm hàng"}{" "}
        · Tiền:{" "}
        {record.amount_vnd === 0
          ? "Đơn 0đ không có khoản đã thu cần hoàn"
          : record.money_settled
            ? record.payment_method === "COD" &&
              record.payment_status === "CANCELLED"
              ? "COD chưa thu — đã đóng nghĩa vụ thu, không phát sinh hoàn tiền"
              : "Đã xác nhận hoàn đủ khoản đã thu"
            : record.payment_method === "COD" &&
                record.payment_status === "SUCCEEDED"
              ? "Owner cần xác nhận hoàn COD đã thu"
              : record.payment_status === "UNKNOWN"
                ? "Cần hỗ trợ đối soát; chưa xác nhận thu hoặc hoàn"
                : "Đang chờ xử lý / đối soát"}
      </p>
      <p>
        Khách muốn mua lại cần tạo đơn mới.
      </p>
      {record.inspection_note && <p>Kết quả kiểm: {record.inspection_note}</p>}
      <InspectionSummary
        lines={record.inspection}
        items={record.items}
        heading="Hàng hoàn về đã ghi nhận"
      />
      {record.last_error && (
        <p role="status">
          {record.last_error === "MONEY_SETTLEMENT_PENDING"
            ? "Tồn đã được xác nhận; đang chờ giải quyết tiền trước khi đóng."
            : "Chưa thể hoàn tất đối chiếu. Hồ sơ vẫn mở; cần đọc lại hoặc liên hệ hỗ trợ."}{" "}
          Mã hồ sơ: {record.id}
        </p>
      )}
      {record.last_error && scope === 'ADMIN' && <details><summary>Chi tiết lỗi</summary><code>{record.last_error}</code></details>}
      <AfterSaleHistory
        orderId={record.order_id}
        scope={scope}
        items={record.items}
        revision={record.version + ":" + record.payment_status}
      />
      {children}
    </article>
  );
}
export function OwnDeliveryReturn({
  order,
}: {
  order: OperationOutputs["getOwnOrder"];
}) {
  const data = useQuery({
    queryKey: ["delivery-returns", "CUSTOMER", order.id],
    enabled: ["SHIPPED", "CANCELLED"].includes(order.status),
    retry: false,
    queryFn: async () => {
      try {
        return await callOperation("getOwnDeliveryReturn", {
          path: { id: order.id },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
  if (data.error)
    return <ErrorView error={data.error} onRetry={() => void data.refetch()} />;
  return data.data ? (
    <section aria-label="Giao thất bại và hoàn về">
      <DeliveryCaseView record={data.data} />
      <button onClick={() => void data.refetch()}>
        Làm mới
      </button>
      <ContactStoreButton storeId={data.data.store_id} orderId={order.id} />
    </section>
  ) : null;
}
export function DeliveryReturnsPage({ admin = false }: { admin?: boolean }) {
  const access = useStoreAccess(),
    cache = useQueryClient(),
    [params] = useSearchParams(),
    [page, setPage] = useState(1),
    [polling, setPolling] = useState(true);
  const orderId = admin ? undefined : (params.get("order_id") ?? undefined);
  const allowed = admin || access.can("order.store.read_status_cancel");
  useEffect(() => {
    if (!polling) return;
    const timer = setTimeout(() => setPolling(false), 60000);
    return () => clearTimeout(timer);
  }, [polling]);
  const data = useQuery({
    queryKey: ["delivery-returns", admin ? "ADMIN" : "STORE", orderId, page],
    enabled: allowed,
    refetchOnWindowFocus: false,
    queryFn: () =>
      admin
        ? callOperation("listAdminDeliveryReturns", {
            query: { page, size: 20 },
          })
        : callOperation("listStoreDeliveryReturns", {
            query: {
              page,
              size: 20,
              ...(orderId ? { order_id: orderId } : {}),
            },
          }),
    refetchInterval: (query) =>
      polling &&
      query.state.data?.items.some((row) => row.status === "SETTLING")
        ? 3000
        : false,
  });
  const order = useQuery({
    queryKey: ["delivery-open-order", orderId],
    enabled: allowed && !admin && !!orderId,
    queryFn: () => callOperation("getStoreOrder", { path: { id: orderId! } }),
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries(
        { queryKey: ["delivery-returns"] },
        { throwOnError: true },
      ),
      cache.invalidateQueries(
        { queryKey: ["delivery-open-order"] },
        { throwOnError: true },
      ),
      cache.invalidateQueries({ queryKey: ["store-orders"] }),
    ]);
  };
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Cần quyền xử lý đơn hàng của cửa hàng.",
          )
        }
      />
    );
  return (
    <section>
      <h1>Giao thất bại và hoàn về</h1>
      <div className="seller-refresh-bar"><button onClick={()=>{setPolling(true);void refresh();}} disabled={data.isFetching}>Làm mới</button></div>
      {!!data.data?.total && <p>Kiểm hàng và xử lý tồn, tiền trước khi đóng hồ sơ.</p>}
      {!!data.data?.total && data.data.summary && <div className="delivery-return-summary" aria-label={orderId ? 'Tổng hồ sơ của đơn' : 'Tổng hồ sơ trong phạm vi hiện tại'}><div><strong>{data.data.summary.open}</strong><span>Hồ sơ chưa đóng</span></div><div><strong>{data.data.summary.awaiting_inspection}</strong><span>Chờ nhận và kiểm hàng</span></div></div>}
      {data.error ? (
        <ErrorView error={data.error} onRetry={() => void data.refetch()} />
      ) : data.isPending ? (
        <Loading />
      ) : (
        <>
          {orderId &&
            !data.data?.items.length &&
            (order.error ? (
              <ErrorView error={order.error} />
            ) : !order.data ? (
              <Loading />
            ) : (
              <OpenCase order={order.data} refresh={refresh} />
            ))}
          {!orderId && !data.data?.items.length && (
            <EmptyDeliveryReturns admin={admin} />
          )}
          {data.data?.items.map((row) => (
            <details
              className="delivery-case-accordion"
              key={row.id}
              open={orderId === row.order_id ? true : undefined}
            >
              <summary>
                <strong>Đơn #{row.order_id.slice(-8).toUpperCase()}</strong>
                <span>
                  {statusLabel[row.status as keyof typeof statusLabel] ??
                    row.status}{" "}
                  · {row.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  sản phẩm
                </span>
              </summary>
              <DeliveryCaseView
                key={row.id}
                record={row}
                scope={admin ? "ADMIN" : "STORE"}
              >
                {row.status === "SETTLING" &&
                  row.payment_method === "SANDBOX" &&
                  !row.money_settled && (
                    <RefundRecoveryPanel
                      orderId={row.order_id}
                      scope={admin ? "ADMIN" : "STORE"}
                      awaitingRequest
                    />
                  )}
                {!admin && (
                  <>
                    {["OPEN", "RECEIVED"].includes(row.status) && (
                      <Inspection
                        key={row.id + ":" + row.version}
                        record={row}
                        refresh={refresh}
                      />
                    )}
                    {row.status === "SETTLING" &&
                      row.amount_vnd > 0 &&
                      row.payment_method === "COD" &&
                      row.payment_status === "SUCCEEDED" && (
                        <CodRefundForm
                          key={row.id}
                          request={{
                            order_id: row.order_id,
                            version: row.version,
                          }}
                          deliveryCase
                        />
                      )}
                    {row.status === "SETTLING" &&
                      row.payment_method === "SANDBOX" &&
                      !row.money_settled && (
                        <p>
                          Hoàn đủ khoản online đã thu được xử lý riêng. Chỉ đóng
                          sau khi có xác nhận hoàn tiền; lỗi đọc trạng thái
                          không phát lại lệnh hoàn.
                        </p>
                      )}
                  </>
                )}
              </DeliveryCaseView>
            </details>
          ))}
          {data.data && (
            <Pagination
              page={page}
              size={data.data.size}
              total={data.data.total}
              onPage={setPage}
            />
          )}
        </>
      )}
      {!polling && (
        <p>
          Tạm dừng cập nhật tự động. Bấm Làm mới để xem tiến trình mới
          nhất.
        </p>
      )}
    </section>
  );
}

function EmptyDeliveryReturns({ admin = false, orderId }: { admin?: boolean; orderId?: string }) {
  const shipping = admin ? "/admin?tab=shipping" : "/seller/shipping";
  return (
    <div className="seller-empty-state">
      <p>Chưa có kiện chuyển hoàn</p>
      <Link className="ui-button ui-button-secondary" to={orderId ? `${shipping}?shipment_q=${encodeURIComponent(orderId)}` : shipping}>
        Xem vận đơn
      </Link>
    </div>
  );
}

function OpenCase({
  order,
  refresh,
}: {
  order: OperationOutputs["getStoreOrder"];
  refresh: () => Promise<void>;
}) {
  const access = useStoreAccess(),
    state = useCaseCommand<OperationInputs["openDeliveryReturn"]["body"]>(
      `pbl6_delivery_open_${access.userId}_${access.id}_${order.id}`,
    ),
    [reason, setReason] = useState(state.saved?.reason ?? "");
  if (order.shipping_mode !== "LEGACY_MANUAL")
    return <EmptyDeliveryReturns orderId={order.id} />;
  if (order.status !== "SHIPPED")
    return (
      <p>
        Đơn không ở giai đoạn đã bàn giao. Đọc lại đơn và chỉ ghi nhận hoàn về
        sau khi giao thất bại.
      </p>
    );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void state.run(
          () => ({
            operation_id: crypto.randomUUID(),
            expected_order_version: order.version,
            reason: reason.trim(),
          }),
          (body) =>
            callOperation("openDeliveryReturn", {
              path: { id: order.id },
              body,
            }),
          refresh,
        );
      }}
    >
      <OrderPackingSheet order={order} />
      <label>
        Lý do giao thất bại / từ chối nhận (hiển thị cho khách)
        <textarea
          required
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={state.busy || state.uncertain || state.stale}
        />
      </label>
      <p>
        Thao tác này chưa hủy đơn, chưa ghi nhận thu COD và chưa cộng hàng về
        kho.
      </p>
      <button disabled={state.busy || state.stale || !reason.trim()}>
        {state.uncertain ? "Thử lại ghi nhận cũ" : "Ghi nhận giao thất bại"}
      </button>
      <CaseFeedback
        state={state}
        reload={() => void refresh().then(state.reset).catch(state.setError)}
      />
    </form>
  );
}
function Inspection({
  record,
  refresh,
}: {
  record: Case;
  refresh: () => Promise<void>;
}) {
  const access = useStoreAccess(),
    key = `${access.userId}_${access.id}_${record.id}`;
  const save = useCaseCommand<OperationInputs["inspectDeliveryReturn"]["body"]>(
      "pbl6_delivery_inspection_" + key,
    ),
    settle = useCaseCommand<OperationInputs["settleDeliveryReturn"]["body"]>(
      "pbl6_delivery_settle_" + key,
    );
  const [lines, setLines] = useState<Line[]>(
      save.saved?.lines ??
        record.items.map(
          (item) =>
            record.inspection.find(
              (line) => line.order_item_id === item.order_item_id,
            ) ?? {
              order_item_id: item.order_item_id,
              received_quantity: 0,
              resellable_quantity: 0,
              damaged_quantity: 0,
              pending_quantity: 0,
            },
        ),
    ),
    [note, setNote] = useState(
      save.saved?.note ?? record.inspection_note ?? "",
    );
  const valid = lines.every((line) => {
    const item = record.items.find(
      (item) => item.order_item_id === line.order_item_id,
    )!;

    return (
      [
        line.received_quantity,
        line.resellable_quantity,
        line.damaged_quantity,
        line.pending_quantity,
      ].every((n) => Number.isInteger(n) && n >= 0) &&
      line.received_quantity <= item.quantity &&
      line.received_quantity ===
        line.resellable_quantity + line.damaged_quantity + line.pending_quantity
    );
  });
  const dirty =
    lines.length !== record.inspection.length ||
    lines.some((line) => {
      const saved = record.inspection.find(
        (value) => value.order_item_id === line.order_item_id,
      );
      return (
        !saved ||
        (
          [
            "received_quantity",
            "resellable_quantity",
            "damaged_quantity",
            "pending_quantity",
          ] as const
        ).some((field) => saved[field] !== line[field])
      );
    }) ||
    note.trim() !== (record.inspection_note ?? "");
  const canSettle =
    record.status === "RECEIVED" &&
    record.inspection.every(
      (line) =>
        line.pending_quantity === 0 &&
        line.received_quantity ===
          record.items.find((item) => item.order_item_id === line.order_item_id)
            ?.quantity,
    );
  const locked =
    save.busy ||
    save.uncertain ||
    save.stale ||
    settle.busy ||
    settle.uncertain ||
    settle.stale;
  const totals = lines.reduce(
    (sum, line) => ({
      received:
        sum.received +
        (Number.isFinite(line.received_quantity) ? line.received_quantity : 0),
      resellable:
        sum.resellable +
        (Number.isFinite(line.resellable_quantity)
          ? line.resellable_quantity
          : 0),
      damaged:
        sum.damaged +
        (Number.isFinite(line.damaged_quantity) ? line.damaged_quantity : 0),
      pending:
        sum.pending +
        (Number.isFinite(line.pending_quantity) ? line.pending_quantity : 0),
    }),
    { received: 0, resellable: 0, damaged: 0, pending: 0 },
  );
  return (
    <section>
      <h3>Biên bản thực nhận và kiểm hàng</h3>
      <p>
          Ghi số thực nhận và phân loại. Chỉ hàng bán lại được mới cộng tồn.
      </p>
      <div className="inspection-totals" role="status">
        <strong>
          Thực nhận {totals.received}/
          {record.items.reduce((sum, item) => sum + item.quantity, 0)}
        </strong>
        <span>Bán lại {totals.resellable}</span>
        <span>Hỏng {totals.damaged}</span>
        <span>Chờ xử lý {totals.pending}</span>
        {!valid && (
          <p>
              Bán lại + hỏng + chờ kiểm phải bằng số thực nhận.
          </p>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save.run(
            () => ({
              operation_id: crypto.randomUUID(),
              expected_version: record.version,
              lines,
              note: note.trim(),
            }),
            (body) =>
              callOperation("inspectDeliveryReturn", {
                path: { id: record.id },
                body,
              }),
            refresh,
          );
        }}
      >
        {record.items.map((item, index) => (
          <fieldset
            className="inspection-line"
            key={item.order_item_id}
            disabled={locked}
          >
            <legend>Mục {index + 1}</legend>
            <OrderItemIdentity item={{ ...item, id: item.order_item_id }} />
            <div className="inspection-quantities">{Object.entries({
              received_quantity: "Thực nhận",
              resellable_quantity: "Đủ điều kiện bán lại",
              damaged_quantity: "Hỏng / không bán lại",
              pending_quantity: "Chờ kiểm / xử lý",
            }).map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  type="number"
                  required
                  min={0}
                  max={item.quantity}
                  step={1}
                  value={
                    Number.isNaN(lines[index][field as keyof Line])
                      ? ""
                      : lines[index][field as keyof Line]
                  }
                  onChange={(e) =>
                    setLines(
                      lines.map((line, i) =>
                        i === index
                          ? {
                              ...line,
                              [field]:
                                e.target.value === ""
                                  ? NaN
                                  : Number(e.target.value),
                            }
                          : line,
                      ),
                    )
                  }
                />
              </label>
            ))}</div>
          </fieldset>
        ))}
        <label>
          Kết quả kiểm hàng thực tế
          <textarea
            required
            maxLength={2000}
            disabled={locked}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {!valid && (
          <p role="alert">
              Số lượng chưa khớp hoặc vượt số đã giao.
          </p>
        )}
        <button
          disabled={
            save.busy ||
            settle.busy ||
            save.stale ||
            settle.uncertain ||
            settle.stale ||
            (!save.uncertain && (!valid || !note.trim()))
          }
        >
          {save.uncertain ? "Thử lại biên bản cũ" : "Lưu kiểm hàng"}
        </button>
        <CaseFeedback
          state={save}
          reload={() => void refresh().then(save.reset).catch(save.setError)}
        />
      </form>
      {record.status === "RECEIVED" && (
        <>
          <p>
            Đối chiếu sẽ giữ nguyên biên bản đã lưu, chỉ cộng lượng bán lại
            được. COD chưa thu được đóng nghĩa vụ thu; khoản đã thu phải hoàn đủ
            trước khi hồ sơ đóng. Không gửi lệnh khi còn sửa biên bản.
          </p>
          <button
            disabled={
              save.busy ||
              save.uncertain ||
              save.stale ||
              settle.busy ||
              settle.stale ||
              (!settle.uncertain && (!canSettle || dirty))
            }
            onClick={() =>
              void settle.run(
                () => ({
                  operation_id: crypto.randomUUID(),
                  expected_version: record.version,
                }),
                (body) =>
                  callOperation("settleDeliveryReturn", {
                    path: { id: record.id },
                    body,
                  }),
                refresh,
              )
            }
          >
            {settle.uncertain
              ? "Thử lại đối chiếu cũ"
              : "Bắt đầu đối chiếu tồn và tiền"}
          </button>
          <CaseFeedback
            state={settle}
            reload={() =>
              void refresh().then(settle.reset).catch(settle.setError)
            }
          />
        </>
      )}
    </section>
  );
}
