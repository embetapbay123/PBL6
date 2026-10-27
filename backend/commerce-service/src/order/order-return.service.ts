import { DataSource, EntityManager } from "typeorm";
import { database } from "../../../shared/src/database";
import { ApiError } from "../../../shared/src/errors";
import { once } from "../../../shared/src/idempotency";
import { audit } from "../../../shared/src/audit";
import {
  OperationInputs,
  OperationOutputs,
} from "../../../shared/src/operations.generated";
import { requireStorePermission } from "../scope";
import { OrderRepository } from "./order.repository";
import { OrderService } from "./order.service";
import {
  changeOrderStatus,
  requestClosedRefund,
  queueInventoryCommand,
} from "./order-inventory.runner";
import { PaymentService } from "../payment/payment.service";

function owner(auth: any) {
  const store = requireStorePermission(auth, "order.store.read_status_cancel");
  if (auth.store_membership.role !== "OWNER")
    throw new ApiError(
      403,
      "OWNER_CONFIRMATION_REQUIRED",
      "Chủ gian hàng phải xác nhận hàng hoàn và hoàn tiền.",
    );
  return store;
}
export class OrderReturnService {
  constructor(private readonly source: DataSource = database) {}
  private read(id: string, auth: any, store: boolean) {
    const reader = new OrderService(undefined, { source: this.source });
    return store
      ? reader.getStoreOrder(id, auth, "return-read")
      : reader.getOwnOrder(id, auth, "return-read");
  }
  private async locked(
    manager: EntityManager,
    id: string,
    auth: any,
    store: boolean,
  ) {
    const repo = new OrderRepository(manager);
    const order = store
      ? await repo.lockStoreOrderById(id, owner(auth))
      : await repo.lockCustomerOrderById(id, auth.user_id);
    if (!order)
      throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn của bạn.");
    return order;
  }
  async create(
    id: string,
    input: OperationInputs["requestOrderReturn"]["body"],
    auth: any,
    correlation: string,
    failedDelivery = false,
  ): Promise<OperationOutputs["requestOrderReturn"]> {
    if (!auth?.user_id)
      throw new ApiError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.");
    if (!input.reason.trim())
      throw new ApiError(422, "REASON_REQUIRED", "Cần lý do trả hàng.");
    await this.source.transaction(async (manager) => {
      const order = await this.locked(manager, id, auth, failedDelivery);
      await once(
        manager,
        "M2.Return.create",
        input.operation_id,
        { ...input, id, actor: auth.user_id, failedDelivery },
        async () => {
          if (order.version !== input.expected_order_version)
            throw new ApiError(409, "VERSION_CONFLICT", "Đơn đã thay đổi.");
          if (order.status !== (failedDelivery ? "SHIPPED" : "COMPLETED"))
            throw new ApiError(
              409,
              "RETURN_NOT_ALLOWED",
              "Chỉ báo giao thất bại khi đang giao; khách trả hàng sau khi đã nhận.",
            );
          const [existing] = await manager.query(
            "SELECT id FROM order_return WHERE order_id=$1",
            [id],
          );
          if (existing)
            throw new ApiError(
              409,
              "RETURN_ALREADY_EXISTS",
              "Đơn đã có hồ sơ trả hàng.",
            );
          const [row] = await manager.query(
            `INSERT INTO order_return(order_id,kind,status,reason,requested_by,decided_by,decided_at,decision_reason) VALUES($1,$2,$3,$4,$5,$6,CASE WHEN $6::uuid IS NULL THEN NULL ELSE now() END,$7) RETURNING id`,
            [
              id,
              failedDelivery ? "DELIVERY_FAILED" : "CUSTOMER_RETURN",
              failedDelivery ? "APPROVED" : "REQUESTED",
              input.reason.trim(),
              auth.user_id,
              failedDelivery ? auth.user_id : null,
              failedDelivery ? input.reason.trim() : null,
            ],
          );
          await audit(
            manager,
            "M2",
            auth.user_id,
            "OrderReturn",
            row.id,
            failedDelivery ? "DELIVERY_FAILED" : "RETURN_REQUESTED",
            correlation,
            {},
            { order_id: id, reason: input.reason.trim() },
          );
          return { id: row.id };
        },
      );
    });
    return this.read(id, auth, failedDelivery);
  }
  async decide(
    id: string,
    input: OperationInputs["decideOrderReturn"]["body"],
    auth: any,
    correlation: string,
  ): Promise<OperationOutputs["decideOrderReturn"]> {
    owner(auth);
    if (!input.reason.trim())
      throw new ApiError(422, "REASON_REQUIRED", "Cần lý do quyết định.");
    await this.source.transaction(async (manager) => {
      const order = await this.locked(manager, id, auth, true);
      await once(
        manager,
        "M2.Return.decide",
        input.operation_id,
        { ...input, id, actor: auth.user_id },
        async () => {
          if (order.version !== input.expected_order_version)
            throw new ApiError(409, "VERSION_CONFLICT", "Đơn đã thay đổi.");
          const payment = await new OrderRepository(
            manager,
          ).lockPaymentByOrderId(id);
          const [stock] = await manager.query(
            "SELECT * FROM order_inventory_state WHERE order_id=$1 FOR UPDATE",
            [id],
          );
          const [row] = await manager.query(
            "SELECT * FROM order_return WHERE order_id=$1 FOR UPDATE",
            [id],
          );
          if (!row)
            throw new ApiError(
              404,
              "NOT_FOUND",
              "Đơn chưa có yêu cầu trả hàng.",
            );
          if (row.version !== input.expected_version)
            throw new ApiError(
              409,
              "VERSION_CONFLICT",
              "Hồ sơ trả hàng đã thay đổi.",
            );
          const target =
            input.action === "APPROVE"
              ? "APPROVED"
              : input.action === "REJECT"
                ? "REJECTED"
                : "RECEIVED";
          if (input.action === "RECEIVE") {
            if (
              row.status !== "APPROVED" ||
              !["SHIPPED", "COMPLETED"].includes(order.status) ||
              typeof input.restock !== "boolean"
            )
              throw new ApiError(
                409,
                "RETURN_STATE_CONFLICT",
                "Cần hồ sơ đã duyệt, hàng đã nhận thực tế và kết quả kiểm tra hàng.",
              );
            if (
              !payment ||
              !stock ||
              stock.state !== "CONSUMED" ||
              stock.command_kind
            )
              throw new ApiError(
                409,
                "RETURN_RECONCILIATION_REQUIRED",
                "Cần đối soát trạng thái tiền/kho trước khi nhận hàng hoàn.",
              );
            if (
              (payment.method === "SANDBOX" &&
                payment.status !== "SUCCEEDED") ||
              (payment.method === "COD" &&
                !["PENDING", "SUCCEEDED"].includes(payment.status))
            )
              throw new ApiError(
                409,
                "PAYMENT_RECONCILIATION_REQUIRED",
                "Trạng thái tiền cần đối soát trước khi nhận hàng hoàn.",
              );
            const uncertain = await manager.query(
              "SELECT id FROM payment_attempt WHERE payment_id=$1 AND status='UNKNOWN'",
              [payment.id],
            );
            if (uncertain.length)
              throw new ApiError(
                409,
                "PAYMENT_RECONCILIATION_REQUIRED",
                "Giao dịch đang cần đối soát.",
              );
            const updated = await changeOrderStatus(
              manager,
              order,
              "RETURNED",
              input.reason.trim(),
              correlation,
              auth.user_id,
            );
            if (input.restock)
              await queueInventoryCommand(manager, id, "RESTOCK", correlation);
            else
              await manager.query(
                "UPDATE order_inventory_state SET state='QUARANTINED',updated_at=now() WHERE order_id=$1",
                [id],
              );
            await manager.query(
              "UPDATE order_return SET status=$2,received_by=$3,received_at=now(),restock=$4,decision_reason=$5,version=version+1 WHERE order_id=$1",
              [id, target, auth.user_id, input.restock, input.reason.trim()],
            );
            if (payment.method === "COD" && payment.status === "PENDING") {
              await manager.query(
                "UPDATE payment SET status='CANCELLED',version=version+1 WHERE id=$1",
                [payment.id],
              );
              await manager.query(
                "UPDATE c_o_d_collection SET status='CANCELLED' WHERE order_id=$1 AND status='PENDING'",
                [id],
              );
            }
            await requestClosedRefund(manager, updated, payment, correlation);
          } else {
            if (row.status !== "REQUESTED")
              throw new ApiError(
                409,
                "RETURN_STATE_CONFLICT",
                "Chỉ duyệt hoặc từ chối hồ sơ đang chờ.",
              );
            await manager.query(
              "UPDATE order_return SET status=$2,decided_by=$3,decided_at=now(),decision_reason=$4,version=version+1 WHERE order_id=$1",
              [id, target, auth.user_id, input.reason.trim()],
            );
          }
          await audit(
            manager,
            "M2",
            auth.user_id,
            "OrderReturn",
            row.id,
            "RETURN_" + target,
            correlation,
            { status: row.status, version: row.version },
            {
              status: target,
              reason: input.reason.trim(),
              ...(input.action === "RECEIVE" ? { restock: input.restock } : {}),
            },
          );
          return { status: target };
        },
      );
    });
    return this.read(id, auth, true);
  }
  async cashRefund(
    id: string,
    input: OperationInputs["recordReturnCodRefund"]["body"],
    auth: any,
    correlation: string,
  ): Promise<OperationOutputs["recordReturnCodRefund"]> {
    owner(auth);
    if (input.cash_repaid !== true)
      throw new ApiError(
        422,
        "CASH_CONFIRMATION_REQUIRED",
        "Chỉ ghi nhận sau khi đã thực sự trả tiền mặt cho khách.",
      );
    await this.source.transaction(async (manager) => {
      const order = await this.locked(manager, id, auth, true);
      await once(
        manager,
        "M2.Return.cash",
        input.operation_id,
        { ...input, id, actor: auth.user_id },
        async () => {
          if (order.version !== input.expected_order_version)
            throw new ApiError(409, "VERSION_CONFLICT", "Đơn đã thay đổi.");
          const [row] = await manager.query(
            "SELECT * FROM order_return WHERE order_id=$1",
            [id],
          );
          if (row?.status !== "RECEIVED")
            throw new ApiError(
              409,
              "RETURN_STATE_CONFLICT",
              "Chỉ hoàn tiền khi Store đã nhận hàng trả.",
            );
          await new PaymentService(manager).recordCodRefund({
            order_id: id,
            amount_vnd: BigInt(input.amount_vnd),
            operation_id: input.operation_id,
            actor_user_id: auth.user_id,
            correlation_id: correlation,
          });
        if(!await new OrderRepository(manager).incrementOrderVersion(id,order.version))
          throw new ApiError(409,'VERSION_CONFLICT','Đơn thay đổi trong lúc ghi nhận hoàn COD.');
          return { status: "SUCCEEDED" };
        },
      );
    });
    return this.read(id, auth, true);
  }
}
