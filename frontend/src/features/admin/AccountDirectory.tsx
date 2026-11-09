import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../api/auth-context";
import { ApiError, isUncertainMutation } from "../../api/client";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import { Modal } from "../../components/Modal";

type User = OperationOutputs["listUsers"]["items"][number];
type Store = OperationOutputs["listStores"]["items"][number];
type Entry = User | Store;
type State = "ACTIVE" | "LOCKED";
const statusLabel = (status: string) =>
  status === "ACTIVE"
    ? "Đang hoạt động"
    : status === "LOCKED"
      ? "Đã khóa"
      : status;
const label = (entry: Entry) =>
  "email" in entry ? entry.display_name || entry.email : entry.name;
function Identity({ entry }: { entry: Entry }) {
  return (
    <>
      <strong>{label(entry)}</strong>
      {"email" in entry && <p>{entry.email}</p>}
      <details className="identity-reference"><summary>Mã đối chiếu #{entry.id.slice(-8).toUpperCase()}</summary><code>{entry.id}</code></details>
      {"name" in entry && (
        <p>
          Owner:{" "}
          {entry.owner_display_name ||
            entry.owner_email ||
            "Chưa có nhãn Owner"}
          {entry.owner_user_id && (
            <>
              <br />
              <details className="identity-reference"><summary>Mã Owner</summary><code>{entry.owner_user_id}</code></details>
            </>
          )}
        </p>
      )}
    </>
  );
}

