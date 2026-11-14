import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../api/auth-context";
import { callOperation } from "../../api/operations";
import type { OperationOutputs } from "../../api/operations.generated";
import { ApiError, isUncertainMutation } from "../../api/client";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import { StarPicker, StarRating } from "../../components/StarRating";
import {
  LatestSavedReview,
  readOwnedReview,
  reviewMatches,
  reviewItemLabel,
} from "./owned-review";
type Review = OperationOutputs["createReview"];
type ReviewItem = { id: string; label: string };
type ReviewAttempt = {
  orderItemId: string;
  rating: number;
  body: string;
  reviewId?: string;
  version?: number;
};
export function ProductReviews({ productId }: { productId: string }) {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const requestedOrder = params.get("review_order") ?? undefined;
  const requestedItem = params.get("review_item") ?? undefined;
  const userId = session?.context?.roles.includes("CUSTOMER")
    ? session.context.user_id
    : undefined;
  return (
    <ReviewsInner
      key={[productId, userId, requestedOrder, requestedItem].join(":")}
      productId={productId}
      userId={userId}
      requestedOrder={requestedOrder}
      requestedItem={requestedItem}
    />
  );
}
function ReviewsInner({
  productId,
  userId,
  requestedOrder,
  requestedItem,
}: {
  productId: string;
  userId?: string;
  requestedOrder?: string;
  requestedItem?: string;
}) {
  const [filterRating, setFilterRating] = useState(""),
    [sort, setSort] = useState<"newest" | "rating_desc" | "rating_asc">(
      "newest",
    );
  const [page, setPage] = useState(1),
    [reload, setReload] = useState(0),
    [ordersReload, setOrdersReload] = useState(0);
  const [reviews, setReviews] =
      useState<OperationOutputs["listProductReviews"]>(),
    [eligible, setEligible] = useState<ReviewItem[]>();
  const [reviewedItems, setReviewedItems] = useState<Set<string>>();
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<unknown>(),
    [orderError, setOrderError] = useState<unknown>();
  const [itemId, setItemId] = useState(""),
    [rating, setRating] = useState(5),
    [body, setBody] = useState("");
  const [editing, setEditing] = useState<Review>(),
    [saved, setSaved] = useState<Review>();
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState<ReviewAttempt>(),
    [retryCreate, setRetryCreate] = useState(false),
    [latestSaved, setLatestSaved] = useState<Review>();
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const flight = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    callOperation("listProductReviews", {
      path: { id: productId },
      query: {
        page,
        size: 20,
        sort,
        ...(filterRating ? { rating: Number(filterRating) } : {}),
      },
    })
      .then((value) => {
        if (active) setReviews(value);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, page, reload, sort, filterRating]);
  useEffect(() => {
    if (!userId || !requestedOrder) return;
    let active = true;
    setOrderError(undefined);
    setEligible(undefined);
    setReviewedItems(undefined);
    const lookup = callOperation("getOwnOrder", { path: { id: requestedOrder } }).then((order) => [order]);
    lookup
      .then(async (orders) => {
        if (!active) return;
        const items = orders
          .filter((order) => order.status === "COMPLETED")
          .flatMap((order) => (order.items ?? [])
            .filter((item) => item.product_id === productId && typeof item.id === "string")
            .map((item) => ({ id: String(item.id), label: reviewItemLabel(order.id, item) })));
        setEligible(items);
        const reviewed = new Set<string>();
        if (items.length) {
          const candidates = new Set(items.map((item) => item.id));
          for (let page = 1; active; page++) {
            const result = await callOperation("listOwnReviews", { query: { product_id: productId, page, size: 100 } });
            for (const review of result.items) {
              if (candidates.has(review.order_item_id)) reviewed.add(review.order_item_id);
            }
            if (reviewed.size === candidates.size || !result.items.length || page * result.size >= result.total) break;
          }
        }
        if (active) setReviewedItems(reviewed);
      })
      .catch((e) => {
        if (active) setOrderError(e);
      });
    return () => {
      active = false;
    };
  }, [userId, productId, requestedOrder, ordersReload]);
  const owned = new Set(eligible?.map((item) => item.id));
  const reviewed = new Set(reviewedItems);
  reviews?.items.forEach((review) => reviewed.add(review.order_item_id));
  if (saved) reviewed.add(saved.order_item_id);
  const availableItems = reviewedItems ? eligible?.filter((item) => !reviewed.has(item.id)) ?? [] : [];
  const showForm = !!editing || !!attempt || (!!requestedOrder && availableItems.length > 0);
  const selectedItem = itemId || (availableItems.some((item) => item.id === requestedItem) ? requestedItem! : "");
  const edit = (review: Review) => {
    if (!owned.has(review.order_item_id) || loading || attempt) return;
    setBlocked(false);
    setLatestSaved(undefined);
    setEditing(review);
    setItemId(review.order_item_id);
    setRating(review.rating);
    setBody(review.body ?? "");
    setNotice("");
  };
  const write = async (current: ReviewAttempt) => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    setNotice("");
    try {
      const value = current.reviewId
        ? await callOperation("updateReview", {
            path: { id: current.reviewId },
            body: {
              rating: current.rating,
              body: current.body,
              expected_version: current.version!,
            },
          })
        : await callOperation("createReview", {
            body: {
              order_item_id: current.orderItemId,
              rating: current.rating,
              body: current.body,
            },
          });
      setSaved(value);
      setEditing(value);
      setAttempt(undefined);
      setBlocked(false);
      setRetryCreate(false);
      setLatestSaved(undefined);
      setNotice("Đã gửi đánh giá thành công.");
      setReload((n) => n + 1);
    } catch (e) {
      setError(e);
      if (
        isUncertainMutation(e) ||
        (e instanceof ApiError && e.status === 409)
      ) {
        setAttempt(current);
        setBlocked(true);
        setRetryCreate(false);
      }
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (flight.current || blocked || !owned.has(selectedItem) || (!editing && reviewed.has(selectedItem))) return;
    if (editing && editing.version === undefined) {
      setError(
        new ApiError(
          503,
          "REVIEW_VERSION_MISSING",
          "Chưa có phiên bản đánh giá để sửa. Hãy tải lại.",
        ),
      );
      return;
    }
    await write({
      orderItemId: selectedItem,
      rating,
      body,
      ...(editing ? { reviewId: editing.id, version: editing.version } : {}),
    });
  };
  async function reconcile() {
    if (!attempt || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    setRetryCreate(false);
    try {
      const current = await readOwnedReview(
        attempt.orderItemId,
        productId,
        attempt.reviewId,
      );
      if (!current) {
        setNotice(
          "Chưa ghi nhận đánh giá của mục này. Bạn có thể kiểm tra lại hoặc thử gửi lại.",
        );
        setRetryCreate(!attempt.reviewId);
        return;
      }
      setSaved(current);
      setEditing(current);
      setItemId(current.order_item_id);
      setBlocked(false);
      setAttempt(undefined);
      if (reviewMatches(current, attempt.rating, attempt.body)) {
        setLatestSaved(undefined);
        setNotice(
          "Đánh giá đã được lưu chính xác. Cảm ơn bạn!",
        );
        setReload((n) => n + 1);
      } else {
        setLatestSaved(current);
        setNotice(
          "Nội dung đánh giá mới nhất đã được cập nhật.",
        );
      }
    } catch (e) {
      setError(e);
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <section id="reviews" className="boot-card">
      <h3>Đánh giá sản phẩm</h3>
      {(!!reviews?.total || !!filterRating) && <div className="ui-actions">
        <label>
          Lọc số sao
          <select
            aria-label="Lọc số sao"
            value={filterRating}
            onChange={(e) => {
              setFilterRating(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả số sao</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} sao
              </option>
            ))}
          </select>
        </label>
        <label>
          Sắp xếp đánh giá
          <select
            aria-label="Sắp xếp đánh giá"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setPage(1);
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="rating_desc">Điểm cao nhất</option>
            <option value="rating_asc">Điểm thấp nhất</option>
          </select>
        </label>
      </div>}
      {error !== undefined && (
        <ErrorView error={error} onRetry={() => setReload((n) => n + 1)} />
      )}
      {blocked && (
        <>
          <p>
            Đang có thay đổi chưa đồng bộ. Vui lòng bấm kiểm tra hoặc thử lại để hoàn tất.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reconcile()}
          >
            Kiểm tra
          </button>
          {retryCreate && attempt && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void write(attempt)}
            >
              Thử lại
            </button>
          )}
        </>
      )}
      {latestSaved && <LatestSavedReview review={latestSaved} />}
      {loading ? (
        <Loading />
      ) : (
        reviews && (
          <>
            {!reviews.items.length && (
              <p>{filterRating ? "Không có đánh giá phù hợp." : "Chưa có đánh giá"}</p>
            )}
            {reviews.items.map((review) => (
              <article
                className="boot-card"
                key={review.id ?? review.order_item_id}
              >
                <strong>
                  <StarRating rating={review.rating} />
                </strong>
                <p>{review.body}</p>
                {review.id && owned.has(review.order_item_id) && (
                  <button
                    disabled={busy || loading || !!attempt}
                    onClick={() => edit(review)}
                  >
                    Sửa đánh giá
                  </button>
                )}
              </article>
            ))}
            {reviews.total > reviews.size && <Pagination
              page={page}
              size={reviews.size}
              total={reviews.total}
              onPage={setPage}
            />}
          </>
        )
      )}
      {!userId ? (
        <Link to="/login">Đăng nhập để viết đánh giá sau mua hàng</Link>
      ) : (
        <>
          {orderError !== undefined && (
            <ErrorView
              error={orderError}
              onRetry={() => setOrdersReload((n) => n + 1)}
            />
          )}
          {requestedOrder && !reviewedItems && !orderError && <Loading />}
          {!requestedOrder && (
            <div className="review-order-hint my-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
              <span>Bạn đã mua sản phẩm này? Đánh giá được quản lý trong Đơn mua.</span>
              <Link className="ui-button ui-button-secondary text-xs" to="/customer/orders?status=COMPLETED">
                Đến đơn hàng hoàn tất →
              </Link>
            </div>
          )}
          {showForm && (
            <>
              <h4>{editing ? "Sửa đánh giá" : "Viết đánh giá"}</h4>
              <form onSubmit={submit}>
                {editing?.status === "HIDDEN" && (
                  <p>
                    Đánh giá vẫn bị ẩn sau khi sửa. Lưu nội dung không tự công
                    khai lại.
                  </p>
                )}
                <label>
                  Mục đơn hàng
                  <select
                    aria-label="Mục đơn hàng"
                    value={selectedItem}
                    disabled={busy || blocked || !!editing}
                    onChange={(e) => {
                      setItemId(e.target.value);
                      setNotice("");
                    }}
                    required
                  >
                    <option value="">Chọn mục đã mua</option>
                    {(editing || attempt ? eligible ?? [] : availableItems).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedItem && (
                  <p role="status" className="whitespace-normal break-words">
                    Đang đánh giá:{" "}
                    {eligible?.find((item) => item.id === selectedItem)?.label ??
                      "Mục đã chọn không có trong trang đơn hàng hiện tại; kiểm tra lại trước khi lưu."}
                  </p>
                )}
                <StarPicker
                  value={rating}
                  disabled={busy || blocked}
                  onChange={setRating}
                />
                <label>
                  Nội dung đánh giá
                  <textarea
                    value={body}
                    maxLength={10000}
                    required
                    disabled={busy || blocked}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                <button disabled={busy || blocked || !owned.has(selectedItem)}>
                  {busy
                    ? "Đang lưu…"
                    : editing
                      ? "Lưu đánh giá"
                      : "Gửi đánh giá"}
                </button>
                {editing && (
                  <button
                    type="button"
                    disabled={busy || !!attempt}
                    onClick={() => {
                      setBlocked(false);
                      setLatestSaved(undefined);
                      setEditing(undefined);
                      setItemId("");
                      setBody("");
                      setNotice("");
                    }}
                  >
                    Hủy sửa
                  </button>
                )}
              </form>
            </>
          )}
          {saved?.id && !editing && owned.has(saved.order_item_id) && !reviews?.items.some((review) => review.id === saved.id) && (
            <button onClick={() => edit(saved)}>Sửa đánh giá</button>
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
export default ProductReviews;
