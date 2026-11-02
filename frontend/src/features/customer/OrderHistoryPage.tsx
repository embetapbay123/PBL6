import { ActionMenu } from "../../components/ActionMenu";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { callOperation } from "../../api/operations";
import { ErrorView, Loading, Pagination } from "../../bootstrap/components";
import {
  OrderListFilters,
  OrderStatusTabs,
  OrderListIdentity,
  useOrderListFilters,
  refundStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "../../components/OrderListTools";
import {
  orderStatusLabel,
  OrderNextStep,
} from "../../components/OrderPresentation";
import { canStartOrderPayment } from "../../components/order-actions";
import { CustomerSubNav } from "./CustomerSubNav";
export function OrderHistoryPage() {
  const filters = useOrderListFilters(),
    location = useLocation();
  const query = useQuery({
    queryKey: ["customer-orders", filters.query],
    staleTime: 0,
    queryFn: ({ signal }) =>
      callOperation("listOwnOrders", { query: filters.query }, { signal }),
  });
  useEffect(() => {
    if (
      query.data &&
      !query.isFetching &&
      !query.error &&
      filters.page > Math.max(1, Math.ceil(query.data.total / query.data.size))
    )
      filters.set(
        "page",
        String(Math.max(1, Math.ceil(query.data.total / query.data.size))),
        { replace: true },
      );
  }, [query.data, query.isFetching, query.error, filters.page]);
  const state = { ordersReturnTo: location.pathname + location.search };
  return (
    <section className="boot-card order-history-page">
      <CustomerSubNav />
      <div className="seller-products-toolbar">
        <h1>Lịch sử đơn hàng</h1>
        <Link className="ui-button ui-button-secondary" to="/">
          Tiếp tục mua sắm
        </Link>
      </div>
      <OrderStatusTabs filters={filters} />
      <details
        className="order-advanced-filters"
        open={
          !!(
            filters.query.q ||
            filters.query.payment_status ||
            filters.query.refund_status ||
            (filters.query.status &&
              ![
                "AWAITING_PAYMENT",
                "PENDING",
                "PROCESSING",
                "SHIPPED",
                "COMPLETED",
                "CANCELLED",
              ].includes(filters.query.status))
          )
        }
      >
        <summary>Tìm đơn và lọc chi tiết</summary>
        <OrderListFilters filters={filters} />
      </details>
      {query.error ? (
        <ErrorView error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <Loading />
      ) : (
        query.data && (
          <>
            {!query.data.items.length && (
              <p>Không có đơn hàng phù hợp trong lịch sử của bạn.</p>
            )}
            {query.data.items.map((order) => (
              <article className="boot-card order-history-card" key={order.id}>
                <h2>
                  <Link state={state} to={"/customer/orders/" + order.id}>
                    Đơn #{order.id.slice(-8).toUpperCase()}
                  </Link>
                </h2>
                <p>
                  {orderStatusLabel(order.status)} ·{" "}
                  {paymentMethodLabel(order.payment_method)} ·{" "}
                  {paymentStatusLabel(
                    order.payment_status,
                    order.amounts.payable_vnd,
                  )}
                </p>
                <OrderListIdentity order={order} store compact />
                {["UNKNOWN", "RECOVERING", "PREPARING"].includes(
                  order.payment_status ?? "",
                ) || ["RECOVERING", "PREPARING"].includes(order.status) ? (
                  <OrderNextStep order={order} />
                ) : null}
                {order.refund_status && (
                  <p>
                    Lệnh hoàn tiền: {refundStatusLabel(order.refund_status)}
                  </p>
                )}
                <p className="order-card-total">
                  Tổng thanh toán{" "}
                  <strong>
                    {order.amounts.payable_vnd.toLocaleString("vi-VN")} ₫
                  </strong>
                </p>
                <div className="order-actions">
                  <Link
                    className="ui-button ui-button-secondary"
                    state={state}
                    to={"/customer/orders/" + order.id}
                  >
                    Xem chi tiết
                  </Link>
                  {canStartOrderPayment(order) && (
                    <Link state={state} to={"/orders/" + order.id + "/pay"}>
                      Thanh toán ngay →
                    </Link>
                  )}
                  <ActionMenu label="Các thao tác khác">
                    {" "}
                    {["AWAITING_PAYMENT", "PENDING", "CONFIRMED"].includes(
                      order.status,
                    ) &&
                      order.payment_status !== "UNKNOWN" && (
                        <Link
                          state={state}
                          to={"/customer/orders/" + order.id + "#cancel"}
                        >
                          Hủy đơn
                        </Link>
                      )}
                    {order.status === "COMPLETED" && (
                      <>
                        <Link
                          state={state}
                          to={"/customer/orders/" + order.id + "#returns"}
                        >
                          Yêu cầu đổi trả
                        </Link>
                        <Link
                          state={state}
                          to={"/customer/orders/" + order.id + "#order-items"}
                        >
                          Đánh giá sản phẩm
                        </Link>
                      </>
                    )}
                  </ActionMenu>
                </div>
              </article>
            ))}
            <Pagination
              page={filters.page}
              size={query.data.size}
              total={query.data.total}
              onPage={(page) => filters.set("page", String(page))}
            />
          </>
        )
      )}
    </section>
  );
}
export default OrderHistoryPage;
