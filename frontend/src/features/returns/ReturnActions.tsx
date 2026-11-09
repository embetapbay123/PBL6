import { RefundRecoveryPanel } from "./RefundRecoveryPanel";
import {ReturnShipping} from '../shipping/ReturnShipping';
import { useState, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../api/auth-context";
import { callOperation } from "../../api/operations";
import type { OperationInputs } from "../../api/operations.generated";
import { ErrorView } from "../../bootstrap/components";
import { ReturnInspectionFields } from "./ReturnInspectionFields";
import "./return-inspection.css";
import { OrderItemIdentity } from "../../components/OrderPresentation";
import { variantLabel } from "../../components/variant-identity";
import { CaseFeedback, useCaseCommand } from "./DeliveryReturnsPage";
import { CodRefundForm } from "./CodRefundForm";
import { canInspectReturn, type ReturnRequest } from "./ReturnRequestView";

type Scope = "CUSTOMER" | "STORE" | "ADMIN";
type Body = OperationInputs["updateStoreReturnRequest"]["body"] & {
  operation_id: string;
};
type Resolution = OperationInputs["resolveStoreReturn"]["body"];
type ActionProps = {
  request: ReturnRequest;
  scope: Scope;
  refresh: () => Promise<unknown>;
};
export function ReturnActions(props: ActionProps) {
  const { request, scope } = props;
  const inspecting = canInspectReturn(request, scope);
  const [receiptNotice, setReceiptNotice] = useState("");
  const showCodRefund =
    scope === "STORE" &&
    request.payment_method === "COD" &&
    request.type === "REFUND" &&
    request.status === "RECEIVED" &&
    request.amount_vnd > 0 &&
    request.refund_status !== "SUCCEEDED" &&
    !!request.fee_payer &&
    (request.inventory_status === "APPLIED" ||
      request.inventory_status === "LEGACY_RECONCILED");
  // Revisions reset decisions and inspections, but preserve a receipt draft or immutable pending command.
  return (
    <>
      {!inspecting && <ReturnShipping {...props}/>}
      {showCodRefund && (
        <CodRefundForm key={request.order_id} request={request} />
      )}
      <ReturnDecisionActions
        key={request.id + ":" + request.version}
        {...props}
        onReceiptSaved={(complete) => setReceiptNotice(complete
          ? "Đã lưu kiểm hàng. Đang đối chiếu kho."
          : "Đã lưu kiểm hàng. Cập nhật khi nhận hoặc kiểm thêm.")}
      />
      {receiptNotice && <p className="return-inspection-saved" role="status">{receiptNotice}</p>}
      {inspecting && <ReturnShipping {...props}/>}
    </>
  );
}
function ReturnDecisionActions({ request, scope, refresh, onReceiptSaved }: ActionProps & { onReceiptSaved: (complete: boolean) => void }) {
  const fieldId = useId();
  const { session } = useAuth(),
    key = `${session?.context?.user_id}_${session?.context?.store_membership?.store_id ?? scope}_${request.id}`;
  const state = useCaseCommand<Body>("pbl6_return_transition_" + key),
    resolve = useCaseCommand<Resolution>("pbl6_return_resolution_" + key);
  const [note, setNote] = useState(state.saved?.decision_note ?? ""),
    [fault, setFault] = useState<"STORE" | "CUSTOMER" | "DISPUTED">(
      state.saved?.fault_party ?? "DISPUTED",
    ),
    [instructions, setInstructions] = useState(
      state.saved?.return_instructions ?? "",
    ),
    [reject, setReject] = useState(state.saved?.status === "REJECTED");
  const [inspectionNote, setInspectionNote] = useState(
      state.saved?.inspection_note ?? request.inspection_note ?? "",
    ),
    [legacy, setLegacy] = useState(
      state.saved?.legacy_reconciliation_note ?? "",
    ),
    [reference, setReference] = useState(
      state.saved?.replacement_reference ?? "",
    );
  const items = request.items ?? [];
  const [lines, setLines] = useState(
      items.map(
        (item) =>
          state.saved?.inspection?.find((line) => line.order_item_id === item.order_item_id) ??
          request.inspection?.find(
            (line) => line.order_item_id === item.order_item_id,
          ) ?? {
            order_item_id: item.order_item_id,
            received_quantity: 0,
            resellable_quantity: 0,
            damaged_quantity: 0,
            pending_quantity: 0,
          },
      ),
  );
  const [replacements, setReplacements] = useState(
    state.saved?.replacements ??
      items.map((item) => ({
        order_item_id: item.order_item_id,
        variant_id: "",
      })),
  );
  const [resolutionNote, setResolutionNote] = useState(
      resolve.saved?.note ?? "",
    ),
    [resolutionFault, setResolutionFault] = useState<"STORE" | "CUSTOMER">(
      resolve.saved?.fault_party ?? "STORE",
    );
  const canInspect = canInspectReturn(request, scope);
  const invalidLine = items.findIndex((item, index) => {
    const line = lines[index];
    return !line || ![line.received_quantity, line.resellable_quantity, line.damaged_quantity, line.pending_quantity].every(n => Number.isSafeInteger(n) && n >= 0)
      || line.received_quantity > item.quantity
      || line.received_quantity !== line.resellable_quantity + line.damaged_quantity + line.pending_quantity;
  });
  const inspectionError = invalidLine < 0 ? "" : `Mục ${invalidLine + 1}: Thực nhận phải bằng Bán lại được + Hỏng / không bán lại + Chờ kiểm và không vượt số lượng đã mua.`;
  const inspectionComplete = items.length > 0 && invalidLine < 0 && items.every((item, index) => lines[index].received_quantity === item.quantity && lines[index].pending_quantity === 0);
  const ready =
    request.inventory_status === "APPLIED" ||
    request.inventory_status === "LEGACY_RECONCILED";
  const actionable =
    scope !== "CUSTOMER" &&
    ["REQUESTED", "APPROVED", "RECEIVED"].includes(request.status);
  const refundPending =
    request.type === "REFUND" &&
    request.status === "RECEIVED" &&
    request.amount_vnd > 0 &&
    request.refund_status !== "SUCCEEDED";
  const exchanging =
    scope === "STORE" &&
    request.type === "EXCHANGE" &&
    request.status === "RECEIVED" &&
    request.inventory_status === "APPLIED" &&
    ["NOT_STARTED", "BLOCKED"].includes(
      request.exchange_status ?? "NOT_STARTED",
    ) &&
    request.conversion_status !== "PROPOSED" &&
    request.fault_party !== "DISPUTED";
  const products = useQuery({
    queryKey: ["return-replacement-options", request.id],
    enabled: exchanging,
    retry: false,
    queryFn: async () =>
      Promise.all(
        items.map(async (item) => ({
          item,
          product: await callOperation("getProduct", {
            path: { id: item.product_id },
          }),
        })),
      ),
  });
  const exchangeSelectionReady =
    !!products.data &&
    !products.error &&
    items.every((item) => {
      const product = products.data.find(
          (row) => row.item.order_item_id === item.order_item_id,
        )?.product,
        selected = replacements.find(
          (row) => row.order_item_id === item.order_item_id,
        )?.variant_id,
        variant = product?.variants?.find((v) => v.id === selected);
      return (
        typeof item.unit_price_vnd === "number" &&
        product?.status === "ACTIVE" &&
        product.moderation_status === "VISIBLE" &&
        variant?.status === "ACTIVE" &&
        variant.price_vnd === item.unit_price_vnd
      );
    });
  const locked =
    state.busy ||
    state.uncertain ||
    state.stale ||
    resolve.busy ||
    resolve.uncertain ||
    resolve.stale;
  const reload = () =>
    void refresh()
      .then(() => {
        state.reset();
        resolve.reset();
      })
      .catch(state.setError);
  async function send(status: Body["status"]) {
    if (status === "RECEIVED" && !state.uncertain && inspectionError) {
      document.getElementById(fieldId + "-line-" + invalidLine)?.focus();
      return;
    }
    await state.run(
      () => ({
        operation_id: crypto.randomUUID(),
        expected_version: request.version,
        status,
        ...(note.trim() ? { decision_note: note.trim() } : {}),
        ...(status === "APPROVED"
          ? { fault_party: fault, return_instructions: instructions.trim() }
          : {}),
        ...(status === "RECEIVED"
          ? {
              inspection: lines,
              inspection_note: inspectionNote.trim(),
              ...(legacy.trim()
                ? { legacy_reconciliation_note: legacy.trim() }
                : {}),
            }
          : {}),
        ...(status === "EXCHANGE_SENT"
          ? { ...(['GHN','PLATFORM'].includes(request.shipping_mode??'')?{}:{replacement_reference:reference.trim()}), replacements }
          : {}),
      }),
      (body) =>
        scope === "STORE"
          ? callOperation("updateStoreReturnRequest", {
              path: { id: request.id },
              body,
            })
          : callOperation("updateAdminReturnRequest", {
              path: { id: request.id },
              body,
            }),
      async () => {
        await refresh();
        if (status === "RECEIVED") onReceiptSaved(inspectionComplete);
      },
    );
  }
  async function decide(action: Resolution["action"]) {
    await resolve.run(
      () => ({
        operation_id: crypto.randomUUID(),
        expected_version: request.version,
        action,
        note: resolutionNote.trim(),
        ...(action === "RESOLVE" ? { fault_party: resolutionFault } : {}),
      }),
      (body) =>
        scope === "STORE"
          ? callOperation("resolveStoreReturn", {
              path: { id: request.id },
              body,
            })
          : scope === "ADMIN"
            ? callOperation("resolveAdminReturn", {
                path: { id: request.id },
                body,
              })
            : callOperation("respondOwnReturn", {
                path: { id: request.id },
                body,
              }),
      refresh,
    );
  }
  const optionalDispute = scope === "CUSTOMER" && request.conversion_status !== "PROPOSED";
  const ResolutionPanel = optionalDispute ? "details" : "section";
  return (
    <div className="market-return-decision">
      {scope !== "CUSTOMER" &&
        request.payment_method === "SANDBOX" &&
        request.type === "REFUND" &&
        request.status === "RECEIVED" &&
        !!request.refund_status && (
          <RefundRecoveryPanel orderId={request.order_id} scope={scope} />
        )}
      {actionable && (
        <form className={canInspect ? "return-inspection-form" : undefined}
          onSubmit={(event) => {
            event.preventDefault();
            void send(
              request.status === "REQUESTED"
                ? reject
                  ? "REJECTED"
                  : "APPROVED"
                : canInspect
                  ? "RECEIVED"
                  : exchanging
                    ? "EXCHANGE_SENT"
                    : "COMPLETED",
            );
          }}
        >
          {!canInspect && <h3>Xử lý yêu cầu</h3>}
          {request.status === "REQUESTED" && (
            <>
              <label>
                Quyết định
                <select
                  disabled={locked}
                  value={reject ? "REJECTED" : "APPROVED"}
                  onChange={(e) => setReject(e.target.value === "REJECTED")}
                >
                  <option value="APPROVED">Chấp thuận</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </label>
              {!reject && (
                <>
                  <label htmlFor={fieldId + "-fault"}>
                    Kết luận trách nhiệm
                  </label>
                  <select
                    id={fieldId + "-fault"}
                    disabled={locked}
                    value={fault}
                    onChange={(e) => setFault(e.target.value as typeof fault)}
                  >
                    <option value="DISPUTED">
                      Chưa thống nhất — chuyển Admin xem xét
                    </option>
                    <option value="STORE">
                      Lỗi Store — Store chịu phí đổi/trả
                    </option>
                    <option value="CUSTOMER">
                      Đổi ý / chọn sai — khách chịu phí đổi/trả
                    </option>
                  </select>
                  <p>
                    Kết luận cần có căn cứ, không tự suy từ lý do khách gửi.
                    Tiền hoàn vẫn gồm toàn bộ phí giao ban đầu; không trừ phí
                    gửi trả.
                  </p>
                  <label htmlFor={fieldId + "-instructions"}>
                    Hướng dẫn và địa chỉ gửi trả
                    {request.return_policy_snapshot
                      ? " (để trống dùng địa chỉ đã chốt khi mua)"
                      : ""}
                  </label>
                  <textarea
                    id={fieldId + "-instructions"}
                    required={!request.return_policy_snapshot}
                    maxLength={2000}
                    disabled={locked}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </>
              )}
            </>
          )}
          {request.status === "REQUESTED" && (
            <>
              <label htmlFor={fieldId + "-decision"}>
                Giải thích quyết định
              </label>
              <textarea
                id={fieldId + "-decision"}
                required
                maxLength={2000}
                disabled={locked}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </>
          )}
          {canInspect && (
            <>
              <ReturnInspectionFields items={items} lines={lines} locked={locked} id={fieldId}
                onChange={next => { setLines(next); if (!state.uncertain && !state.stale) state.setError(undefined); }} />
              <div className="return-inspection-notes">
              <label htmlFor={fieldId + "-inspection"}>Ghi chú kiểm hàng</label>
              <textarea
                id={fieldId + "-inspection"}
                rows={3}
                placeholder="Ví dụ: Đã nhận 1/2 balo, sản phẩm còn nguyên; chờ khách gửi bổ sung."
                required
                maxLength={2000}
                disabled={locked}
                value={inspectionNote}
                onChange={(e) => setInspectionNote(e.target.value)}
              />
              {(scope === "ADMIN" ||
                session?.context?.store_membership?.role === "OWNER") && (
                <details className="return-inspection-advanced">
                  <summary>Kiểm tra đơn cũ</summary>
                  <label>
                    Đối chiếu riêng cho đơn cũ thiếu nguồn xuất tồn (chỉ
                    Owner/Admin)
                    <textarea
                      maxLength={2000}
                      disabled={locked}
                      value={legacy}
                      onChange={(e) => setLegacy(e.target.value)}
                    />
                  </label>
                  <p>
                    Chỉ dùng khi thiếu chứng cứ kho cũ: ghi cách đối chiếu, để
                    lượng bán lại bằng0. Hệ thống không tự cộng tồn; nếu cần,
                    tạo điều chỉnh bù riêng với lý do.
                  </p>
                </details>
              )}
              </div>
            </>
          )}
          {exchanging && (
            <>
              <h4>Kiểm tra hàng đổi trước bàn giao</h4>
              <p>
                Chọn rõ từng phân loại gửi đổi, không tự dùng lại phân loại cũ.
                Chỉ đổi toàn bộ đơn, cùng sản phẩm và cùng giá đã mua; chưa hỗ
                trợ đổi riêng một món hoặc đổi khác giá. Mỗi lựa chọn áp dụng
                cho toàn bộ số lượng của dòng hàng gốc bên dưới. Lệnh kiểm tra
                và trừ tồn thực tế phải được xác nhận trước khi báo đã gửi.
              </p>
              {products.error ? (
                <>
                  <ErrorView
                    error={products.error}
                    onRetry={() => void products.refetch()}
                  />
                  <p>
                    Chưa đọc được lựa chọn hàng đổi. Có thể làm mới hoặc đề nghị
                    hoàn tiền để khách xác nhận.
                  </p>
                </>
              ) : (
                products.data?.map(({ item, product }, index) => {
                  const inputId =
                    fieldId + "-replacement-" + item.order_item_id;
                  return (
                    <fieldset key={item.order_item_id} disabled={locked}>
                      <legend>Đổi mục {index + 1}</legend>
                      <OrderItemIdentity
                        item={{ ...item, id: item.order_item_id }}
                      />
                      <label htmlFor={inputId}>
                        {String(
                          item.product_snapshot.title ?? item.sku_snapshot,
                        )}{" "}
                        — phân loại gửi đổi (mục {index + 1})
                      </label>
                      <select
                        id={inputId}
                        required
                        value={
                          replacements.find(
                            (row) => row.order_item_id === item.order_item_id,
                          )?.variant_id ?? ""
                        }
                        onChange={(e) =>
                          setReplacements(
                            replacements.map((row) =>
                              row.order_item_id === item.order_item_id
                                ? { ...row, variant_id: e.target.value }
                                : row,
                            ),
                          )
                        }
                      >
                        <option value="">Chọn phân loại</option>
                        {product.variants?.map((v) => (
                          <option
                            key={v.id}
                            value={v.id}
                            disabled={
                              v.status !== "ACTIVE" ||
                              typeof item.unit_price_vnd !== "number" ||
                              v.price_vnd !== item.unit_price_vnd
                            }
                          >
                            {variantLabel(v.variant_values, v.sku)} ·{" "}
                            {v.price_vnd.toLocaleString("vi-VN")} ₫
                            {v.status !== "ACTIVE"
                              ? " · Ngừng bán"
                              : typeof item.unit_price_vnd !== "number"
                                ? " · Chưa đối chiếu giá đã mua"
                                : v.price_vnd !== item.unit_price_vnd
                                  ? " · Khác giá đã mua — không hỗ trợ"
                                  : ""}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  );
                })
              )}
              {!['GHN','PLATFORM'].includes(request.shipping_mode??'')&&<label>
                Mã vận đơn / tham chiếu bàn giao hàng đổi
                <input
                  required
                  maxLength={200}
                  disabled={locked}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>}
            </>
          )}
          {request.status === "RECEIVED" && !ready && (
            <p role="status">
              Chờ đối chiếu biên bản và kho. Chưa thể hoàn tiền hoặc gửi đổi.
            </p>
          )}
          {refundPending && (
            <p>
              Chưa xác nhận hoàn tiền. Làm mới để kiểm tra, không hoàn lại lần nữa.
            </p>
          )}
          <div className={canInspect ? "return-inspection-actions" : undefined}>
          <button
            disabled={
              state.busy ||
              state.stale ||
              resolve.busy ||
              resolve.uncertain ||
              resolve.stale ||
              (!state.uncertain &&
                request.status !== "REQUESTED" &&
                !canInspect &&
                (!ready ||
                  refundPending ||
                  (request.type === "EXCHANGE" && !exchanging) ||
                  request.fault_party === "DISPUTED" ||
                  (exchanging && !exchangeSelectionReady)))
            }
          >
            {state.uncertain
              ? "Thử lại thao tác cũ"
              : request.status === "REQUESTED"
                ? "Lưu quyết định"
                : canInspect
                  ? state.busy ? "Đang lưu biên bản…" : "Lưu kiểm hàng"
                  : exchanging
                    ? ['GHN','PLATFORM'].includes(request.shipping_mode??'')?"Chuẩn bị hàng đổi":"Chuẩn bị hàng đổi"
                    : "Hoàn tất yêu cầu"}
          </button>
          <CaseFeedback state={state} reload={reload} />
          </div>
        </form>
      )}
      {["APPROVED", "RECEIVED"].includes(request.status) &&
        request.exchange_status !== "PENDING" &&
        request.exchange_status !== "APPLIED" &&
        ((scope === "STORE" && request.type === "EXCHANGE" && request.conversion_status !== "PROPOSED") ||
          (scope === "CUSTOMER" && (request.fault_party !== "DISPUTED" || (request.type === "EXCHANGE" && request.conversion_status === "PROPOSED"))) ||
          (scope === "ADMIN" && request.fault_party === "DISPUTED")) && (
          <ResolutionPanel>
            {optionalDispute
              ? <summary>Xem lại phí</summary>
              : <h3>Thống nhất cách xử lý</h3>}
            <label htmlFor={fieldId + "-resolution"}>
              Nội dung trao đổi / căn cứ
            </label>
            <textarea
              id={fieldId + "-resolution"}
              required
              maxLength={2000}
              disabled={locked}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
            {scope === "STORE" &&
              request.type === "EXCHANGE" &&
              request.conversion_status !== "PROPOSED" && (
                <button
                  disabled={locked || !resolutionNote.trim()}
                  onClick={() => void decide("PROPOSE_REFUND")}
                >
                  Đề nghị hoàn tiền
                </button>
              )}
            {scope === "CUSTOMER" &&
              request.type === "EXCHANGE" &&
              request.conversion_status === "PROPOSED" && (
                <>
                  <p>
                    Store đề nghị hoàn toàn bộ tiền đã thu, gồm phí giao ban
                    đầu. Chỉ chuyển sau khi bạn đồng ý; lịch sử yêu cầu đổi được
                    giữ.
                  </p>
                  <div className="ui-actions">
                    <button
                      disabled={locked || !resolutionNote.trim()}
                      onClick={() => void decide("ACCEPT_REFUND")}
                    >
                      Đồng ý hoàn tiền
                    </button>
                    <button
                      disabled={locked || !resolutionNote.trim()}
                      onClick={() => void decide("DECLINE_REFUND")}
                    >
                      Tiếp tục đổi
                    </button>
                  </div>
                </>
              )}
            {scope === "CUSTOMER" && request.fault_party !== "DISPUTED" && (
              <button
                disabled={locked || !resolutionNote.trim()}
                onClick={() => void decide("DISPUTE")}
              >
                Gửi tranh chấp
              </button>
            )}
            {scope === "ADMIN" && request.fault_party === "DISPUTED" && (
              <>
                <label>
                  Kết luận bên chịu phí
                  <select
                    disabled={locked}
                    value={resolutionFault}
                    onChange={(e) =>
                      setResolutionFault(
                        e.target.value as typeof resolutionFault,
                      )
                    }
                  >
                    <option value="STORE">Store có lỗi</option>
                    <option value="CUSTOMER">Khách đổi ý / chọn sai</option>
                  </select>
                </label>
                <button
                  disabled={locked || !resolutionNote.trim()}
                  onClick={() => void decide("RESOLVE")}
                >
                  Lưu kết luận
                </button>
              </>
            )}
            <CaseFeedback state={resolve} reload={reload} />
            {resolve.uncertain && resolve.saved && (
              <button
                disabled={resolve.busy}
                onClick={() => void decide(resolve.saved!.action)}
              >
                Thử lại
              </button>
            )}
          </ResolutionPanel>
        )}
    </div>
  );
}