/** The same identified, versioned decision applies to both account and Store directories. */
export function AccountDirectory({ kind }: { kind: "users" | "stores" }) {
  const { session } = useAuth(),
    [params, setParams] = useSearchParams();
  const allowed =
    !!session?.context?.roles.includes("ADMIN") &&
    !!session?.context?.role_permissions?.includes("platform.admin");
  const rawPage = Number(params.get("page")),
    page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const q = params.get("q") ?? "",
    status: State | "" =
      params.get("status") === "ACTIVE"
        ? "ACTIVE"
        : params.get("status") === "LOCKED"
          ? "LOCKED"
          : "";
  const [search, setSearch] = useState(q),
    [selected, setSelected] = useState<{ entry: Entry; next: State }>(),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [decisionError, setDecisionError] = useState<unknown>(),
    [notice, setNotice] = useState(""),
    [readback, setReadback] = useState("");
  const inFlight = useRef(false);
  useEffect(() => setSearch(q), [q]);
  const query = useQuery<{
    items: Entry[];
    total: number;
    page: number;
    size: number;
  }>({
    queryKey: ["admin-directory", kind, page, q, status],
    staleTime: 0,
    enabled: allowed,
    queryFn: async ({ signal }) => {
      const input = {
        query: {
          page,
          size: 20,
          ...(q ? { q } : {}),
          ...(status ? { status } : {}),
        },
      };
      return kind === "users"
        ? callOperation("listUsers", input, { signal })
        : callOperation("listStores", input, { signal });
    },
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
  const filters = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("page");
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  function choose(entry: Entry) {
    setSelected({
      entry,
      next: entry.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
    });
    setReason("");
    setDecisionError(undefined);
    setBlocked(false);
    setReadback("");
    setNotice("");
  }
  function close() {
    if (!busy) setSelected(undefined);
  }
  async function reconcile() {
    if (!selected || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setDecisionError(undefined);
    try {
      const input = { query: { page: 1, size: 10, q: selected.entry.id } };
      const result =
        kind === "users"
          ? await callOperation("listUsers", input)
          : await callOperation("listStores", input);
      const entry = result.items.find((row) => row.id === selected.entry.id);
      if (!entry || !Number.isSafeInteger(entry.version))
        throw new Error(
          "Chưa đọc được đúng đối tượng và phiên bản. Giữ thao tác dừng; kiểm tra nhật ký hoặc liên hệ hỗ trợ.",
        );
      if (entry.status === selected.next) {
        setSelected(undefined);
        setNotice(
          "Đã đối chiếu: " +
            label(entry) +
            " hiện " +
            statusLabel(entry.status).toLowerCase() +
            ". Không gửi lại thay đổi. Có thể tra nhật ký để xác định người thực hiện.",
        );
        void query.refetch();
      } else {
        setSelected({ ...selected, entry });
        setReadback(
          "Đã đọc lại: " +
            statusLabel(entry.status) +
            ", phiên bản " +
            entry.version +
            ". Kiểm tra lý do và xác nhận lại nếu vẫn cần thay đổi.",
        );
        setBlocked(false);
      }
    } catch (error) {
      setDecisionError(error);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (
      !selected ||
      inFlight.current ||
      blocked ||
      !reason.trim() ||
      !Number.isSafeInteger(selected.entry.version)
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setDecisionError(undefined);
    try {
      const input = {
        path: { id: selected.entry.id },
        body: {
          status: selected.next,
          reason: reason.trim(),
          expected_version: selected.entry.version!,
        },
      };
      if (kind === "users") await callOperation("updateUserState", input);
      else await callOperation("updateStoreState", input);
      setNotice(
        "Đã cập nhật " +
          label(selected.entry) +
          ": " +
          statusLabel(selected.next) +
          ".",
      );
      setSelected(undefined);
      void query.refetch();
    } catch (error) {
      setDecisionError(error);
      if (
        isUncertainMutation(error) ||
        (error instanceof ApiError && error.status === 409)
      )
        setBlocked(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Bạn chưa có quyền quản trị tài khoản và Store.",
          )
        }
      />
    );
  const subject = kind === "users" ? "tài khoản" : "Store";
  return (
    <section>
      <h3>{kind === "users" ? "Quản lý tài khoản" : "Quản lý Store"}</h3>
      <form
        className="admin-moderation-search"
        onSubmit={(event) => {
          event.preventDefault();
          filters("q", search.trim());
        }}
      >
        <label>
          {kind === "users"
            ? "Tìm tài khoản theo tên, email hoặc ID"
            : "Tìm Store theo tên, Owner hoặc ID"}
          <input
            type="search"
            maxLength={200}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button>Tìm {subject}</button>
      </form>
      <label>
        Trạng thái {subject}
        <select
          value={status}
          onChange={(event) => filters("status", event.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
      </label>
      {notice && <p role="status">{notice}</p>}
      {query.isPending && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {query.data && !query.error && (
        <>
          {!query.data.items.length ? (
            <Empty>{q||status?<>Không có {subject} phù hợp bộ lọc.</>:<>Chưa có {subject} trong hệ thống.</>}</Empty>
          ) : (
            <div
              className="market-table-scroll admin-directory-table"
              role="region"
              aria-label={"Danh sách " + subject + ", cuộn ngang để xem đủ cột"}
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Đối tượng</th>
                    <th>Trạng thái / phiên bản</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <Identity entry={entry} />
                      </td>
                      <td>
                        {statusLabel(entry.status)}
                        <br />
                        Phiên bản: {entry.version ?? "Chưa có dữ liệu"}
                      </td>
                      <td>
                        <button
                          disabled={
                            busy ||
                            query.isFetching ||
                            !Number.isSafeInteger(entry.version) ||
                            !["ACTIVE", "LOCKED"].includes(entry.status)
                          }
                          onClick={() => choose(entry)}
                        >
                          {entry.status === "ACTIVE" ? "Khóa" : "Mở khóa"}{" "}
                          {subject}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!!query.data.items.length && (
            <div
              className="admin-directory-cards"
              role="list"
              aria-label={"Các " + subject + " phù hợp"}
            >
              {query.data.items.map((entry) => (
                <article
                  role="listitem"
                  className="store-audit-card"
                  key={entry.id}
                >
                  <Identity entry={entry} />
                  <p>
                    {statusLabel(entry.status)} · Phiên bản{" "}
                    {entry.version ?? "Chưa có dữ liệu"}
                  </p>
                  <button
                    disabled={
                      busy ||
                      query.isFetching ||
                      !Number.isSafeInteger(entry.version) ||
                      !["ACTIVE", "LOCKED"].includes(entry.status)
                    }
                    onClick={() => choose(entry)}
                  >
                    {entry.status === "ACTIVE" ? "Khóa" : "Mở khóa"} {subject}
                  </button>
                </article>
              ))}
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
      {selected && (
        <Modal
          label={(selected.next === "LOCKED" ? "Khóa " : "Mở khóa ") + subject}
          busy={busy}
          onClose={close}
        >
          <h3>
            {selected.next === "LOCKED" ? "Khóa" : "Mở khóa"} {subject}
          </h3>
          <Identity entry={selected.entry} />
          <p>
            Hiện tại: {statusLabel(selected.entry.status)} · Phiên bản{" "}
            {selected.entry.version}
          </p>
          <p>
            {kind === "users"
              ? selected.next === "LOCKED"
                ? "Tài khoản ngừng đăng nhập và các phiên hiện hành bị từ chối. Việc này không tự khóa Store hoặc hủy đơn, hoàn tiền."
                : "Tài khoản được hoạt động lại. Các phiên đã thu hồi không được phục hồi; người dùng cần đăng nhập lại."
              : selected.next === "LOCKED"
                ? "Store ngừng bán. Việc này không khóa tài khoản Owner và không tự hủy đơn hoặc hoàn tiền các đơn đã có."
                : "Store được hoạt động lại. Trạng thái bán và kiểm duyệt từng sản phẩm được giữ nguyên."}
          </p>
          {kind === "users" &&
            selected.entry.id === session?.context?.user_id &&
            selected.next === "LOCKED" && (
              <p role="note">
                Đây là tài khoản đang dùng. Khóa sẽ khiến bạn không thể tiếp tục
                phiên quản trị này.
              </p>
            )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label>
              Lý do quyết định
              <textarea
                required
                maxLength={200}
                value={reason}
                disabled={busy || blocked}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {readback && <p role="status">{readback}</p>}
            {decisionError !== undefined && <ErrorView error={decisionError} />}
            {blocked && (
              <p>
                Chưa được gửi lại. Đọc lại đúng đối tượng để đối chiếu trạng
                thái trước khi tiếp tục.
              </p>
            )}
            <div className="market-return-actions">
              <button disabled={busy} type="button" onClick={close}>
                Hủy
              </button>
              {blocked ? (
                <button
                  disabled={busy}
                  type="button"
                  onClick={() => void reconcile()}
                >
                  Làm mới
                </button>
              ) : (
                <button disabled={busy || !reason.trim()}>
                  {busy
                    ? "Đang xử lý…"
                    : "Xác nhận " +
                      (selected.next === "LOCKED" ? "khóa" : "mở khóa")}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
