import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
type Orders = OperationOutputs["listOwnOrders"];
type ReviewAttempt = {
  orderItemId: string;
  rating: number;
  body: string;
  reviewId?: string;
  version?: number;
};
export function ProductReviews({ productId }: { productId: string }) {
  const { session } = useAuth();
  const userId = session?.context?.roles.includes("CUSTOMER")
    ? session.context.user_id
    : undefined;
  return (
    <ReviewsInner
      key={productId + ":" + (userId ?? "guest")}
      productId={productId}
      userId={userId}
    />
  );
}
function ReviewsInner({
  productId,
  userId,
}: {
  productId: string;
  userId?: string;
}) {
  const [filterRating, setFilterRating] = useState(""),
    [sort, setSort] = useState<"newest" | "rating_desc" | "rating_asc">(
      "newest",
    );
  const [page, setPage] = useState(1),
    [orderPage, setOrderPage] = useState(1),
    [reload, setReload] = useState(0),
    [ordersReload, setOrdersReload] = useState(0);
  const [reviews, setReviews] =
      useState<OperationOutputs["listProductReviews"]>(),
    [orders, setOrders] = useState<Orders>();
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
    if (!userId) return;
    let active = true;
    setOrderError(undefined);
    setOrders(undefined);
    setItemId("");
    setEditing(undefined);
    callOperation("listOwnOrders", { query: { page: orderPage, size: 20 } })
      .then((value) => {
        if (active) setOrders(value);
      })
      .catch((e) => {
        if (active) setOrderError(e);
      });
    return () => {
      active = false;
    };
  }, [userId, orderPage, ordersReload]);
  const eligible = (orders?.items ?? [])
    .filter((order) => order.status === "COMPLETED")
    .flatMap((order) =>
      (order.items ?? [])
        .filter(
          (item) =>
            item.product_id === productId && typeof item.id === "string",
        )
        .map((item) => ({
          id: String(item.id),
          order: order.id,
          label: reviewItemLabel(order.id, item),
        })),
    );
  const owned = new Set(eligible.map((item) => item.id));
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
      setNotice("Đã lưu đánh giá qua API.");
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
    if (flight.current || blocked || !owned.has(itemId)) return;
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
      orderItemId: itemId,
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
          "Chưa thấy đánh giá của mục này; chưa kết luận lần gửi trước thất bại. Có thể đọc lại hoặc thử gửi lại đúng nội dung đã giữ.",
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
          "Đã đối chiếu đúng nội dung trên đánh giá sở hữu. Không gửi lại thao tác cũ.",
        );
        setReload((n) => n + 1);
      } else {
        setLatestSaved(current);
        setNotice(
          "Đã đọc bản mới. Bản nháp được giữ; xem nội dung đã lưu rồi xác nhận lưu nếu muốn thay đổi.",
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
      <div className="ui-actions">
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
      </div>
      {error !== undefined && (
        <ErrorView error={error} onRetry={() => setReload((n) => n + 1)} />
      )}
      {blocked && (
        <>
          <p>
            Kết nối bị gián đoạn hoặc đánh giá vừa thay đổi. Nội dung bạn viết
            vẫn được giữ; kiểm tra bản đã lưu trước khi gửi lại.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void reconcile()}
          >
            Đối chiếu đánh giá đã lưu
          </button>
          {retryCreate && attempt && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void write(attempt)}
            >
              Thử lại đúng nội dung đánh giá
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
              <p>Chưa có đánh giá nào cho sản phẩm này.</p>
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
            <Pagination
              page={page}
              size={reviews.size}
              total={reviews.total}
              onPage={setPage}
            />
          </>
        )
      )}
      {!userId ? (
        <Link to="/login">Đăng nhập để viết đánh giá sau mua hàng</Link>
      ) : (
        <>
          <div className="review-compose-heading">
            <h4>Viết đánh giá sau mua</h4>
            <p>
              Chọn món đã nhận trong đơn hoàn tất. Bạn cũng có thể mở đơn hàng
              để tìm đúng món cần đánh giá.
            </p>
            <Link to="/customer/orders?status=COMPLETED">
              Xem đơn đã hoàn tất
            </Link>
          </div>
          <Link to={"/customer/reviews?product_id=" + productId}>
            Tìm và sửa đánh giá của tôi, kể cả đánh giá bị ẩn
          </Link>
          {orderError !== undefined && (
            <ErrorView
              error={orderError}
              onRetry={() => setOrdersReload((n) => n + 1)}
            />
          )}
          {!orders && !orderError && <Loading />}
          {orders && (
            <>
              {!eligible.length && (
                <p>
                  Trang đơn hàng này chưa có mục đã hoàn tất cho sản phẩm. Có
                  thể xem trang đơn hàng khác.
                </p>
              )}
              <fieldset
                disabled={busy || !!attempt}
                aria-label="Trang đơn hàng để đánh giá"
              >
                <Pagination
                  page={orderPage}
                  size={orders.size}
                  total={orders.total}
                  onPage={setOrderPage}
                />
              </fieldset>
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
                    value={itemId}
                    disabled={busy || blocked || !!editing}
                    onChange={(e) => {
                      setItemId(e.target.value);
                      setNotice("");
                    }}
                    required
                  >
                    <option value="">Chọn mục đã mua</option>
                    {eligible.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                {itemId && (
                  <p role="status" className="whitespace-normal break-words">
                    Đang đánh giá:{" "}
                    {eligible.find((item) => item.id === itemId)?.label ??
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
                <button disabled={busy || blocked || !owned.has(itemId)}>
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
                      setSaved(undefined);
                      setBody("");
                      setNotice("");
                    }}
                  >
                    Hủy sửa
                  </button>
                )}
              </form>
              {saved?.id && !editing && owned.has(saved.order_item_id) && (
                <button onClick={() => edit(saved)}>
                  Sửa đánh giá vừa lưu
                </button>
              )}
            </>
          )}
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
export default ProductReviews;
