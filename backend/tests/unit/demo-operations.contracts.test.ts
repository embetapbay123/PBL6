import { validateOperation } from "../../shared/src/request-contract";
import { InventoryService } from "../../catalog-service/src/inventory/inventory.service";
import fixtures from "../../shared/src/fixtures.generated.json";
const f = fixtures as any;
test("return receipt requires real booleans, versions, scoped UUIDs and a known action", () => {
  for (const body of [
    { ...f.decideOrderReturn.request.body, restock: "false" },
    { ...f.decideOrderReturn.request.body, action: "CANCEL" },
    { ...f.decideOrderReturn.request.body, expected_version: -1 },
    { ...f.decideOrderReturn.request.body, operation_id: "bad-id" },
  ]) {
    expect(() =>
      validateOperation("decideOrderReturn", {
        ...f.decideOrderReturn.request,
        body,
      }),
    ).toThrow();
  }
  expect(() =>
    validateOperation("recordReturnCodRefund", {
      ...f.recordReturnCodRefund.request,
      body: { ...f.recordReturnCodRefund.request.body, cash_repaid: "true" },
    }),
  ).toThrow();
  expect(() =>
    validateOperation("createStockRequest", {
      ...f.createStockRequest.request,
      body: {
        ...f.createStockRequest.request.body,
        received_at: "2026-02-30T00:00:00Z",
      },
    }),
  ).toThrow();
});
test("a Seller cannot apply stock directly even with the inventory permission", async () => {
  const manager: any = {
    queryRunner: { isTransactionActive: true },
    query: jest.fn(),
  };
  await expect(
    new InventoryService().applyAdjustment(
      manager,
      f.adjustInventory.request.body,
      {
        user_id: "u",
        store_membership: {
          store_id: "s",
          role: "SELLER",
          permissions: ["inventory.store.read_adjust"],
        },
      },
      "corr",
    ),
  ).rejects.toMatchObject({ status: 403 });
  expect(manager.query).not.toHaveBeenCalled();
});
