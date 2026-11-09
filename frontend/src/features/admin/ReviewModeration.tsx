import {Button as UiButton} from '../../components/ui/Button';
import { StarRating } from "../../components/StarRating";
import { Modal } from "../../components/Modal";
import { useConfirm } from "../../components/ConfirmDialog";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ApiError, isUncertainMutation } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  ErrorView,
  Loading,
  Pagination,
  Empty,
} from "../../bootstrap/components";
type Review = OperationOutputs["listAdminReviews"]["items"][number];
export function ReviewModeration() {
  const [status, setStatus] = useState<"" | "VISIBLE" | "HIDDEN">(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const query = useQuery({
    queryKey: ["admin-reviews", status, page],
    refetchOnWindowFocus: false,
    queryFn: () =>
      callOperation("listAdminReviews", {
        query: { page, size: 20, ...(status ? { status } : {}) },
      }),
  });
  async function reload() {
    const result = await query.refetch();
    if (result.error) throw result.error;
    setRevision((n) => n + 1);
  }
  return (
    <section
      id="moderation-reviews"
      className="admin-moderation"
      aria-label="Kiểm duyệt đánh giá"
    >
      <h3>Kiểm duyệt đánh giá</h3>
      <label>
        Trạng thái đánh giá
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="VISIBLE">Đang hiển thị</option>
          <option value="HIDDEN">Đã ẩn</option>
        </select>
      </label>
      {query.isLoading && <Loading />}
      {query.error && (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      )}
      {query.data && (
        <>
          {!query.data.items.length && (
            <Empty>Không có đánh giá trong bộ lọc này.</Empty>
          )}
          {query.data.items.map((review) => (
            <Moderate
              key={review.id + ":" + review.version + ":" + revision}
              review={review}
              reload={reload}
            />
          ))}
          <Pagination
            page={page}
            size={query.data.size}
            total={query.data.total}
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}
function Moderate({
  review,
  reload,
}: {
  review: Review;
  reload: () => Promise<void>;
}) {
  const [decisionOpen, setDecisionOpen] = useState(false);
  const { confirm, dialog } = useConfirm();
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState<unknown>();
  useUnsavedChanges(decisionOpen && (!!reason.trim() || busy || blocked));
  async function closeDecision() {
    if (busy || blocked) return;
    if (
      reason.trim() &&
      !(await confirm({
        title: "Bỏ lý do chưa gửi?",
        description:
          "Nội dung chưa lưu sẽ bị bỏ. Chưa có quyết định kiểm duyệt nào được gửi.",
        confirmLabel: "Bỏ bản nháp",
      }))
    )
      return;
    setReason("");
    setError(undefined);
    setDecisionOpen(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || blocked || !reason.trim()) return;
    setBusy(true);
    setError(undefined);
    const input = {
      path: { id: review.id },
      body: { expected_version: review.version, reason: reason.trim() },
    };
    try {
      if (review.status === "HIDDEN")
        await callOperation("restoreReview", input);
      else await callOperation("hideReview", input);
      await reload();
    } catch (e) {
      setError(e);
      if (isUncertainMutation(e) || (e instanceof ApiError && e.status === 409))
        setBlocked(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="boot-card">
      <p>
        <StarRating rating={review.rating} /> ·{" "}
        {review.status === "HIDDEN" ? "Đã ẩn" : "Đang hiển thị"}
      </p>
      <p>{review.body || "Không có nội dung chữ."}</p>
      <Link
        to={"/products/" + review.product_id}
        target="_blank"
        rel="noopener noreferrer"
      >
        Xem sản phẩm <span className="sr-only">(mở tab mới)</span>
      </Link>
      {dialog}
      <form onSubmit={submit} className="review-moderation-form" style={{ marginTop: '10px' }}>
        <label>
          Lý do kiểm duyệt
          <textarea
            aria-label="Lý do kiểm duyệt"
            required
            maxLength={200}
            disabled={busy || blocked}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button disabled={busy || blocked || !reason.trim()}>
            {busy
              ? "Đang lưu…"
              : review.status === "HIDDEN"
                ? "Hiện lại đánh giá"
                : "Ẩn đánh giá"}
          </button>
          {blocked && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void reload()}
            >
              Đọc lại phiên bản mới nhất
            </button>
          )}
        </div>
      </form>
      {error !== undefined && <ErrorView error={error} />}
    </article>
  );
}
