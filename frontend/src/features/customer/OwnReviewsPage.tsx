import { Modal } from "../../components/Modal";
import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ApiError } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  Empty,
  ErrorView,
  Loading,
  Pagination,
} from "../../bootstrap/components";
import {
  LatestSavedReview,
  readOwnedReview,
  reviewMatches,
} from "./owned-review";
import { CustomerSubNav } from "./CustomerSubNav";
import { StarPicker, StarRating } from "../../components/StarRating";
type Review = OperationOutputs["listOwnReviews"]["items"][number];
export function OwnReviewsPage() {
  const [params] = useSearchParams(),
    product = params.get("product_id") ?? undefined,
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<Review>(),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["own-reviews", product, page],
    queryFn: () =>
      callOperation("listOwnReviews", {
        query: { page, size: 20, ...(product ? { product_id: product } : {}) },
      }),
  });
  async function refresh() {
    await cache.invalidateQueries(
      { queryKey: ["own-reviews"] },
      { throwOnError: true },
    );
  }
  return (
    <section>
      <CustomerSubNav />
      <h1>Đánh giá của tôi</h1>
      <p>
        Có thể tìm và sửa nội dung đã viết kể cả khi bị ẩn hoặc sản phẩm dừng
        bán. Sửa nội dung giữ nguyên quyết định kiểm duyệt.
      </p>
      {product && (
        <Link to="/customer/reviews">Xem tất cả đánh giá của tôi</Link>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data?.items.length && (
            <Empty>Chưa có đánh giá trong phạm vi này.</Empty>
          )}
          {query.data?.items.map((review) => (
            <article className="boot-card" key={review.id}>
              <h2>{review.product_title ?? "Đánh giá mục hàng đã mua"}</h2>
              <p>
                <StarRating rating={review.rating} /> ·{" "}
                {review.status === "HIDDEN"
                  ? "Đang bị ẩn; sửa không tự công khai lại"
                  : "Đang hiển thị"}
              </p>
              <p>{review.body}</p>
              <Link to={"/products/" + review.product_id}>
                Xem sản phẩm hiện tại
              </Link>{" "}
              <button disabled={!review.id} onClick={() => setEditing(review)}>
                Sửa đánh giá
              </button>
            </article>
          ))}
          {query.data && (
            <Pagination
              page={page}
              size={query.data.size}
              total={query.data.total}
              onPage={setPage}
            />
          )}
        </>
      )}
      {editing && (
        <Editor
          key={editing.id + ":" + editing.version}
          review={editing}
          close={() => setEditing(undefined)}
          saved={async () => {
            await refresh();
            await cache.invalidateQueries({ queryKey: ["product-reviews"] });
            setEditing(undefined);
          }}
        />
      )}
    </section>
  );
}
function Editor({
  review,
  close,
  saved,
}: {
  review: Review;
  close: () => void;
  saved: () => Promise<void>;
}) {
  const [rating, setRating] = useState(review.rating),
    [body, setBody] = useState(review.body ?? ""),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState<unknown>(),
    [version, setVersion] = useState(review.version),
    [notice, setNotice] = useState("");
  const flight = useRef(false),
    [latestSaved, setLatestSaved] = useState<Review>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (flight.current || blocked) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await callOperation("updateReview", {
        path: { id: review.id! },
        body: { expected_version: version!, rating, body },
      });
      setNotice("Đã lưu nội dung; quyết định kiểm duyệt được giữ nguyên.");
      await saved();
    } catch (e) {
      setError(e);
      setBlocked(true);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function reconcile() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const current = await readOwnedReview(
        review.order_item_id,
        review.product_id,
        review.id,
      );
      if (!current)
        throw new ApiError(
          404,
          "NOT_FOUND",
          "Không tìm thấy đánh giá thuộc phiên hiện tại.",
        );
      if (reviewMatches(current, rating, body)) {
        setNotice(
          "Đã đối chiếu đúng nội dung đã lưu. Không gửi lại thao tác sửa.",
        );
        await saved();
      } else {
        setLatestSaved(current);
        setVersion(current.version);
        setNotice(
          "Đã đọc bản mới. Bản nháp được giữ; kiểm tra nội dung đã lưu rồi bấm lưu nếu muốn thay đổi.",
        );
        setBlocked(false);
      }
    } catch (e) {
      setError(e);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal label="Sửa đánh giá" busy={busy || blocked} onClose={close}>
      <form
        className="boot-card"
        onSubmit={submit}
        aria-label="Sửa đánh giá sở hữu"
      >
        <h2>Sửa đánh giá</h2>
        <p>{review.product_title ?? "Mục hàng đã mua"}</p>
        {latestSaved && <LatestSavedReview review={latestSaved} />}
        <p>
          {review.status === "HIDDEN"
            ? "Đánh giá vẫn bị ẩn sau khi lưu."
            : "Kiểm tra nội dung trước khi lưu."}
        </p>
        <StarPicker
          value={rating}
          disabled={busy || blocked}
          onChange={setRating}
        />
        <label>
          Nội dung đánh giá
          <textarea
            maxLength={10000}
            required
            disabled={busy || blocked}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <button disabled={busy || blocked || version === undefined}>
          Lưu đánh giá
        </button>{" "}
        <button type="button" disabled={busy} onClick={close}>
          Hủy sửa
        </button>
        {error != null && <ErrorView error={error} />}{" "}
        {blocked && (
          <>
            <p>
              Chưa thể tiếp tục từ phiên bản cũ. Đọc lại trạng thái, giữ bản
              nháp và không tự gửi lại.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void reconcile()}
            >
              Đối chiếu đánh giá đã lưu
            </button>
          </>
        )}
        {notice && <p role="status">{notice}</p>}
      </form>
    </Modal>
  );
}
