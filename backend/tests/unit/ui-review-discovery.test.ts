import { CatalogRepository } from "../../catalog-service/src/catalog/catalog.repository";
import { VoucherService } from "../../commerce-service/src/voucher/voucher.service";
import { ReviewService } from "../../catalog-service/src/review/review.service";
import { validateOperation } from "../../shared/src/request-contract";
const id = "11111111-1111-4111-8111-111111111111";
test("batch metadata preserves public visibility and count/page predicates", async () => {
  const manager = {
    query: jest
      .fn()
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]),
  };
  await new CatalogRepository(manager as any).page([id], {
    page: 1,
    size: 100,
    ids: id,
  });
  for (const [sql, args] of manager.query.mock.calls) {
    expect(sql).toContain("p.status='ACTIVE'");
    expect(sql).toContain("p.moderation_status='VISIBLE'");
    expect(sql).toContain("p.store_id=ANY($1::uuid[])");
    expect(sql).toContain("p.id=ANY($3::uuid[])");
    expect(args[2]).toEqual([id]);
  }
});
test.each(["bad", id + ",bad", Array(101).fill(id).join(",")])(
  "bad or excessive batch input fails validation",
  (ids) => {
    expect(() =>
      validateOperation("listProducts", { query: { ids } }),
    ).toThrow();
    expect(() =>
      validateOperation("listAvailableVouchers", { query: { store_ids: ids } }),
    ).toThrow();
  },
);
test("voucher suggestions count purchase groups, bind customer and requested Stores, never restore spent usage", async () => {
  const query = jest
    .fn()
    .mockResolvedValueOnce([{ total: 0 }])
    .mockResolvedValueOnce([]);
  const service = new VoucherService({ manager: { query } } as any);
  await expect(
    service.listAvailableVouchers(
      { store_ids: id, page: 2, size: 12 },
      { user_id: "buyer" },
    ),
  ).resolves.toEqual({ items: [], total: 0, page: 2, size: 12 });
  for (const [sql, args] of query.mock.calls) {
    expect(sql).toContain("v.status='ACTIVE'");
    expect(sql).toContain("v.store_id=ANY($1::uuid[])");
    expect(sql).toContain("UNION SELECT purchase_group_id");
    expect(sql).toContain("expires_at>now()");
    expect(args.slice(0, 2)).toEqual([[id], "buyer"]);
    expect(sql).not.toContain("order.status");
  }
  await expect(
    service.listAvailableVouchers({ store_ids: id }, {}),
  ).rejects.toMatchObject({ status: 401 });
  expect(query).toHaveBeenCalledTimes(2);
});
