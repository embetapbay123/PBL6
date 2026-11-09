import { Button as UiButton } from "../../components/ui/Button";
import { SourceNavigation } from "../../components/SourceNavigation";
import { AuditIdentityLookup } from "./AuditIdentityLookup";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../api/auth-context";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { AuditActor, useAuditActorLabels } from "./AuditActors";
import { ShieldAlert, Activity } from "lucide-react";
const actionLabels: Record<string, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  ADJUST: "Điều chỉnh kho",
  STAFF_MEMBERSHIP_UPDATED: "Thay quyền / trạng thái nhân viên",
  STAFF_INVITATION_CREATED: "Mời nhân viên",
  CANCEL_ORDER: "Hủy đơn",
  TRANSITION_ORDER: "Đổi trạng thái đơn",
  COD_COLLECT: "Xác nhận thu COD",
  COD_REFUND_MANUALLY_CONFIRMED: "Xác nhận hoàn COD",
  HIDE: "Ẩn nội dung",
  RESTORE: "Khôi phục hiển thị",
  LOCK_USER: "Khóa tài khoản",
  LOCK_STORE: "Khóa Store",
};
const sensitiveAction = (action: string) =>
  /LOCK|PERMISSION|ROLE|STAFF_MEMBERSHIP_UPDATED/.test(action);

