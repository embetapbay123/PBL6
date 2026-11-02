import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DataSource } from "typeorm";
import { VoucherService } from "../../commerce-service/src/voucher/voucher.service";
import { NotificationService } from "../../commerce-service/src/notification/notification.service";
const suite = process.env.M2_DATABASE_URL ? describe : describe.skip;
suite(
  "UI review discovery and bulk notifications on isolated PostgreSQL schema",
  () => {
    let root: DataSource,
      db: DataSource,
      schema: string,
      vouchers: VoucherService;
    const store = randomUUID(),
      otherStore = randomUUID(),
      buyer = randomUUID(),
      other = randomUUID(),
      owner = randomUUID();
    const ownerAuth = {
      user_id: owner,
      roles: ["STORE_OWNER"],
      store_membership: {
        store_id: store,
        role: "OWNER",
        status: "ACTIVE",
        permissions: [],
      },
    };
    beforeAll(async () => {
      root = await new DataSource({
        type: "postgres",
        url: process.env.M2_DATABASE_URL,
      }).initialize();
      schema = "ui_review_" + randomUUID().replace(/-/g, "");
      await root.query("CREATE SCHEMA " + schema);
      db = await new DataSource({
        type: "postgres",
        url: process.env.M2_DATABASE_URL,
        extra: { options: "-csearch_path=" + schema + ",public" },
      }).initialize();
      const dir = resolve(__dirname, "../../commerce-service/migrations");
      for (const f of readdirSync(dir)
        .filter((n) => n.endsWith(".sql"))
        .sort())
        await db.query(readFileSync(resolve(dir, f), "utf8"));
      vouchers = new VoucherService(db);
    });
    afterAll(async () => {
      if (db?.isInitialized) await db.destroy();
      if (root?.isInitialized) {
        if (/^ui_review_[a-f0-9]{32}$/.test(schema))
          await root.query("DROP SCHEMA " + schema + " CASCADE");
        await root.destroy();
      }
    });
    async function order(
      customer = buyer,
      group = randomUUID(),
      orderStore = store,
    ) {
      const id = randomUUID();
      await db.query(
        `INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd) VALUES($1,$2,$3,$4,'PENDING','COD',0,0,0,0,0)`,
        [id, group, customer, orderStore],
      );
      return id;
    }
    async function create(code: string, over: Record<string, unknown> = {}) {
      return vouchers.createStoreVoucher(
        {
          code,
          scope: "STORE",
          discount_type: "FIXED",
          discount_value: 10000,
          min_goods_vnd: 50000,
          starts_at: "2020-01-01T00:00:00Z",
          ends_at: "2099-01-01T00:00:00Z",
          usage_limit: 2,
          per_customer_limit: 2,
          ...over,
        } as any,
        ownerAuth,
        "test",
      );
    }
    test("suggestions filter scope, stopped/expired/future, duplicate group redemptions and per-customer limits", async () => {
      const admin = {
        user_id: owner,
        roles: ["ADMIN"],
        role_permissions: ["platform.admin"],
      };
      const good = await vouchers.createPlatformVoucher(
        {
          code: "GOOD",
          scope: "PLATFORM",
          discount_type: "FIXED",
          discount_value: 10000,
          starts_at: "2020-01-01T00:00:00Z",
          ends_at: "2099-01-01T00:00:00Z",
          usage_limit: 2,
          per_customer_limit: 2,
        },
        admin,
        "test",
      );
      await create("EXPIRED", { ends_at: "2021-01-01T00:00:00Z" });
      await create("FUTURE", { starts_at: "2098-01-01T00:00:00Z" });
      const stopped = await create("STOPPED");
      await vouchers.updateStoreVoucher(
        stopped.id!,
        { expected_version: stopped.version!, status: "STOPPED" },
        ownerAuth,
        "stop",
      );
      const foreign = await vouchers.createStoreVoucher(
        {
          code: "FOREIGN",
          scope: "STORE",
          discount_type: "FIXED",
          discount_value: 1,
          starts_at: "2020-01-01T00:00:00Z",
          ends_at: "2099-01-01T00:00:00Z",
          usage_limit: 2,
          per_customer_limit: 1,
        },
        {
          ...ownerAuth,
          store_membership: {
            ...ownerAuth.store_membership,
            store_id: otherStore,
          },
        },
        "other",
      );
      const group = randomUUID(),
        o1 = await order(buyer, group),
        o2 = await order(buyer, group, otherStore);
      for (const o of [o1, o2])
        await db.query(
          "INSERT INTO voucher_redemption(voucher_id,purchase_group_id,order_id,customer_user_id,discount_vnd) VALUES($1,$2,$3,$4,10000)",
          [good.id, group, o, buyer],
        );
      expect(
        (
          await vouchers.listAvailableVouchers(
            { store_ids: store },
            { user_id: buyer },
          )
        ).items.map((v) => v.code),
      ).toEqual(["GOOD"]);
      const own = await vouchers.listPlatformVouchers({}, admin, "read");
      expect(
        own.items.find((v) => v.code === "GOOD")?.usage_summary,
      ).toMatchObject({
        redeemed_count: 1,
        reserved_count: 0,
        remaining_count: 1,
      });
      expect(
        (await vouchers.listStoreVouchers({}, ownerAuth, "scope")).items.some(
          (v) => v.id === foreign.id,
        ),
      ).toBe(false);
      const nextGroup = randomUUID(),
        o3 = await order(buyer, nextGroup);
      await db.query(
        "INSERT INTO voucher_redemption(voucher_id,purchase_group_id,order_id,customer_user_id,discount_vnd) VALUES($1,$2,$3,$4,10000)",
        [good.id, nextGroup, o3, buyer],
      );
      expect(
        (
          await vouchers.listAvailableVouchers(
            { store_ids: store },
            { user_id: buyer },
          )
        ).items,
      ).toHaveLength(0);
    });
    test("bulk read affects only owned events, is idempotent and leaves later events unread", async () => {
      const owned = await order(),
        foreign = await order(other);
      for (const [o, user] of [
        [owned, buyer],
        [foreign, other],
      ])
        await db.query(
          "INSERT INTO order_status_history(order_id,to_status,actor_user_id,operation_id) VALUES($1,'PENDING',$2,$3)",
          [o, user, randomUUID()],
        );
      const service = new NotificationService(db);
      const before = await service.list(buyer);
      expect(before.unread).toBe(1);
      expect(await service.markAllRead(buyer)).toEqual({ updated: 1 });
      expect(await service.markAllRead(buyer)).toEqual({ updated: 0 });
      expect((await service.list(buyer)).unread).toBe(0);
      expect((await service.list(other)).unread).toBe(1);
      await db.query(
        "INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,operation_id) VALUES($1,'PENDING','CONFIRMED',$2,$3)",
        [owned, buyer, randomUUID()],
      );
      expect((await service.list(buyer)).unread).toBe(1);
    });
  },
);
