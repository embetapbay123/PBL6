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
      <SourceNavigation
        value={source}
        onChange={(value) => setParams({ source: value })}
      />
      <form
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
        <label>
          Hành động
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Tất cả hành động</option>
            {action && !actions[action] && (
              <option value={action}>{action}</option>
            )}
            {Object.entries(actions).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loại đối tượng
          <input
            maxLength={200}
            placeholder="Ví dụ: Product"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </label>
        <label>
          Từ ngày (giờ Việt Nam)
          <input
            type="date"
            max={toDate || undefined}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label>
          Đến hết ngày (giờ Việt Nam)
          <input
            type="date"
            min={fromDate || undefined}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <button>Áp dụng bộ lọc</button>{" "}
        <button type="button" onClick={() => setParams({ source })}>
          Bỏ bộ lọc
        </button>
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
                        <time dateTime={entry.created_at}>
                          {new Date(entry.created_at).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </time>
                        <br />
                        <small>{entry.request_id}</small>
                      </td>
                      <td>
                        <EntryActor
                          entry={entry}
                          labels={actors.labels}
                          loading={actors.isFetching}
                          error={actors.error}
                        />
                        {entry.actor_kind === "ACCOUNT" &&
                          entry.actor_user_id && (
                            <button
                              onClick={() =>
                                patch("actor_user_id", entry.actor_user_id!)
                              }
                            >
                              Xem nhật ký của người này
                            </button>
                          )}
                      </td>
                      <td>
                        {actions[entry.action] ?? entry.action}
                        <br />
                        <small>{entry.action}</small>
                        <br />
                        {entry.target_label}
                        <br />
                        <button onClick={() => patch("action", entry.action)}>
                          Chỉ xem hành động này
                        </button>
                        <br />
                        <small>
                          {entry.target_type} · {entry.target_id}
                        </small>
                        <EntryDestination entry={entry} />
                      </td>
                      <td>
                        <details
                          style={{ maxWidth: 360, overflowWrap: "anywhere" }}
                        >
                          <summary>Xem thay đổi</summary>
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
                  <button onClick={() => patch("action", entry.action)}>
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
