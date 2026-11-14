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
import "./customer-return.css";
export type ReturnRequest =
  OperationOutputs["listOwnReturnRequests"]["items"][number];
export function customerReturnUrl(request: Pick<ReturnRequest, "id" | "order_id">) {
  return "/customer/returns?" + new URLSearchParams({
    return_id: request.id,
    order_id: request.order_id,
  });
}
export const returnStatus: Record<string, string> = {
  REQUESTED: "Chờ xét duyệt",
  APPROVED: "Đã chấp thuận",
  REJECTED: "Đã từ chối",
  RECEIVED: "Đã nhận hàng trả",
  EXCHANGE_SENT: "Đã gửi hàng đổi",
  COMPLETED: "Đã hoàn tất",
};
const customerNextStep: Record<string, string> = {
  REQUESTED: "Chờ cửa hàng xét duyệt.",
  APPROVED: "Gửi hàng theo hướng dẫn bên dưới.",
  RECEIVED: "Cửa hàng đang xử lý hàng trả.",
  EXCHANGE_SENT: "Kiểm tra hàng đổi trước khi xác nhận đã nhận.",
  COMPLETED: "Yêu cầu đã hoàn tất.",
  REJECTED: "Cửa hàng đã từ chối yêu cầu.",
};
export function canInspectReturn(request: ReturnRequest, scope: "CUSTOMER" | "STORE" | "ADMIN") {
  return scope !== "CUSTOMER" &&
    ["APPROVED", "RECEIVED"].includes(request.status) &&
    (!request.inventory_status || request.inventory_status === "NOT_STARTED");
}

