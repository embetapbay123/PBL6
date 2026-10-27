import type { OperationOutputs } from "../../../shared/src/operations.generated";
import { moneyNumber } from "../../../shared/src/money";
export function returnView(
  row: any,
): OperationOutputs["requestOrderReturn"]["return_case"] {
  if (!row) return undefined;
  const result: any = {};
  for (const key of [
    "id",
    "order_id",
    "kind",
    "status",
    "reason",
    "requested_by",
    "version",
    "decided_by",
    "decision_reason",
    "received_by",
    "restock",
    "stock_state",
  ])
    if (row[key] != null) result[key] = row[key];
  for (const key of ["requested_at", "decided_at", "received_at"])
    if (row[key] != null) result[key] = new Date(row[key]).toISOString();
  result.cash_refund_due_vnd =
    row.payment_method === "COD" && row.payment_status === "SUCCEEDED"
      ? moneyNumber(
          BigInt(row.collected_vnd ?? 0) - BigInt(row.refunded_vnd ?? 0),
        )
      : 0;
  return result;
}