type Source = "catalog" | "commerce" | "identity";
const fields = [
  "action",
  "target_type",
  "actor_user_id",
  "target_id",
  "store_id",
  "from",
  "to",
] as const;
type Field = (typeof fields)[number];
const uuid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
function localInput(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time)
    ? new Date(time + 7 * 3600000).toISOString().slice(0, 19)
    : "";
}
function draftFrom(params: URLSearchParams) {
  return Object.fromEntries(
    fields.map((key) => {
      const v = params.get(key) ?? "";
      return [key, (key === "from" || key === "to") && v ? localInput(v) : v];
    }),
  ) as Record<Field, string>;
}
export function AuditLogPage() {
  const { session } = useAuth(),
    [params, setParams] = useSearchParams(),
    requested = params.get("source"),
    source: Source =
      requested === "commerce" || requested === "identity"
        ? requested
        : "catalog";
  const number = Number(params.get("page")),
    page = Number.isSafeInteger(number) && number > 0 ? number : 1;
  const [draft, setDraft] = useState(() => draftFrom(params)),
    [validation, setValidation] = useState("");
  const appliedFilters = fields
    .map((key) => params.get(key) ?? "")
    .join("\u0000");
  // Changing source/page must not overwrite a reasoned filter edit made just after navigation.
  useEffect(() => {
    setDraft(draftFrom(params));
    setValidation("");
  }, [appliedFilters]);
  const filters = Object.fromEntries(
    fields.flatMap((key) => (params.get(key) ? [[key, params.get(key)!]] : [])),
  );
  const allowed =
    !!session?.context?.roles.includes("ADMIN") &&
    !!session.context.role_permissions?.includes("platform.admin");
  const query = useQuery({
    queryKey: ["admin-audit", source, page, filters],
    enabled: allowed,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => {
      const input = { query: { page, size: 20, ...filters } };
      return source === "catalog"
        ? callOperation("listCatalogAudit", input, { signal })
        : source === "commerce"
          ? callOperation("listCommerceAudit", input, { signal })
          : callOperation("listIdentityAudit", input, { signal });
    },
  });
  const actors = useAuditActorLabels(
    "ADMIN",
    allowed && !query.error
      ? (query.data?.items.map((row) => row.actor_user_id) ?? [])
      : [],
  );
  const change = (key: Field, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function apply(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    next.delete("page");
    const values = { ...draft };
    try {
      for (const key of ["from", "to"] as const)
        if (values[key])
          values[key] = new Date(values[key] + "+07:00").toISOString();
      if (
        values.from &&
        values.to &&
        Date.parse(values.from) >= Date.parse(values.to)
      )
        throw Error("Thời điểm kết thúc phải sau bắt đầu.");
    } catch (error) {
      setValidation(
        error instanceof Error
          ? error.message
          : "Khoảng thời gian chưa hợp lệ.",
      );
      return;
    }
    for (const key of fields) {
      next.delete(key);
      if (values[key].trim()) next.set(key, values[key].trim());
    }
    setValidation("");
    if (next.toString() === params.toString()) void query.refetch();
    else setParams(next);
  }
  const refresh = () => {
    void query.refetch();
    if (actors.accounts.size) void actors.refetch();
  };
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Bạn chưa có quyền đọc nhật ký quản trị.",
          )
        }
      />
    );
  return (
    <section>
      <h2>Nhật ký quản trị</h2>
      <p>
        Nhãn, email và trạng thái tài khoản là dữ liệu hiện tại, không phải hồ
        sơ tại thời điểm thao tác. ID không phân giải được vẫn giữ nguyên; lịch
        sử thiếu người thực hiện không được gán thành Hệ thống.
      </p>
      <SourceNavigation
        value={source}
        onChange={(value) => {
          setDraft(draftFrom(new URLSearchParams()));
          setValidation("");
          setParams((current) => {
            const next = new URLSearchParams(current);
            for (const field of fields) next.delete(field);
            next.delete("page");
            next.set("source", value);
            return next;
          });
        }}
      />
      <form
        className="audit-filter-form"
        onSubmit={apply}
        onInvalidCapture={(event) => {
          const details = (event.target as HTMLElement).closest("details");
          if (details) details.open = true;
        }}
      >
        <label>
          Hành động
          <input
            maxLength={200}
            placeholder="Ví dụ: UPDATE"
            value={draft.action}
            onChange={(e) => change("action", e.target.value)}
          />
        </label>
        <label>
          Loại đối tượng
          <input
            maxLength={200}
            placeholder="Ví dụ: Product"
            value={draft.target_type}
            onChange={(e) => change("target_type", e.target.value)}
          />
        </label>
        <label>
          Từ thời điểm (giờ Việt Nam)
          <input
            type="datetime-local"
            step={1}
            value={draft.from}
            onChange={(e) => change("from", e.target.value)}
          />
        </label>
        <label>
          Đến trước thời điểm (giờ Việt Nam)
          <input
            type="datetime-local"
            step={1}
            value={draft.to}
            onChange={(e) => change("to", e.target.value)}
          />
        </label>
        <details
          className="audit-advanced"
          open={
            draft.actor_user_id || draft.target_id || draft.store_id
              ? true
              : undefined
          }
        >
          <summary>Lọc nâng cao: người thực hiện, đối tượng, Store</summary>
          <div className="market-form-grid">
            <AuditIdentityLookup
              kind="user"
              onPick={(id) => change("actor_user_id", id)}
            />
            <AuditIdentityLookup
              kind="store"
              onPick={(id) => change("store_id", id)}
            />
            <label>
              Mã người thực hiện
              <input
                pattern={uuid}
                maxLength={36}
                value={draft.actor_user_id}
                onChange={(e) => change("actor_user_id", e.target.value)}
              />
            </label>
            <label>
              Mã đối tượng
              <input
                pattern={uuid}
                maxLength={36}
                value={draft.target_id}
                onChange={(e) => change("target_id", e.target.value)}
              />
            </label>
            <label>
              Mã Store
              <input
                pattern={uuid}
                maxLength={36}
                value={draft.store_id}
                onChange={(e) => change("store_id", e.target.value)}
              />
            </label>
          </div>
          <p>
            Mã đối tượng là định danh chính xác từ đơn/sản phẩm hoặc nhật ký;
            không tìm theo tên trong trường này.
          </p>
        </details>
        {validation && <p role="alert">{validation}</p>}
        <button>Lọc</button>
        <UiButton
          type="button"
          variant="secondary"
          onClick={() => {
            setDraft(draftFrom(new URLSearchParams()));
            setValidation("");
            setParams((current) => {
              const next = new URLSearchParams(current);
              for (const field of fields) next.delete(field);
              next.delete("page");
              next.set("source", source);
              return next;
            });
          }}
        >
          Xóa tất cả bộ lọc
        </UiButton>
      </form>
      <p>
        Khoảng thời gian gồm mốc bắt đầu và không gồm mốc kết thúc. Log cũ chưa
        có căn cứ Store vẫn tra được theo đối tượng; không tự gán theo
        membership hiện tại.
      </p>
      <button disabled={query.isFetching} onClick={refresh}>
        Đọc lại nhật ký
      </button>
      {query.isPending && <Loading />}
      {query.error && <ErrorView error={query.error} onRetry={refresh} />}
      {query.data && !query.error && (
        <>
          {!query.data.items.length ? (
            <Empty>Không có nhật ký phù hợp.</Empty>
          ) : (
            <div
              className="market-table-scroll"
              role="region"
              aria-label="Bảng nhật ký, có thể cuộn ngang"
              tabIndex={0}
            >
              <table>
                <caption>
                  Nhật ký hoạt động theo thời gian mới nhất · giờ Việt Nam
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Hành động</th>
                    <th scope="col">Đối tượng / Store</th>
                    <th scope="col">Người thực hiện</th>
                    <th scope="col">Mã truy vết</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((entry) => (
                    <tr
                      key={entry.id}
                      className={
                        sensitiveAction(entry.action)
                          ? "audit-sensitive-row"
                          : undefined
                      }
                    >
                      <td>
                        <time dateTime={entry.created_at}>
                          {new Date(entry.created_at).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </time>
                      </td>
                      <td>
                        <span className="audit-action-label">
                          {sensitiveAction(entry.action) ? (
                            <ShieldAlert
                              size={17}
                              aria-label="Thao tác liên quan quyền hoặc khóa"
                            />
                          ) : (
                            <Activity size={17} aria-hidden="true" />
                          )}
                          {actionLabels[entry.action] ?? entry.action}
                        </span>
                        <small>{entry.action}</small>
                      </td>
                      <td>
                        {entry.target_type}
                        <br />
                        <small>{entry.target_id}</small>
                        {entry.store_id && (
                          <>
                            <br />
                            <Link
                              to={
                                "/admin?tab=stores&q=" +
                                encodeURIComponent(entry.store_id)
                              }
                            >
                              Store: {entry.store_id}
                            </Link>
                          </>
                        )}
                      </td>
                      <td>
                        <AuditActor
                          id={entry.actor_user_id}
                          labels={actors.labels}
                          accounts={actors.accounts}
                          admin
                          loading={actors.isFetching}
                          error={actors.error}
                        />
                      </td>
                      <td>{entry.request_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        </>
      )}
      {actors.error && (
        <ErrorView error={actors.error} onRetry={() => void actors.refetch()} />
      )}
    </section>
  );
}
