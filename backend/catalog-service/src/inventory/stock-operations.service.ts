import { database } from "../../../shared/src/database";
import { ApiError } from "../../../shared/src/errors";
import { once } from "../../../shared/src/idempotency";
import { audit } from "../../../shared/src/audit";
import { moneyNumber } from "../../../shared/src/money";
import { InventoryRepository } from "./inventory.repository";
import { InventoryService, hasInventoryPermission } from "./inventory.service";
import type {
  OperationInputs,
  OperationOutputs,
} from "../../../shared/src/operations.generated";
import { DataSource } from "typeorm";

function scope(auth: any, owner = false) {
  const m = auth?.store_membership;
  if (
    !auth?.user_id ||
    !m?.store_id ||
    !hasInventoryPermission(m.role, m.permissions ?? []) ||
    (owner && m.role !== "OWNER")
  )
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Cần quyền kho; thay đổi phải do Owner duyệt.",
    );
  return m.store_id as string;
}
function view(row: any): OperationOutputs["createStockRequest"] {
  const result: any = {};
  for (const key of [
    "id",
    "store_id",
    "variant_id",
    "requested_by",
    "delta_quantity",
    "adjustment_kind",
    "reason",
    "status",
    "version",
    "supplier_name",
    "source_reference",
    "decided_by",
    "decision_reason",
  ])
    if (row[key] != null) result[key] = row[key];
  for (const key of ["created_at", "received_at", "decided_at"])
    if (row[key] != null) result[key] = new Date(row[key]).toISOString();
  return result;
}
export class StockOperationsService {
  constructor(private readonly source: DataSource = database) {}
  async list(
    query: OperationInputs["listStockRequests"]["query"],
    auth: any,
  ): Promise<OperationOutputs["listStockRequests"]> {
    const store = scope(auth),
      page = query.page ?? 1,
      size = query.size ?? 20;
    const [count] = await this.source.query(
      "SELECT count(*)::int total FROM stock_adjustment_request WHERE store_id=$1",
      [store],
    );
    const rows = await this.source.query(
      "SELECT * FROM stock_adjustment_request WHERE store_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3",
      [store, size, (page - 1) * size],
    );
    return { items: rows.map(view), total: count.total, page, size };
  }
  async create(
    input: OperationInputs["createStockRequest"]["body"],
    auth: any,
    correlation: string,
  ): Promise<OperationOutputs["createStockRequest"]> {
    if (
      input.adjustment_kind === "RECEIPT" &&
      (input.delta_quantity <= 0 || !input.received_at)
    )
      throw new ApiError(
        422,
        "INVALID_RECEIPT",
        "Nhập hàng cần số lượng dương và ngày nhận.",
      );
    const store = scope(auth);
    if (
      !input.delta_quantity ||
      !input.reason.trim() ||
      (input.received_at && Date.parse(input.received_at) > Date.now() + 300000)
    )
      throw new ApiError(
        422,
        "INVALID_STOCK_REQUEST",
        "Kiểm tra số lượng, lý do và ngày nhận hàng.",
      );
    return this.source.transaction((manager) =>
      once(
        manager,
        "M1.Stock.propose",
        input.operation_id,
        { ...input, store_id: store, actor: auth.user_id },
        async () => {
          const inventory = await new InventoryRepository(
            manager,
          ).lockStoreInventory(store, input.variant_id);
          if (!inventory)
            throw new ApiError(
              404,
              "NOT_FOUND",
              "Không tìm thấy phân loại trong Store.",
            );
          if (inventory.version !== input.expected_version)
            throw new ApiError(409, "VERSION_CONFLICT", "Tồn kho đã thay đổi.");
          const [row] = await manager.query(
            `INSERT INTO stock_adjustment_request(store_id,variant_id,requested_by,delta_quantity,reason,received_at,supplier_name,source_reference,expected_inventory_version,adjustment_kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [
              store,
              input.variant_id,
              auth.user_id,
              input.delta_quantity,
              input.reason.trim(),
              input.received_at ?? null,
              input.supplier_name?.trim() ?? null,
              input.source_reference?.trim() ?? null,
              input.expected_version,
              input.adjustment_kind ?? "CORRECTION",
            ],
          );
          await audit(
            manager,
            "M1",
            auth.user_id,
            "StockRequest",
            row.id,
            "STOCK_CHANGE_PROPOSED",
            correlation,
            {},
            view(row),
          );
          return view(row);
        },
      ),
    );
  }
  async decide(
    id: string,
    input: OperationInputs["decideStockRequest"]["body"],
    auth: any,
    correlation: string,
  ): Promise<OperationOutputs["decideStockRequest"]> {
    const store = scope(auth, true);
    if (!input.reason.trim())
      throw new ApiError(422, "REASON_REQUIRED", "Cần ghi lý do quyết định.");
    return this.source.transaction((manager) =>
      once(
        manager,
        "M1.Stock.decide",
        input.operation_id,
        { ...input, id, store_id: store, actor: auth.user_id },
        async () => {
          const [row] = await manager.query(
            "SELECT * FROM stock_adjustment_request WHERE id=$1 AND store_id=$2 FOR UPDATE",
            [id, store],
          );
          if (!row)
            throw new ApiError(
              404,
              "NOT_FOUND",
              "Không tìm thấy đề nghị của Store.",
            );
          if (
            row.version !== input.expected_version ||
            row.status !== "PENDING"
          )
            throw new ApiError(
              409,
              "VERSION_CONFLICT",
              "Đề nghị đã được xử lý hoặc thay đổi.",
            );
          if (input.decision === "APPROVE")
            await new InventoryService().applyAdjustment(
              manager,
              {
                variant_id: row.variant_id,
                adjustment_kind: row.adjustment_kind,
                delta_quantity: row.delta_quantity,
                reason: row.reason,
                operation_id: input.operation_id,
                expected_version: input.expected_inventory_version,
                ...(row.received_at
                  ? { received_at: new Date(row.received_at).toISOString() }
                  : {}),
                ...(row.supplier_name
                  ? { supplier_name: row.supplier_name }
                  : {}),
                ...(row.source_reference
                  ? { source_reference: row.source_reference }
                  : {}),
              },
              auth,
              correlation,
              row.requested_by,
              id,
            );
          await manager.query(
            "UPDATE stock_adjustment_request SET status=$2,decided_by=$3,decided_at=now(),decision_reason=$4,version=version+1 WHERE id=$1",
            [
              id,
              input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
              auth.user_id,
              input.reason.trim(),
            ],
          );
          const [updated] = await manager.query(
            "SELECT * FROM stock_adjustment_request WHERE id=$1",
            [id],
          );
          await audit(
            manager,
            "M1",
            auth.user_id,
            "StockRequest",
            id,
            "STOCK_CHANGE_" + updated.status,
            correlation,
            view(row),
            view(updated),
          );
          return view(updated);
        },
      ),
    );
  }
  async summary(
    input: OperationInputs["getInventorySummary"]["query"],
    auth: any,
  ): Promise<OperationOutputs["getInventorySummary"]> {
    const store = scope(auth);
    if (Date.parse(input.from) >= Date.parse(input.to))
      throw new ApiError(
        422,
        "INVALID_PERIOD",
        "Ngày kết thúc phải sau ngày bắt đầu.",
      );
    const [row] = await this.source.query(
      `SELECT
   coalesce(sum(greatest(m.delta_quantity,0)) FILTER(WHERE m.order_id IS NULL AND m.movement_kind='RECEIPT'),0)::text received_units,
   coalesce(sum(m.delta_quantity) FILTER(WHERE m.order_id IS NULL AND m.delta_quantity>0 AND m.movement_kind='CORRECTION'),0)::text adjusted_in_units,
   coalesce(sum(m.delta_quantity) FILTER(WHERE m.order_id IS NULL AND m.delta_quantity>0 AND m.movement_kind IS NULL AND m.reason NOT IN ('DEMO_OPENING_STOCK','OPENING_STOCK')),0)::text unclassified_in_units,
   coalesce(sum(-m.delta_quantity) FILTER(WHERE m.order_id IS NOT NULL AND m.delta_quantity<0),0)::text issued_to_orders_units,
   coalesce(sum(m.delta_quantity) FILTER(WHERE m.order_id IS NOT NULL AND m.delta_quantity>0),0)::text returned_units,
   coalesce(sum(-m.delta_quantity) FILTER(WHERE m.order_id IS NULL AND m.delta_quantity<0),0)::text adjusted_out_units,
   coalesce(sum(m.delta_quantity) FILTER(WHERE m.reason IN ('DEMO_OPENING_STOCK','OPENING_STOCK')),0)::text opening_units
   FROM stock_movement m JOIN inventory i ON i.id=m.inventory_id WHERE i.store_id=$1 AND coalesce(m.received_at,m.created_at)>=$2 AND coalesce(m.received_at,m.created_at)<$3`,
      [store, input.from, input.to],
    );
    return {
      period_start: new Date(input.from).toISOString(),
      period_end: new Date(input.to).toISOString(),
      received_units: moneyNumber(row.received_units),
      adjusted_in_units: moneyNumber(row.adjusted_in_units),
      unclassified_in_units: moneyNumber(row.unclassified_in_units),
      issued_to_orders_units: moneyNumber(row.issued_to_orders_units),
      returned_units: moneyNumber(row.returned_units),
      adjusted_out_units: moneyNumber(row.adjusted_out_units),
      opening_units: moneyNumber(row.opening_units),
    };
  }
}
