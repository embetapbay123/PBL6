import { AfterSaleHistory } from "./AfterSaleHistory";
import { refundStatusLabel } from "../../components/OrderListTools";
import { ReturnPolicyNotice } from "../../components/OrderPresentation";
import { OrderItemIdentity } from "../../components/OrderPresentation";
import { InspectionSummary } from "../../components/InspectionSummary";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { OperationOutputs } from "../../api/operations.generated";
import { ProgressSteps } from "../../components/ui/ProgressSteps";
import {useCurrentOrderImages} from '../../components/useCurrentOrderImages';
export type ReturnRequest =
  OperationOutputs["listOwnReturnRequests"]["items"][number];
export const returnStatus: Record<string, string> = {
  REQUESTED: "Chờ xét duyệt",
  APPROVED: "Đã chấp thuận",
  REJECTED: "Đã từ chối",
  RECEIVED: "Đã nhận hàng trả",
  EXCHANGE_SENT: "Đã gửi hàng đổi",
  COMPLETED: "Đã hoàn tất",
};
export function ReturnRequestView({
  request,
  children,
  showOrderLink = true,
  scope = "CUSTOMER",
  context,
}: {
  request: ReturnRequest;
  children?: ReactNode;
  context?: ReactNode;
  showOrderLink?: boolean;
  scope?: "CUSTOMER" | "STORE" | "ADMIN";
}) {
  const images=useCurrentOrderImages(request.items??[]);
  return (
    <article className="boot-card">
      <div className="market-return-heading">
        <h2>
          {request.type === "REFUND" ? "Trả hàng và hoàn tiền" : "Đổi hàng"}
        </h2>
        <span className="market-badge">
          {returnStatus[request.status] ?? request.status}
        </span>
      </div>
      {request.status === 'REJECTED' ? <p role="status">Yêu cầu đã bị từ chối; không còn bước xử lý tiếp theo trong yêu cầu này.</p> : scope === 'STORE' ? <p className="seller-return-next" role="status"><strong>Tiếp theo: </strong>{request.status === 'REQUESTED' ? 'Xét duyệt yêu cầu của khách.' : request.status === 'APPROVED' ? 'Hướng dẫn gửi trả và kiểm hàng khi nhận được.' : request.status === 'RECEIVED' ? (request.type === 'EXCHANGE' ? 'Đối chiếu hàng và xử lý gửi hàng đổi.' : 'Đối chiếu hàng và xử lý hoàn tiền.') : request.status === 'EXCHANGE_SENT' ? 'Chờ khách xác nhận đã nhận hàng đổi.' : 'Yêu cầu đã hoàn tất.'}</p> : <ProgressSteps
        label="Tiến trình xử lý đổi trả"
        steps={[
          "Gửi yêu cầu",
          "Cửa hàng xét duyệt",
          "Nhận và kiểm hàng",
          request.type === "EXCHANGE" ? "Gửi hàng đổi" : "Xử lý hoàn tiền",
          "Kết thúc",
        ]}
        current={
          request.status === "COMPLETED"
            ? 4
            : request.status === "EXCHANGE_SENT"
              ? 3
              : request.status === "RECEIVED"
                ? 3
                : request.status === "APPROVED"
                  ? 2
                  : 1
        }
      />}
      {context}
      {scope !== 'STORE' && (
        <details className="return-policy-details">
          <summary>Chính sách và địa chỉ nhận trả đã chốt</summary>
          <ReturnPolicyNotice policy={request.return_policy_snapshot} />
        </details>
      )}
      {request.original_type === "EXCHANGE" && request.type === "REFUND" && (
        <p>
          Yêu cầu ban đầu là đổi hàng; đã chuyển sang hoàn tiền sau xác nhận của
          khách.
        </p>
      )}
      <h3>Hàng đã mua ban đầu</h3>
      {request.items?.map((item) => (
        <OrderItemIdentity
          key={item.order_item_id}
          item={{ ...item, id: item.order_item_id }}
          currentImage={images.get(item.variant_id)}
        />
      ))}
      {request.exchange_dispatch && (
        <section aria-label="Hàng đổi đã bàn giao">
          <h3>Hàng đổi đã bàn giao</h3>
          <p>
            Xuất kho lúc{" "}
            <time dateTime={request.exchange_dispatch.dispatched_at}>
              {new Date(request.exchange_dispatch.dispatched_at).toLocaleString(
                "vi-VN",
                { timeZone: "Asia/Ho_Chi_Minh" },
              )}
            </time>{" "}
            (giờ Việt Nam). Thông tin được lưu khi xuất hàng đổi.
          </p>
          {request.exchange_dispatch.items.map((item) => (
            <OrderItemIdentity
              key={item.original_variant_id}
              snapshotKind="EXCHANGE"
              item={{ ...item, id: item.variant_id }}
            />
          ))}
        </section>
      )}
      {request.type === "EXCHANGE" &&
        ["EXCHANGE_SENT", "COMPLETED"].includes(request.status) &&
        !request.exchange_dispatch && (
          <p role="status">
            Lần đổi cũ chưa lưu tên và phân loại hàng đã bàn giao. Cần đối chiếu
            tham chiếu giao hàng với cửa hàng trước khi xác nhận; không dùng
            phân loại ban đầu để suy hàng đổi.
          </p>
        )}
      {scope === 'STORE' ? (
        <details className="return-extra-details" style={{ margin: '14px 0', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', background: '#f8fafc' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#0369a1' }}>
            🔍 Xem chi tiết đầy đủ, biên bản & lịch sử đối soát
          </summary>
          <div style={{ marginTop: '12px' }}>
            <div className="market-table-scroll return-details-table" style={{ margin: '10px 0' }}>
              <table>
                <tbody>
                  <tr>
                    <th scope="row" style={{ width: '32%', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Lý do yêu cầu</th>
                    <td><strong>{request.reason}</strong></td>
                  </tr>
                  <tr>
                    <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Giá trị đơn</th>
                    <td><strong style={{ color: '#0f172a', fontSize: '14px' }}>{request.amount_vnd.toLocaleString("vi-VN")} ₫</strong></td>
                  </tr>
                  {request.fault_party && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Trách nhiệm & Phí</th>
                      <td>
                        <span className="market-badge" style={{ marginRight: '6px' }}>
                          {request.fault_party === "DISPUTED"
                            ? "Chờ Admin kết luận"
                            : request.fee_payer === "STORE"
                              ? "Store chịu phí"
                              : "Khách chịu phí"}
                        </span>
                        <small style={{ color: '#64748b' }}>
                          {request.fee_payer === "STORE"
                            ? "Store chịu toàn bộ chi phí đổi/trả."
                            : "Khách chịu phí đổi/trả do đổi ý hoặc chọn sai."}
                        </small>
                      </td>
                    </tr>
                  )}
                  {request.return_instructions && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Hướng dẫn gửi trả</th>
                      <td>{request.return_instructions}</td>
                    </tr>
                  )}
                  {request.inspection_note && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Kết quả kiểm hàng</th>
                      <td>{request.inspection_note}</td>
                    </tr>
                  )}
                  {request.inventory_status && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Trạng thái kho</th>
                      <td>
                        <span className="market-badge">
                          {request.inventory_status === "APPLIED"
                            ? "Đã cộng tồn theo kiểm hàng"
                            : request.inventory_status === "LEGACY_RECONCILED"
                              ? "Đã đối chiếu đơn cũ"
                              : request.inventory_status === "PENDING"
                                ? "Đang đối chiếu kho"
                                : "Chưa xác nhận kiểm kho"}
                        </span>
                      </td>
                    </tr>
                  )}
                  {request.type === "REFUND" && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Trạng thái hoàn tiền</th>
                      <td>
                        {request.amount_vnd === 0 ? (
                          <span className="market-badge">Đơn 0đ không có khoản đã thu cần hoàn. Hoàn tất kiểm hàng và đối chiếu kho; không ghi giao dịch hoàn tiền giả.</span>
                        ) : request.refund_status === "SUCCEEDED" ? (
                          <span className="market-badge is-success">Đã xác nhận hoàn tiền.</span>
                        ) : request.refund_status ? (
                          <span className="market-badge">{"Kết quả hoàn tiền: " + refundStatusLabel(request.refund_status)}</span>
                        ) : (
                          <span className="market-badge">Chưa có xác nhận hoàn tiền.</span>
                        )}
                      </td>
                    </tr>
                  )}
                  {request.decision_note && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Phản hồi xử lý</th>
                      <td>{request.decision_note}</td>
                    </tr>
                  )}
                  {request.replacement_reference && (
                    <tr>
                      <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Mã giao hàng đổi</th>
                      <td><code>{request.replacement_reference}</code></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <details className="return-policy-details" style={{ margin: '8px 0' }}>
              <summary>Chính sách và địa chỉ nhận trả đã chốt</summary>
              <ReturnPolicyNotice policy={request.return_policy_snapshot} />
            </details>
            <InspectionSummary
              lines={request.inspection ?? []}
              items={request.items ?? []}
              heading="Biên bản hàng trả đã ghi nhận"
            />
            <AfterSaleHistory
              orderId={request.order_id}
              scope={scope}
              items={request.items}
              revision={request.version + ":" + request.refund_status}
            />
          </div>
        </details>
      ) : (
        <div className="market-table-scroll return-details-table" style={{ margin: '14px 0' }}>
          <table>
            <tbody>
              <tr>
                <th scope="row" style={{ width: '32%', background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Lý do yêu cầu</th>
                <td><strong>{request.reason}</strong></td>
              </tr>
              <tr>
                <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Giá trị đơn</th>
                <td><strong style={{ color: '#0f172a', fontSize: '14px' }}>{request.amount_vnd.toLocaleString("vi-VN")} ₫</strong></td>
              </tr>
              {request.fault_party && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Trách nhiệm & Phí</th>
                  <td>
                    <span className="market-badge" style={{ marginRight: '6px' }}>
                      {request.fault_party === "DISPUTED"
                        ? "Chờ Admin kết luận"
                        : request.fee_payer === "STORE"
                          ? "Store chịu phí"
                          : "Khách chịu phí"}
                    </span>
                    <small style={{ color: '#64748b' }}>
                      {request.fee_payer === "STORE"
                        ? "Store chịu toàn bộ chi phí đổi/trả."
                        : "Khách chịu phí đổi/trả do đổi ý hoặc chọn sai."}
                    </small>
                  </td>
                </tr>
              )}
              {request.return_instructions && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Hướng dẫn gửi trả</th>
                  <td>{request.return_instructions}</td>
                </tr>
              )}
              {request.inspection_note && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Kết quả kiểm hàng</th>
                  <td>{request.inspection_note}</td>
                </tr>
              )}
              {request.inventory_status && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Trạng thái kho</th>
                  <td>
                    <span className="market-badge">
                      {request.inventory_status === "APPLIED"
                        ? "Đã cộng tồn theo kiểm hàng"
                        : request.inventory_status === "LEGACY_RECONCILED"
                          ? "Đã đối chiếu đơn cũ"
                          : request.inventory_status === "PENDING"
                            ? "Đang đối chiếu kho"
                            : "Chưa xác nhận kiểm kho"}
                    </span>
                  </td>
                </tr>
              )}
              {request.type === "REFUND" && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Trạng thái hoàn tiền</th>
                  <td>
                    {request.amount_vnd === 0 ? (
                      <span className="market-badge">Đơn 0đ không có khoản đã thu cần hoàn. Hoàn tất kiểm hàng và đối chiếu kho; không ghi giao dịch hoàn tiền giả.</span>
                    ) : request.refund_status === "SUCCEEDED" ? (
                      <span className="market-badge is-success">Đã xác nhận hoàn tiền.</span>
                    ) : request.refund_status ? (
                      <span className="market-badge">{"Kết quả hoàn tiền: " + refundStatusLabel(request.refund_status)}</span>
                    ) : (
                      <span className="market-badge">Chưa có xác nhận hoàn tiền.</span>
                    )}
                  </td>
                </tr>
              )}
              {request.decision_note && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Phản hồi xử lý</th>
                  <td>{request.decision_note}</td>
                </tr>
              )}
              {request.replacement_reference && (
                <tr>
                  <th scope="row" style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}>Mã giao hàng đổi</th>
                  <td><code>{request.replacement_reference}</code></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Crucial status badges visible in the main card */}
      {scope === 'STORE' && (
        <div className="seller-return-summary-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', margin: '10px 0' }}>
          <span className="market-badge">Lý do: <strong>{request.reason}</strong></span>
          <span className="market-badge">Giá trị: <strong>{request.amount_vnd.toLocaleString("vi-VN")} ₫</strong></span>
          {request.type === "REFUND" && (
            request.amount_vnd === 0 ? (
              <span className="market-badge">Đơn 0đ không có khoản đã thu cần hoàn. Hoàn tất kiểm hàng và đối chiếu kho; không ghi giao dịch hoàn tiền giả.</span>
            ) : request.refund_status === "SUCCEEDED" ? (
              <span className="market-badge is-success">Đã xác nhận hoàn tiền.</span>
            ) : request.refund_status ? (
              <span className="market-badge">{"Kết quả hoàn tiền: " + refundStatusLabel(request.refund_status)}</span>
            ) : (
              <span className="market-badge">Chưa có xác nhận hoàn tiền.</span>
            )
          )}
        </div>
      )}
      {scope !== 'STORE' && (
        <InspectionSummary
          lines={request.inspection ?? []}
          items={request.items ?? []}
          heading="Biên bản hàng trả đã ghi nhận"
        />
      )}
      {request.status === "APPROVED" && !!request.inspection?.length && (
        <p role="status">
          Đã lưu biên bản thực nhận. Chờ nhận / kiểm đủ trước khi đối chiếu tồn
          và tiền.
        </p>
      )}
      {request.exchange_status === "PENDING" && (
        <p role="status">
          {request.last_error === "EXCHANGE_DISPATCH_PAUSED"
            ? "Việc xác nhận bàn giao hàng đổi đang tạm dừng. Yêu cầu được giữ nguyên; hệ thống sẽ tiếp tục đối chiếu khi dịch vụ hoạt động lại. Chưa xác nhận đã gửi hàng đổi; không tạo yêu cầu khác."
            : "Đang xác nhận lệnh kho bàn giao hàng đổi. Chưa báo đã gửi khi chưa rõ kết quả; không gửi lại lệnh khác."}
        </p>
      )}
      {request.last_error && (
        <p role="status">
          {request.exchange_status === "BLOCKED"
            ? "Hàng đổi chưa được trừ tồn / bàn giao. Kiểm tra phân loại hoặc đề nghị hoàn tiền để khách xác nhận."
            : request.exchange_status === "PENDING" &&
                request.last_error === "EXCHANGE_DISPATCH_PAUSED"
              ? "Có thể làm mới để đọc kết quả đối chiếu."
              : "Chưa xác định kết quả kho; đọc lại hoặc liên hệ hỗ trợ."}{" "}
          Mã yêu cầu: {request.id}
        </p>
      )}
      {request.last_error && scope === 'ADMIN' && <details><summary>Thông tin hỗ trợ kỹ thuật</summary><code>{request.last_error}</code></details>}
      {request.conversion_status === "PROPOSED" && (
        <p role="status">
          Store đề nghị hoàn đủ tiền, đang chờ khách xác nhận:{" "}
          {request.conversion_note}
        </p>
      )}
      {request.type === "REFUND" &&
        request.payment_method === "SANDBOX" &&
        request.refund_status === "FAILED" && (
          <p>
            Khoản hoàn chưa thành công. Chủ cửa hàng hoặc Admin cần đối soát
            trước khi thử lại; chưa xác nhận bạn đã nhận tiền.
          </p>
        )}
      {scope !== 'STORE' && (
        <AfterSaleHistory
          orderId={request.order_id}
          scope={scope}
          items={request.items}
          revision={request.version + ":" + request.refund_status}
        />
      )}
      <p>
        <small>
          Cập nhật {new Date(request.updated_at).toLocaleString("vi-VN")}
        </small>
      </p>
      {showOrderLink ? (
        <Link to={"/customer/orders/" + request.order_id}>Xem đơn hàng</Link>
      ) : (
        <p>Mã đơn: {request.order_id}</p>
      )}
      {children}
    </article>
  );
}
