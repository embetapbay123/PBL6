import { SourceNavigation } from "../../components/SourceNavigation";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../api/auth-context";
import { ApiError } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  auditFieldLabels as labels,
  auditValueText as text,
} from "./store-audit-presentation";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { AuditActor, useAuditActorLabels } from "../admin/AuditActors";
type Source = "catalog" | "commerce" | "identity";
const calendarDay = (value: string | null) => {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return parts.year + "-" + parts.month + "-" + parts.day;
};
const shiftDay = (value: string, delta: number) => {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};
const actions: Record<string, string> = {
  UPDATE: "Cập nhật",
  CREATE: "Tạo mới",
  ADJUST: "Điều chỉnh kho",
  VARIANT_ADD: "Thêm phân loại",
  STAFF_MEMBERSHIP_UPDATED: "Thay quyền / trạng thái nhân viên",
  STAFF_INVITATION_CREATED: "Mời nhân viên",
  STAFF_INVITATION_ACCEPTED: "Chấp nhận lời mời",
  STAFF_INVITATION_REVOKED: "Thu hồi lời mời",
  STAFF_INVITATION_EXPIRED: "Lời mời hết hạn",
  STAFF_INVITATION_DELIVERY_FAILED: "Gửi lời mời thất bại, đã thu hồi",
  TRANSITION_ORDER: "Đổi trạng thái đơn",
  CANCEL_ORDER: "Hủy đơn",
  DELIVERY_RETURN_CLOSED: "Đóng đơn sau hoàn về",
  COD_COLLECT: "Xác nhận thu COD",
  COD_REFUND_MANUALLY_CONFIRMED: "Owner xác nhận hoàn COD",
  INVENTORY_CONSUMED: "Hệ thống xác nhận trừ tồn",
  INVENTORY_RELEASED: "Hệ thống nhả giữ hàng",
  INVENTORY_RESTOCKED: "Hệ thống hoàn tồn",
  CALLBACK: "Hệ thống nhận kết quả thanh toán",
  REQUEST: "Hệ thống tạo lệnh hoàn tiền",
  PROVIDER_RESULT: "Hệ thống nhận kết quả hoàn tiền",
  LEASE_EXPIRED: "Chưa rõ kết quả sau gián đoạn",
  STATE_CHANGED: "Hệ thống cập nhật trạng thái",
  LOOKUP_STARTED: "Hệ thống bắt đầu đối soát",
  COMMAND_STARTED: "Hệ thống gửi lệnh hoàn tiền",
  RETRY_REQUEUED: "Hệ thống xếp lại lệnh hoàn tiền",
};
type Entry = OperationOutputs["listStoreCatalogAudit"]["items"][number];
function EntryActor({
  entry,
  labels,
  loading,
  error,
}: {
  entry: Entry;
  labels: Map<string, string>;
  loading: boolean;
  error: unknown;
}) {
  return entry.actor_kind === "UNKNOWN" ||
    (!entry.actor_user_id && entry.actor_kind !== "SYSTEM") ? (
    <span>Chưa có thông tin người thao tác trong lịch sử</span>
  ) : (
    <AuditActor
      id={entry.actor_user_id}
      labels={labels}
      loading={loading}
      error={error}
    />
  );
}
function EntryDestination({ entry }: { entry: Entry }) {
  if (entry.target_type === "Product")
    return (
      <p>
        <Link to={"/seller/products/" + entry.target_id + "/edit"}>
          Xem sản phẩm Store
        </Link>
      </p>
    );
  if (entry.target_type === "Order")
    return (
      <p>
        <Link to={"/seller/orders?q=" + encodeURIComponent(entry.target_id)}>
          Tìm đơn trong Store
        </Link>
      </p>
    );
  const variant = entry.after.variant_id ?? entry.before.variant_id;
  if (
    entry.target_type === "Inventory" &&
    typeof variant === "string" &&
    /^[0-9a-f-]{36}$/i.test(variant)
  )
    return (
      <p>
        <Link to={"/seller/inventory?variant_id=" + variant}>
          Xem phân loại trong kho
        </Link>
      </p>
    );
  return null;
}
function Changes({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown>;
}) {
  return (
    <div>
      <h4>{title}</h4>
      {Object.keys(value).length ? (
        <dl>
          {Object.entries(value).map(([key, item]) => (
            <div key={key}>
              <dt>{labels[key] ?? key}</dt>
              <dd>{text(item, key)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>Không có trường nghiệp vụ được cung cấp trong bản đọc này.</p>
      )}
    </div>
  );
}
export function StoreAuditPage() {
  const { session } = useAuth(),
    [params, setParams] = useSearchParams();
  const source: Source =
    params.get("source") === "commerce"
      ? "commerce"
      : params.get("source") === "identity"
        ? "identity"
        : "catalog";
  const raw = Number(params.get("page")),
    page = Number.isSafeInteger(raw) && raw >= 1 ? raw : 1;
  const allowed =
    session?.context?.store_membership?.role === "OWNER" &&
    session.context.store_membership.status === "ACTIVE" &&
    session.context.roles.includes("STORE_OWNER");
  const [action, setAction] = useState(params.get("action") ?? ""),
    [target, setTarget] = useState(params.get("target_type") ?? ""),
    [fromDate, setFromDate] = useState(calendarDay(params.get("from"))),
    [toDate, setToDate] = useState(() => {
      const day = calendarDay(params.get("to"));
      return day ? shiftDay(day, -1) : "";
    });
  useEffect(() => {
    setAction(params.get("action") ?? "");
    setTarget(params.get("target_type") ?? "");
    setFromDate(calendarDay(params.get("from")));
    const to = calendarDay(params.get("to"));
    setToDate(to ? shiftDay(to, -1) : "");
  }, [params.toString()]);
  const filters = {
    ...(params.get("action") ? { action: params.get("action")! } : {}),
    ...(params.get("target_type")
      ? { target_type: params.get("target_type")! }
      : {}),
    ...(params.get("actor_user_id")
      ? { actor_user_id: params.get("actor_user_id")! }
      : {}),
    ...(params.get("target_id") ? { target_id: params.get("target_id")! } : {}),
    ...(params.get("from") ? { from: params.get("from")! } : {}),
    ...(params.get("to") ? { to: params.get("to")! } : {}),
  };
  const query = useQuery({
    queryKey: ["store-audit", source, page, filters],
    staleTime: 0,
    enabled: !!allowed,
    queryFn: ({ signal }) => {
      const input = { query: { page, size: 20, ...filters } };
      return source === "catalog"
        ? callOperation("listStoreCatalogAudit", input, { signal })
        : source === "commerce"
          ? callOperation("listStoreCommerceAudit", input, { signal })
          : callOperation("listStoreIdentityAudit", input, { signal });
    },
  });
  const actors = useAuditActorLabels(
    "STORE",
    allowed ? (query.data?.items.map((row) => row.actor_user_id) ?? []) : [],
  );
  const patch = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("page");
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  useEffect(() => {
    if (
      query.data &&
      !query.isFetching &&
      !query.error &&
      page > Math.max(1, Math.ceil(query.data.total / query.data.size))
    )
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set(
            "page",
            String(
              Math.max(1, Math.ceil(query.data!.total / query.data!.size)),
            ),
          );
          return next;
        },
        { replace: true },
      );
  }, [query.data, query.isFetching, query.error, page]);
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "OWNER_REQUIRED",
            "Chỉ Owner hiện hành có trang nhật ký Store.",
          )
        }
      />
    );
  return (
    <section>
      <h1>Nhật ký Store</h1>
      <p>
        Chỉ các sự kiện gắn chắc chắn với Store hiện hành. Bản đọc đã lược dữ
        liệu nhạy cảm; hồ sơ cũ thiếu liên kết cần Admin đối chiếu bằng mã truy
        vết. Tên tài khoản là nhãn hiện tại, ID giữ để truy lại người thao tác.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', margin: '8px 0 12px' }}>
        <SourceNavigation
          value={source}
          onChange={(value) => setParams({ source: value })}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Khu vực nhật ký
          <select
            value={source}
            onChange={(e) => patch("source", e.target.value)}
            style={{ height: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', background: '#fff', fontSize: '13px', color: '#0f172a' }}
          >
            <option value="catalog">Sản phẩm và kho</option>
            <option value="commerce">Đơn hàng và thanh toán</option>
            <option value="identity">Store và nhân viên</option>
          </select>
        </label>
      </div>
      <form
        className="order-filter-panel audit-filter-panel"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
          gap: '10px',
          alignItems: 'end',
          padding: '12px 14px',
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          margin: '10px 0 14px',
        }}
        onSubmit={(e) => {
          e.preventDefault();
          setParams((current) => {
            const next = new URLSearchParams(current);
            next.delete("page");
            action.trim()
              ? next.set("action", action.trim())
              : next.delete("action");
            target.trim()
              ? next.set("target_type", target.trim())
              : next.delete("target_type");
            fromDate
              ? next.set("from", fromDate + "T00:00:00+07:00")
              : next.delete("from");
            toDate
              ? next.set("to", shiftDay(toDate, 1) + "T00:00:00+07:00")
              : next.delete("to");
            return next;
          });
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Hành động
          <input
            list="audit-action-options"
            maxLength={200}
            placeholder="Ví dụ: UPDATE, ADJUST"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ height: 38, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', background: '#fff' }}
          />
          <datalist id="audit-action-options">
            {Object.entries(actions).map(([code, label]) => (
              <option key={code} value={code}>
                {label} ({code})
              </option>
            ))}
          </datalist>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Loại đối tượng
          <input
            maxLength={200}
            placeholder="Ví dụ: Product, Order"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ height: 38, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', background: '#fff' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Từ ngày (giờ Việt Nam)
          <input
            type="date"
            max={toDate || undefined}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ height: 38, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', background: '#fff' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '13px', fontWeight: 600, color: '#475569' }}>
          Đến hết ngày (giờ Việt Nam)
          <input
            type="date"
            min={fromDate || undefined}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ height: 38, borderRadius: 6, border: '1px solid #cbd5e1', padding: '0 10px', background: '#fff' }}
          />
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ height: 38, padding: '0 14px', borderRadius: 6, background: '#ea580c', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Áp dụng bộ lọc</button>
          <button type="button" onClick={() => setParams({ source })} style={{ height: 38, padding: '0 12px', borderRadius: 6, background: '#fff', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 500, cursor: 'pointer' }}>
            Bỏ bộ lọc
          </button>
        </div>
      </form>
      {params.get("actor_user_id") && (
        <p>
          Đang lọc người thao tác: {params.get("actor_user_id")}{" "}
          <button onClick={() => patch("actor_user_id", "")}>
            Bỏ lọc người thao tác
          </button>
        </p>
      )}
      {query.isFetching && query.data && <Loading />}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data?.items.length ? (
            !query.isFetching && (
              <Empty>Không có nhật ký phù hợp trong phạm vi này.</Empty>
            )
          ) : (
            <div
              className="market-table-scroll store-audit-table"
              role="region"
              aria-label="Bảng nhật ký Store, cuộn ngang để xem đủ cột"
              tabIndex={0}
            >
              <table>
                <caption>Thời gian theo giờ Việt Nam</caption>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động / đối tượng</th>
                    <th>Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data?.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <time dateTime={entry.created_at} style={{ fontWeight: 600, color: '#0f172a' }}>
                          {new Date(entry.created_at).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </time>
                        <small style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginTop: 2 }} title={entry.request_id}>
                          Mã vết: {entry.request_id.slice(0, 8)}…
                        </small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <EntryActor
                            entry={entry}
                            labels={actors.labels}
                            loading={actors.isFetching}
                            error={actors.error}
                          />
                          {entry.actor_kind === "ACCOUNT" &&
                            entry.actor_user_id && (
                              <button
                                type="button"
                                className="audit-sub-btn"
                                style={{ alignSelf: 'flex-start', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: '#ffffff', color: '#0f172a', border: '1px solid #94a3b8', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                                onClick={() =>
                                  patch("actor_user_id", entry.actor_user_id!)
                                }
                              >
                                Xem nhật ký của người này
                              </button>
                            )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div>
                            <span className="market-badge" style={{ marginRight: 6, display: 'inline-block' }}>
                              {actions[entry.action] ?? entry.action}
                            </span>
                            <strong style={{ color: '#0f172a' }}>{entry.target_label}</strong>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 2 }}>
                            <EntryDestination entry={entry} />
                            <button
                              type="button"
                              className="audit-sub-btn"
                              style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: '#ffffff', color: '#0f172a', border: '1px solid #94a3b8', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                              onClick={() => patch("action", entry.action)}
                            >
                              Chỉ xem hành động này
                            </button>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: 2 }}>
                            {entry.target_type} · {entry.target_id}
                          </small>
                        </div>
                      </td>
                      <td>
                        <details
                          className="audit-change-details"
                          style={{ maxWidth: 360, overflowWrap: "anywhere", background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}
                        >
                          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>🔍 Xem thay đổi</summary>
                          <small style={{ display: 'block', color: '#64748b', margin: '4px 0', fontSize: '11px' }}>
                            Mã vết đầy đủ: <code>{entry.request_id}</code>
                          </small>
                          <Changes title="Trước" value={entry.before} />
                          <Changes title="Sau" value={entry.after} />
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!!query.data?.items.length && (
            <div
              className="store-audit-cards"
              role="list"
              aria-label="Các sự kiện nhật ký Store"
            >
              {query.data.items.map((entry) => (
                <article
                  className="store-audit-card"
                  role="listitem"
                  key={entry.id}
                >
                  <time dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    })}
                  </time>
                  <h3>
                    {actions[entry.action] ?? entry.action} ·{" "}
                    {entry.target_label}
                  </h3>
                  <p>
                    <EntryActor
                      entry={entry}
                      labels={actors.labels}
                      loading={actors.isFetching}
                      error={actors.error}
                    />
                  </p>
                  <button type="button" className="audit-sub-btn" onClick={() => patch("action", entry.action)}>
                    Chỉ xem hành động này
                  </button>
                  <p>
                    <small>
                      {entry.target_type} · {entry.target_id}
                      <br />
                      Mã truy vết: {entry.request_id}
                    </small>
                  </p>
                  {entry.actor_kind === "ACCOUNT" && entry.actor_user_id && (
                    <button
                      type="button"
                      className="audit-sub-btn"
                      onClick={() =>
                        patch("actor_user_id", entry.actor_user_id!)
                      }
                    >
                      Xem nhật ký của người này
                    </button>
                  )}
                  <EntryDestination entry={entry} />
                  <details>
                    <summary>Xem thay đổi</summary>
                    <Changes title="Trước" value={entry.before} />
                    <Changes title="Sau" value={entry.after} />
                  </details>
                </article>
              ))}
            </div>
          )}
          {query.data && (
            <Pagination
              page={page}
              size={query.data.size}
              total={query.data.total}
              onPage={(value) =>
                setParams((current) => {
                  const next = new URLSearchParams(current);
                  next.set("page", String(value));
                  return next;
                })
              }
            />
          )}
        </>
      )}
      {actors.error && (
        <ErrorView error={actors.error} onRetry={() => void actors.refetch()} />
      )}
    </section>
  );
}
