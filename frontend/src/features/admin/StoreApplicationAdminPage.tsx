import { Button as UiButton } from "../../components/ui/Button";
import { useConfirm } from "../../components/ConfirmDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RouteObject } from "react-router-dom";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Eye, X } from "lucide-react";
import {
  ProtectedRoute,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import {
  listStoreApplications,
  reviewStoreApplication,
} from "../../api/store-applications";
import { dataMode } from "../../api/operations";
import type {
  PageStoreApplications,
  StoreApplication,
} from "../../api/store-application.mock";
import { ApiError, isUncertainMutation } from "../../api/client";
import { Modal } from "../../components/Modal";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const labels: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`store-app-status store-app-status--${status.toLowerCase()}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function ReviewDialog({
  app,
  decision,
  busy,
  error,
  blocked,
  onReload,
  onCancel,
  onConfirm,
}: {
  error?: unknown;
  blocked: boolean;
  onReload: () => void;
  app: StoreApplication;
  decision: "APPROVED" | "REJECTED";
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const { confirm, dialog } = useConfirm();
  const [reason, setReason] = useState("");
  const release = useUnsavedChanges(!!reason.trim() || busy || blocked);
  const cancel = async () => {
    if (busy || blocked) return;
    if (
      reason.trim() &&
      !(await confirm({
        title: "Bỏ lý do chưa gửi?",
        description:
          "Lý do từ chối chưa được lưu. Bạn có muốn bỏ bản nháp và đóng hồ sơ?",
        confirmLabel: "Bỏ bản nháp",
      }))
    )
      return;
    release();
    onCancel();
  };
  const approve = decision === "APPROVED";
  return (
    <>
      {dialog}
      <Modal labelledBy="review-title" onClose={cancel} busy={busy}>
        <section className="store-app-dialog">
          <button
            className="store-app-dialog-close"
            type="button"
            aria-label="Đóng"
            onClick={cancel}
            disabled={busy || blocked}
          >
            <X size={18} />
          </button>
          <p className="store-app-eyebrow">KIỂM TRA HỒ SƠ</p>
          <h2 id="review-title">
            {approve ? "Duyệt hồ sơ cửa hàng?" : "Từ chối hồ sơ cửa hàng?"}
          </h2>
          <p>
            {approve
              ? "Tạo Store và cấp quyền chủ Store cho đúng người nộp hồ sơ bên dưới. Thao tác không mở khóa tài khoản đang bị khóa."
              : "Từ chối hồ sơ và gửi lý do để người nộp có thể khắc phục, gửi lại."}
          </p>
          <dl>
            <dt>Gian hàng đề nghị</dt>
            <dd>{app.proposed_name}</dd>
            <dt>Người nộp</dt>
            <dd>
              {app.applicant_display_name ?? "Chưa có tên trong hồ sơ"} ·{" "}
              {app.applicant_email ?? app.contact}
            </dd>
            <dt>Tài khoản</dt>
            <dd>
              {app.applicant_user_id ?? "Dữ liệu cũ chưa có mã tài khoản"} ·{" "}
              {app.applicant_status ?? "Chưa rõ trạng thái"}
            </dd>
            <dt>Mã hồ sơ</dt>
            <dd>{app.id}</dd>
            <dt>Trạng thái / phiên bản</dt>
            <dd>
              {labels[app.status ?? ""] ?? app.status} ·{" "}
              {app.version ?? "Chưa có"}
            </dd>
          </dl>
          {error != null && <ErrorView error={error} />}
          {blocked && (
            <>
              <p role="status">
                Dữ liệu hoặc kết quả đã thay đổi. Đọc lại đúng hồ sơ trước khi
                quyết định tiếp; không gửi lại từ phiên bản cũ.
              </p>
              <button type="button" disabled={busy} onClick={onReload}>
                Đọc lại hồ sơ này
              </button>
            </>
          )}

          {!approve && (
            <label>
              Lý do từ chối <span aria-hidden="true">*</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy || blocked}
                required
                maxLength={200}
                rows={4}
                placeholder="Nêu rõ thông tin cần bổ sung…"
              />
            </label>
          )}
          <div className="store-app-dialog-actions">
            <UiButton
              type="button"
              variant="secondary"
              onClick={cancel}
              disabled={busy || blocked}
            >
              Quay lại
            </UiButton>
            <UiButton
              type="button"
              variant={approve ? "primary" : "danger"}
              disabled={
                busy ||
                blocked ||
                app.version === undefined ||
                (!approve && !reason.trim())
              }
              onClick={() => onConfirm(reason.trim() || undefined)}
            >
              {busy
                ? "Đang cập nhật…"
                : approve
                  ? "Xác nhận duyệt"
                  : "Xác nhận từ chối"}
            </UiButton>
          </div>
        </section>
      </Modal>
    </>
  );
}

function AdminStoreApplicationPage() {
  const [data, setData] = useState<PageStoreApplications>();
  const [params, setParams] = useSearchParams(),
    generation = useRef(0);
  const rawPage = Number(params.get("page")),
    page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1;
  const status = params.get("status"),
    filter: Filter =
      status === "PENDING" || status === "APPROVED" || status === "REJECTED"
        ? status
        : "ALL",
    q = params.get("q") ?? "";
  const setPage = (value: number) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });
  const setFilter = (value: Filter) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("page");
      if (value === "ALL") next.delete("status");
      else next.set("status", value);
      return next;
    });
  const setSearch = (value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("page");
        if (value) next.set("q", value);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  const [reviewBlocked, setReviewBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const decisionInFlight = useRef(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<StoreApplication>();
  const [review, setReview] = useState<{
    app: StoreApplication;
    decision: "APPROVED" | "REJECTED";
  }>();
  const load = useCallback(
    async (requestedPage: number) => {
      const epoch = ++generation.current;
      setLoading(true);
      setError(undefined);
      setData(undefined);
      try {
        const value = await listStoreApplications(
          requestedPage,
          10,
          filter === "ALL" ? undefined : filter,
          q,
        );
        if (epoch !== generation.current) return;
        setData(value);
        const last = Math.max(1, Math.ceil(value.total / value.size));
        if (requestedPage > last) setPage(last);
      } catch (cause) {
        if (epoch === generation.current) setError(cause);
      } finally {
        if (epoch === generation.current) setLoading(false);
      }
    },
    [filter, q],
  );
  useEffect(() => {
    void load(page);
    return () => {
      generation.current++;
    };
  }, [load, page]);
  useEffect(() => setReviewBlocked(false), [review?.app.id, review?.decision]);
  const counts = data?.status_counts ?? {
    ALL: filter === "ALL" ? data?.total : undefined,
    PENDING: undefined,
    APPROVED: undefined,
    REJECTED: undefined,
  };
  const visibleItems = data?.items ?? [];
  async function reloadReview() {
    if (!review || decisionInFlight.current) return;
    decisionInFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await listStoreApplications(
        1,
        10,
        undefined,
        review.app.id,
      );
      const fresh = result.items.find((app) => app.id === review.app.id);
      if (!fresh)
        throw new Error(
          "Chưa đọc được đúng hồ sơ. Giữ quyết định dừng và đọc lại trước khi tiếp tục.",
        );
      if (fresh.status !== "PENDING") {
        setReview(undefined);
        setNotice(
          "Hồ sơ đã được xử lý: " +
            (labels[fresh.status ?? ""] ?? fresh.status),
        );
        await load(page);
      } else {
        setReview({ ...review, app: fresh });
        setReviewBlocked(false);
      }
    } catch (cause) {
      setError(cause);
    } finally {
      decisionInFlight.current = false;
      setBusy(false);
    }
  }
  const submitReview = async (reason?: string) => {
    if (!review || decisionInFlight.current || reviewBlocked) return;
    decisionInFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      if (!review.app.id || review.app.version === undefined)
        throw new Error(
          "Thiếu mã hoặc phiên bản hồ sơ. Đọc lại trước khi quyết định.",
        );
      await reviewStoreApplication(review.app.id, {
        status: review.decision,
        expected_version: review.app.version,
        ...(review.decision === "REJECTED" && reason
          ? { decision_reason: reason }
          : {}),
      });
      setNotice(
        dataMode === "fixture"
          ? `Updated fixture ${review.app.proposed_name}. No real Store or membership was created.`
          : (review.decision === "APPROVED"
              ? "Đã duyệt hồ sơ "
              : "Đã từ chối hồ sơ ") +
              review.app.proposed_name +
              ".",
      );
      setReview(undefined);
      setSelected(undefined);
      await load(page);
    } catch (cause) {
      if (
        isUncertainMutation(cause) ||
        (cause instanceof ApiError && cause.status === 409)
      )
        setReviewBlocked(true);
      setError(cause);
    } finally {
      decisionInFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="store-app-page store-app-admin-page">
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <Link
          to="/admin"
          style={{
            color: "#2563eb",
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          &larr; Quay lại Admin Dashboard
        </Link>
        <span style={{ color: "#cbd5e1" }}>|</span>
        <Link to="/" style={{ color: "#64748b", textDecoration: "underline" }}>
          Trang chủ Sàn
        </Link>
      </div>
      <header className="store-app-page-heading">
        <p className="store-app-eyebrow">QUẢN TRỊ · NHÀ BÁN HÀNG</p>
        <h1>Hồ sơ đăng ký cửa hàng</h1>
        <p>Xem thông tin và xử lý hồ sơ đang chờ xét duyệt.</p>
      </header>
      <div className="store-app-demo-banner">
        <strong>{dataMode === "fixture" ? "FIXTURE" : "API"}</strong>
        <span>
          {dataMode === "fixture"
            ? "Browser fixture data only; mock approvals do not create persisted Stores or memberships."
            : "Data and decisions use the server API. API errors are shown without fixture fallback."}
        </span>
      </div>
      {notice && (
        <p className="store-app-notice" role="status">
          {notice}
        </p>
      )}
      {error !== undefined && (
        <ErrorView
          error={error}
          onRetry={() => void load(page)}
          retryBusy={loading || busy}
        />
      )}
      <label>
        Tìm hồ sơ theo Store, người nộp hoặc mã hồ sơ
        <input
          type="search"
          maxLength={200}
          value={q}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div
        className="store-app-filter-list"
        role="group"
        aria-label="Lọc hồ sơ theo trạng thái"
      >
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as Filter[]).map(
          (value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "is-active" : ""}
              onClick={() => setFilter(value)}
            >
              {value === "ALL" ? "Tất cả" : labels[value]}
              <span>{counts[value] ?? "—"}</span>
            </button>
          ),
        )}
      </div>
      <section className="boot-card store-app-card">
        <div className="store-app-card-heading">
          <div>
            <p className="store-app-eyebrow">DANH SÁCH HỒ SƠ</p>
            <h2>{filter === "ALL" ? "Tất cả hồ sơ" : labels[filter]}</h2>
          </div>
          <UiButton
            variant="secondary"
            type="button"
            onClick={() => void load(page)}
            disabled={loading}
          >
            Làm mới
          </UiButton>
        </div>
        {loading ? (
          <Loading />
        ) : !error && visibleItems.length === 0 ? (
          <div className="store-app-empty">
            <strong>Không có hồ sơ phù hợp</strong>
            <p>Hồ sơ ở trạng thái này sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          !error && (
            <>
              <div className="store-app-table-wrap">
                <table className="store-app-table">
                  <thead>
                    <tr>
                      <th>Cửa hàng</th>
                      <th>Liên hệ</th>
                      <th>Trạng thái</th>
                      <th>Lý do từ chối</th>
                      <th>Chi tiết / thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((app) => (
                      <tr key={app.id}>
                        <td data-label="Cửa hàng">
                          <strong>{app.proposed_name}</strong>
                          <small className="store-app-id">{app.id}</small>
                        </td>
                        <td data-label="Liên hệ">{app.contact}</td>
                        <td data-label="Trạng thái">
                          <StatusBadge status={app.status ?? "PENDING"} />
                        </td>
                        <td data-label="Lý do">{app.decision_reason || "—"}</td>
                        <td data-label="Thao tác">
                          <div className="store-app-row-actions">
                            <button
                              type="button"
                              className="store-app-icon-button"
                              onClick={() => setSelected(app)}
                              aria-label={`Xem hồ sơ ${app.proposed_name}`}
                            >
                              <Eye size={17} /> Chi tiết
                            </button>
                            {app.status === "PENDING" && (
                              <>
                                <div className="ui-actions">
                                  <button
                                    type="button"
                                    className="store-app-icon-button store-app-icon-button--approve"
                                    onClick={() =>
                                      setReview({ app, decision: "APPROVED" })
                                    }
                                    disabled={busy}
                                  >
                                    <Check size={16} /> Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    className="store-app-icon-button store-app-icon-button--reject"
                                    onClick={() =>
                                      setReview({ app, decision: "REJECTED" })
                                    }
                                    disabled={busy}
                                  >
                                    <X size={16} /> Từ chối
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}
        {data && !loading && (
          <Pagination
            page={data.page}
            size={data.size}
            total={data.total}
            onPage={setPage}
          />
        )}
      </section>
      {selected && (
        <Modal labelledBy="detail-title" onClose={() => setSelected(undefined)}>
          <section className="store-app-dialog">
            <button
              className="store-app-dialog-close"
              type="button"
              aria-label="Đóng"
              onClick={() => setSelected(undefined)}
            >
              <X size={18} />
            </button>
            <p className="store-app-eyebrow">
              CHI TIẾT HỒ SƠ · {dataMode === "fixture" ? "FIXTURE" : "API"}
            </p>
            <h2 id="detail-title">{selected.proposed_name}</h2>
            <dl className="store-app-detail-list">
              <div>
                <dt>Liên hệ</dt>
                <dd>{selected.contact}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <StatusBadge status={selected.status ?? "PENDING"} />
                </dd>
              </div>
              <div>
                <dt>Lý do từ chối</dt>
                <dd>{selected.decision_reason || "—"}</dd>
              </div>
              <div>
                <dt>Mã hồ sơ</dt>
                <dd>
                  <code>{selected.id}</code>
                </dd>
              </div>
              <div>
                <dt>Phiên bản</dt>
                <dd>{selected.version ?? 0}</dd>
              </div>
            </dl>
            <div className="store-app-dialog-actions">
              <UiButton
                type="button"
                variant="secondary"
                onClick={() => setSelected(undefined)}
              >
                Đóng
              </UiButton>
              {selected.status === "PENDING" && (
                <>
                  <div className="ui-actions">
                    <UiButton
                      type="button"
                      variant="primary"
                      onClick={() => {
                        setReview({ app: selected, decision: "APPROVED" });
                        setSelected(undefined);
                      }}
                    >
                      Duyệt hồ sơ
                    </UiButton>
                    <UiButton
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setReview({ app: selected, decision: "REJECTED" });
                        setSelected(undefined);
                      }}
                    >
                      Từ chối
                    </UiButton>
                  </div>
                </>
              )}
            </div>
          </section>
        </Modal>
      )}
      {review && (
        <ReviewDialog
          app={review.app}
          decision={review.decision}
          busy={busy}
          error={error}
          blocked={reviewBlocked}
          onReload={() => void reloadReview()}
          onCancel={() => setReview(undefined)}
          onConfirm={(reason) => void submitReview(reason)}
        />
      )}
    </section>
  );
}

export const storeApplicationAdminRoutes: RouteObject[] = [
  {
    path: "/admin/store-applications",
    element: (
      <ProtectedRoute roles={["ADMIN"]}>
        <AdminStoreApplicationPage />
      </ProtectedRoute>
    ),
  },
];