export function ReturnRequestView({
  request,
  children,
  showOrderLink = true,
  scope = "CUSTOMER",
  context,
  detail = false,
}: {
  request: ReturnRequest;
  children?: ReactNode;
  context?: ReactNode;
  showOrderLink?: boolean;
  scope?: "CUSTOMER" | "STORE" | "ADMIN";
  detail?: boolean;
}) {
  const inspecting = canInspectReturn(request, scope);
  const images = useCurrentOrderImages(inspecting ? [] : request.items ?? []);
  const customer = scope === "CUSTOMER";
  const converting = request.conversion_status === "PROPOSED";
  const returnAddress = request.return_policy_snapshot?.return_address;
  const exchangeSent = ["EXCHANGE_SENT", "COMPLETED"].includes(request.status);
  const feeMessage = request.fault_party === "DISPUTED"
    ? "Đang xem xét bên chịu phí gửi trả."
    : request.fee_payer === "STORE"
      ? "Cửa hàng chịu phí gửi trả."
      : request.fee_payer === "CUSTOMER" ? "Bạn chịu phí gửi trả." : undefined;
  const purchasedItems = request.items?.map((item) => (
    <OrderItemIdentity
      key={item.order_item_id}
      item={{ ...item, id: item.order_item_id }}
      currentImage={images.get(item.variant_id)}
      scope={scope}
    />
  ));
  const Heading = detail && inspecting ? "h1" : "h2";
  return (
    <article className={customer ? "boot-card customer-return-card" : "boot-card"}>
      <div className="market-return-heading">
        <Heading>
          {inspecting ? "Kiểm hàng trả" : request.type === "REFUND" ? "Trả hàng và hoàn tiền" : "Đổi hàng"}
        </Heading>
        <span className="market-badge">
          {returnStatus[request.status] ?? request.status}
        </span>
      </div>
      {inspecting && (
        <div className="return-inspecting-context p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-700">
              Yêu cầu <strong className="font-mono">#{request.id.slice(-8).toUpperCase()}</strong> · Đơn <strong className="font-mono">#{request.order_id.slice(-8).toUpperCase()}</strong>
            </span>
            <span className="text-slate-900 font-semibold">
              Giá trị: {request.amount_vnd.toLocaleString("vi-VN")} ₫
            </span>
          </div>
          <p className="text-slate-500 m-0">
            Loại: {request.type === "REFUND" ? "Trả hàng hoàn tiền" : "Đổi hàng"} · Bước hiện tại: Nhận và kiểm tra phân loại chất lượng hàng hoàn về trước khi xử lý hoàn tiền hoặc gửi hàng đổi.
          </p>
        </div>
      )}
      {customer ? (
        <>
          <p className="customer-return-meta">
            <span>Đơn #{request.order_id.slice(-8).toUpperCase()}</span>
            <strong>{request.amount_vnd.toLocaleString("vi-VN")} ₫</strong>
            {showOrderLink && <Link to={"/customer/orders/" + request.order_id}>Xem đơn hàng</Link>}
          </p>
          {!['COMPLETED','REJECTED'].includes(request.status)&&<p role="status">{converting ? "Phản hồi đề nghị hoàn tiền của cửa hàng." :
            request.status === "APPROVED" && !!request.inspection?.length
              ? "Cửa hàng đang kiểm tra hàng trả."
              : customerNextStep[request.status]}</p>}
          {request.status === "REJECTED" && request.decision_note && <p>{request.decision_note}</p>}
          {request.status === "APPROVED" && (
            request.inspection?.length ? (
              <div className="customer-return-post-inspection" style={{ margin: "12px 0" }}>
                {feeMessage && <p className="customer-return-fee">{feeMessage}</p>}
                <details className="customer-return-reference">
                  <summary style={{ cursor: "pointer", color: "#475569", fontSize: "13.5px" }}>
                    Địa chỉ và hướng dẫn gửi trả (tham khảo)
                  </summary>
                  <div style={{ padding: "8px 0" }}>
                    {request.return_instructions
                      ? <p>{request.return_instructions}</p>
                      : returnAddress
                        ? <address>
                            {returnAddress.recipient_name} · {returnAddress.phone}<br />
                            {[returnAddress.line1, returnAddress.ward, returnAddress.district, returnAddress.city].filter(Boolean).join(", ")}
                          </address>
                        : <p>Liên hệ cửa hàng để xác nhận địa chỉ nhận hàng trả.</p>}
                  </div>
                </details>
              </div>
            ) : (
              <section className="customer-return-guidance">
                <h3>Hướng dẫn gửi trả:</h3>
                {request.return_instructions
                  ? <p>{request.return_instructions}</p>
                  : returnAddress
                    ? <address>
                        {returnAddress.recipient_name} · {returnAddress.phone}<br />
                        {[returnAddress.line1, returnAddress.ward, returnAddress.district, returnAddress.city].filter(Boolean).join(", ")}
                      </address>
                    : <p>Liên hệ cửa hàng để xác nhận địa chỉ nhận hàng trả.</p>}
                {feeMessage && <p>{feeMessage}</p>}
              </section>
            )
          )}
        </>
      ) : inspecting || ['REJECTED','COMPLETED'].includes(request.status) ? null : scope === 'STORE' ? <p className="seller-return-next" role="status"><strong>Tiếp theo: </strong>{request.status === 'REQUESTED' ? 'Xét duyệt yêu cầu.' : request.status === 'APPROVED' ? 'Nhận và kiểm hàng trả.' : request.status === 'RECEIVED' ? (request.type === 'EXCHANGE' ? 'Chuẩn bị hàng đổi.' : 'Xử lý hoàn tiền.') : 'Chờ khách nhận hàng đổi.'}</p> : <ProgressSteps
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
      {inspecting && children}
      {request.original_type === "EXCHANGE" && request.type === "REFUND" && (
        <p>
          Khách đã đồng ý chuyển đổi hàng sang hoàn tiền.
        </p>
      )}
      {!customer && !inspecting && <><h3>Hàng đã mua ban đầu</h3>{purchasedItems}</>}
      {request.exchange_dispatch && (
        <section aria-label="Hàng đổi đã bàn giao">
          <h3>Hàng đổi đã bàn giao</h3>
          <p>
            {customer ? "Gửi lúc" : "Xuất kho lúc"}{" "}
            <time dateTime={request.exchange_dispatch.dispatched_at}>
              {new Date(request.exchange_dispatch.dispatched_at).toLocaleString(
                "vi-VN",
                { timeZone: "Asia/Ho_Chi_Minh" },
              )}
            </time>{" "}
            (giờ Việt Nam).
          </p>
          {request.exchange_dispatch.items.map((item) => (
            <OrderItemIdentity
              key={item.original_variant_id}
              snapshotKind="EXCHANGE"
              item={{ ...item, id: item.variant_id }}
              scope={scope}
            />
          ))}
        </section>
      )}
      {request.type === "EXCHANGE" &&
        exchangeSent &&
        !request.exchange_dispatch && (
          <p role="status">
            Lần đổi cũ chưa lưu tên và phân loại hàng đã bàn giao.{" "}
            {customer
              ? "Hãy kiểm tra kiện hàng đổi hoặc liên hệ cửa hàng để hỗ trợ."
              : "Cần đối chiếu tham chiếu giao hàng với cửa hàng trước khi xác nhận; không dùng phân loại ban đầu để suy hàng đổi."}
          </p>
        )}
      {customer && converting && request.conversion_note && <p>{request.conversion_note}</p>}
      {customer && request.type === "EXCHANGE" && exchangeSent && request.replacement_reference && (
        <p>Mã giao hàng đổi <strong>{request.replacement_reference}</strong></p>
      )}
      {customer && children}
      {customer && request.type === "REFUND" && (
        <p role="status"><strong>Hoàn tiền</strong> · <span>{request.amount_vnd === 0
          ? "Đơn 0đ không phát sinh khoản hoàn (Áp dụng ưu đãi 100%)"
          : request.refund_status
            ? refundStatusLabel(request.refund_status)
            : "Đang xử lý hoàn tiền."}</span></p>
      )}
      {customer ? (
        <details>
          <summary>Chi tiết yêu cầu</summary>
          <p><strong>Lý do yêu cầu</strong><br />{request.reason}</p>
          {request.decision_note && request.status !== "REJECTED" && (
            <p><strong>Phản hồi của cửa hàng</strong><br />{request.decision_note}</p>
          )}
          {request.status !== "APPROVED" && feeMessage && <p>{feeMessage}</p>}
          <h3>Hàng đã mua ban đầu</h3>
          {purchasedItems}
        </details>
      ) : (
      <>
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
            {!customer && request.inventory_status && (
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
                    <span className="market-badge">{customer ? "Đơn 0đ không phát sinh khoản hoàn." : "Đơn 0đ: Không phát sinh khoản tiền thu cần hoàn trả."}</span>
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
        <summary>Chính sách đổi trả</summary>
        <ReturnPolicyNotice policy={request.return_policy_snapshot} scope={scope} />
      </details>
      </>
      )}
      {customer && (request.exchange_status === "PENDING" || request.last_error) && (
        <p role="status">{request.exchange_status === "PENDING"
          ? "Cửa hàng đang xác nhận việc gửi hàng đổi."
          : "Đang xử lý. Liên hệ cửa hàng nếu cần hỗ trợ."}</p>
      )}
      {!customer && request.exchange_status === "PENDING" && (
        <p role="status">
          {request.last_error === "EXCHANGE_DISPATCH_PAUSED"
            ? "Tạm dừng xuất hàng đổi. Chờ hệ thống kiểm tra, không gửi yêu cầu mới."
            : "Đang xác nhận xuất hàng đổi. Không gửi lại yêu cầu."}
        </p>
      )}
      {!customer && request.last_error && (
        <p role="status">
          {request.exchange_status === "BLOCKED"
            ? "Chưa xuất được hàng đổi. Chọn lại phân loại hoặc đề nghị hoàn tiền."
            : request.exchange_status === "PENDING" &&
                request.last_error === "EXCHANGE_DISPATCH_PAUSED"
              ? "Làm mới để kiểm tra kết quả."
              : "Chưa rõ kết quả kho. Làm mới hoặc liên hệ hỗ trợ."}
        </p>
      )}
      {request.last_error && scope === 'ADMIN' && <details><summary>Chi tiết lỗi</summary><code>{request.last_error}</code></details>}
      {!customer && converting && (
        <p role="status">
          Store đề nghị hoàn đủ tiền, đang chờ khách xác nhận:{" "}
          {request.conversion_note}
        </p>
      )}
      {request.type === "REFUND" &&
        request.payment_method === "SANDBOX" &&
        request.refund_status === "FAILED" && (
          <p>
            Khoản hoàn chưa thành công. {customer
              ? "Bạn có thể theo dõi cập nhật tại đây."
              : "Chủ cửa hàng hoặc Admin cần đối soát trước khi thử lại; chưa xác nhận bạn đã nhận tiền."}
          </p>
        )}
      <AfterSaleHistory
        orderId={request.order_id}
        scope={scope}
        items={request.items}
        revision={request.version + ":" + request.refund_status}
        label={inspecting || (!customer && !!request.inspection?.length) ? "Lịch sử kiểm hàng" : undefined}
        context={!customer && <>
          <p className="break-all">Mã hồ sơ <code>{request.id}</code><br />Mã đơn <code>{request.order_id}</code></p>
          {request.inspection_note && <p>{request.inspection_note}</p>}
          <InspectionSummary lines={request.inspection ?? []} items={request.items ?? []} heading="Biên bản gần nhất" />
        </>}
      />
      <p>
        <small>
          Cập nhật {new Date(request.updated_at).toLocaleString("vi-VN")}
        </small>
      </p>
      {!customer && showOrderLink && (
        <Link to={"/customer/orders/" + request.order_id}>Xem đơn hàng</Link>
      )}
      {!customer && !inspecting && children}
    </article>
  );
}
