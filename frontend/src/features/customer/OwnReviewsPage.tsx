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
import { Star, MessageSquare } from "lucide-react";

type Review = OperationOutputs["listOwnReviews"]["items"][number];

export function OwnReviewsPage() {
  const [params] = useSearchParams(),
    product = params.get("product_id") ?? undefined,
    [tab, setTab] = useState<"REVIEWED" | "PENDING">("REVIEWED"),
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

  const pendingOrdersQuery = useQuery({
    queryKey: ["own-orders-completed-for-reviews"],
    enabled: tab === "PENDING",
    queryFn: () =>
      callOperation("listOwnOrders", {
        query: { status: "COMPLETED", size: 20 },
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 m-0">Đánh giá của tôi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem lại các sản phẩm bạn đã nhận xét và đánh giá các đơn hàng vừa nhận
          </p>
        </div>
      </div>

      {/* Shopee-style 2-Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
        <button
          type="button"
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all ${
            tab === "REVIEWED"
              ? "border-[#ee4d2d] text-[#ee4d2d]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setTab("REVIEWED")}
        >
          Đã đánh giá ({query.data?.total ?? 0})
        </button>
        <button
          type="button"
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-all ${
            tab === "PENDING"
              ? "border-[#ee4d2d] text-[#ee4d2d]"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setTab("PENDING")}
        >
          Chưa đánh giá
        </button>
      </div>

      {tab === "REVIEWED" && (
        <>
          {product && (
            <div className="mb-3">
              <Link to="/customer/reviews" className="text-xs text-indigo-600 hover:underline">
                ← Xem tất cả đánh giá của tôi
              </Link>
            </div>
          )}
          {query.isPending ? (
            <Loading />
          ) : query.error ? (
            <ErrorView error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <>
              {!query.data?.items.length && (
                <Empty>Chưa có đánh giá nào được gửi.</Empty>
              )}
              <div className="space-y-4">
                {query.data?.items.map((review) => (
                  <article className="boot-card p-4 sm:p-5 bg-white border border-slate-200 rounded-lg shadow-sm" key={review.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 mb-3">
                      <h2 className="text-sm font-semibold text-slate-900 m-0">
                        {review.product_title ?? "Đánh giá mục hàng đã mua"}
                      </h2>
                      <span className="text-xs text-slate-400">
                        {review.status === "HIDDEN" ? "Đang bị ẩn" : "Công khai"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={review.rating} />
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed my-2">
                      {review.body}
                    </p>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                      <Link to={"/products/" + review.product_id} className="text-indigo-600 hover:underline">
                        Xem sản phẩm hiện tại
                      </Link>
                      <button
                        type="button"
                        className="text-xs text-[#ee4d2d] hover:underline font-medium"
                        disabled={!review.id}
                        onClick={() => setEditing(review)}
                      >
                        Sửa đánh giá
                      </button>
                    </div>
                  </article>
                ))}
              </div>
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
        </>
      )}

      {tab === "PENDING" && (
        <>
          {pendingOrdersQuery.isPending ? (
            <Loading />
          ) : pendingOrdersQuery.error ? (
            <ErrorView error={pendingOrdersQuery.error} onRetry={() => void pendingOrdersQuery.refetch()} />
          ) : (
            <div className="space-y-3">
              {!pendingOrdersQuery.data?.items.length ? (
                <Empty>Bạn chưa có đơn hàng hoàn tất nào cần đánh giá.</Empty>
              ) : (
                pendingOrdersQuery.data.items.map((order) => (
                  <div key={order.id} className="p-4 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-mono font-medium text-slate-500">
                        Đơn #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <p className="text-sm font-medium text-slate-800 mt-1">
                        {order.items?.length ?? 1} sản phẩm đã giao thành công
                      </p>
                    </div>
                    <Link
                      to={`/customer/orders/${order.id}`}
                      className="ui-button ui-button-primary order-btn-highlight text-xs"
                    >
                      Đánh giá ngay
                    </Link>
                  </div>
                ))
              )}
            </div>
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
              Kiểm tra
            </button>
          </>
        )}
        {notice && <p role="status">{notice}</p>}
      </form>
    </Modal>
  );
}
