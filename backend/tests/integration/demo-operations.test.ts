import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DataSource } from "typeorm";
import { StockOperationsService } from "../../catalog-service/src/inventory/stock-operations.service";
import { OrderReturnService } from "../../commerce-service/src/order/order-return.service";
import { OrderService } from "../../commerce-service/src/order/order.service";
import { OrderInventoryRunner } from "../../commerce-service/src/order/order-inventory.runner";
import { schemaErrors } from "../../shared/src/contract-validation";
import bundle from "../../shared/src/contracts.runtime.generated.json";

async function isolated(url: string, service: string) {
  const admin = new DataSource({ type: "postgres", url });
  await admin.initialize();
  const schema = "ops_test_" + randomUUID().replace(/-/g, "");
  await admin.query("CREATE SCHEMA " + schema);
  const db = new DataSource({
    type: "postgres",
    url,
    extra: {
      options: "-csearch_path=" + schema + ",public",
      statement_timeout: 10000,
    },
  });
  await db.initialize();
  const folder = resolve(__dirname, "../../" + service + "/migrations");
  for (const file of readdirSync(folder)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.query(readFileSync(resolve(folder, file), "utf8"));
  return {
    db,
    close: async () => {
      await db.destroy();
      if (/^ops_test_[a-f0-9]{32}$/.test(schema))
        await admin.query("DROP SCHEMA " + schema + " CASCADE");
      await admin.destroy();
    },
  };
}
(process.env.M1_DATABASE_URL ? describe : describe.skip)(
  "Owner-approved stock changes in an isolated M1 schema",
  () => {
    let env: Awaited<ReturnType<typeof isolated>>,
      service: StockOperationsService;
    const store = randomUUID(),
      variant = randomUUID(),
      user = randomUUID(),
      staff = randomUUID(),
      owner = {
        user_id: user,
        store_membership: { store_id: store, role: "OWNER", permissions: [] },
      },
      seller = {
        user_id: staff,
        store_membership: {
          store_id: store,
          role: "SELLER",
          permissions: ["inventory.store.read_adjust"],
        },
      };
    const body = () => ({
      adjustment_kind: "RECEIPT" as const,
      variant_id: variant,
      delta_quantity: 3,
      reason: "Physical delivery counted",
      operation_id: randomUUID(),
      expected_version: 0,
      received_at: new Date(Date.now() - 60000).toISOString(),
      supplier_name: "Test supplier",
      source_reference: "RECEIPT-001",
    });
    beforeAll(async () => {
      env = await isolated(process.env.M1_DATABASE_URL!, "catalog-service");
      service = new StockOperationsService(env.db);
      const category = randomUUID(),
        type = randomUUID(),
        product = randomUUID();
      await env.db.query(
        "INSERT INTO category(id,name,slug,status) VALUES($1,'Test','test','ACTIVE')",
        [category],
      );
      await env.db.query(
        "INSERT INTO product_type(id,category_id,name,status) VALUES($1,$2,'Test','ACTIVE')",
        [type, category],
      );
      await env.db.query(
        "INSERT INTO product(id,store_id,product_type_id,title,status,moderation_status) VALUES($1,$2,$3,'Test','ACTIVE','VISIBLE')",
        [product, store, type],
      );
      await env.db.query(
        "INSERT INTO product_variant(id,product_id,store_id,sku,price_vnd,variant_signature,is_default,status) VALUES($1,$2,$3,'OPS',1000,'{}',true,'ACTIVE')",
        [variant, product, store],
      );
      await env.db.query(
        "INSERT INTO inventory(variant_id,store_id,quantity) VALUES($1,$2,10)",
        [variant, store],
      );
    });
    afterAll(async () => {
      await env?.close();
    });
    beforeEach(async () => {
      await env.db.query(
        "TRUNCATE stock_adjustment_request,stock_movement,operation_result,m1_audit",
      );
      await env.db.query(
        "UPDATE inventory SET quantity=10,reserved_quantity=0,version=0",
      );
    });
    test("Seller proposal does not mutate stock; Owner approval stores receipt, both actors and one ledger effect despite a replay", async () => {
      const input = body(),
        proposal = await service.create(input, seller, "stock-test");
      expect(
        (await env.db.query("SELECT quantity FROM inventory"))[0].quantity,
      ).toBe(10);
      const decision = {
        decision: "APPROVE" as const,
        reason: "Count and receipt verified",
        expected_version: 0,
        expected_inventory_version: 0,
        operation_id: randomUUID(),
      };
      await expect(
        service.decide(proposal.id, decision, seller, "stock-test"),
      ).rejects.toMatchObject({ status: 403 });
      const first = await service.decide(
        proposal.id,
        decision,
        owner,
        "stock-test",
      );
      expect(
        await service.decide(proposal.id, decision, owner, "stock-test"),
      ).toEqual(first);
      const [stock] = await env.db.query(
        "SELECT quantity,version FROM inventory",
      );
      expect(stock).toEqual({ quantity: 13, version: 1 });
      const rows = await env.db.query(
        "SELECT delta_quantity,actor_user_id,requested_by,supplier_name,source_reference FROM stock_movement",
      );
      expect(rows).toEqual([
        {
          delta_quantity: 3,
          actor_user_id: user,
          requested_by: staff,
          supplier_name: "Test supplier",
          source_reference: "RECEIPT-001",
        },
      ]);
      await expect(
        service.decide(
          proposal.id,
          { ...decision, reason: "Changed payload" },
          owner,
          "stock-test",
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
    test("concurrent approval is applied once and stale inventory does not partially approve", async () => {
      const proposal = await service.create(body(), seller, "stock-test");
      const make = () => ({
        decision: "APPROVE" as const,
        reason: "Owner confirmed",
        expected_version: 0,
        expected_inventory_version: 0,
        operation_id: randomUUID(),
      });
      const results = await Promise.allSettled([
        service.decide(proposal.id, make(), owner, "stock-test"),
        service.decide(proposal.id, make(), owner, "stock-test"),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(
        (await env.db.query("SELECT count(*)::int n FROM stock_movement"))[0].n,
      ).toBe(1);
      const next = await service.create(
        { ...body(), expected_version: 1 },
        seller,
        "stock-test",
      );
      await expect(
        service.decide(next.id, make(), owner, "stock-test"),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (
          await env.db.query(
            "SELECT status FROM stock_adjustment_request WHERE id=$1",
            [next.id],
          )
        )[0].status,
      ).toBe("PENDING");
    });
    test("a failing audit rolls back quantity, movement, approval and idempotency records", async () => {
      const proposal = await service.create(body(), seller, "stock-test");
      await env.db.query(
        "CREATE FUNCTION deny_stock_audit() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''audit failure''; END'",
      );
      await env.db.query(
        "CREATE TRIGGER deny_audit BEFORE INSERT ON m1_audit FOR EACH ROW EXECUTE FUNCTION deny_stock_audit()",
      );
      try {
        await expect(
          service.decide(
            proposal.id,
            {
              decision: "APPROVE",
              reason: "Verified",
              expected_version: 0,
              expected_inventory_version: 0,
              operation_id: randomUUID(),
            },
            owner,
            "stock-test",
          ),
        ).rejects.toThrow();
        expect(
          (await env.db.query("SELECT quantity FROM inventory"))[0].quantity,
        ).toBe(10);
        expect(
          (await env.db.query("SELECT count(*)::int n FROM stock_movement"))[0]
            .n,
        ).toBe(0);
        expect(
          (await env.db.query("SELECT status FROM stock_adjustment_request"))[0]
            .status,
        ).toBe("PENDING");
      } finally {
        await env.db.query("DROP TRIGGER deny_audit ON m1_audit");
        await env.db.query("DROP FUNCTION deny_stock_audit()");
      }
    });
    test("receipt summary separates manual intake from issued and returned stock", async () => {
      const p = await service.create(body(), seller, "stock-test");
      await service.decide(
        p.id,
        {
          decision: "APPROVE",
          reason: "Verified",
          expected_version: 0,
          expected_inventory_version: 0,
          operation_id: randomUUID(),
        },
        owner,
        "stock-test",
      );
      const result = await service.summary(
        {
          from: new Date(Date.now() - 86400000).toISOString(),
          to: new Date(Date.now() + 86400000).toISOString(),
        },
        owner,
      );
      expect(result.received_units).toBe(3);
      expect(result.issued_to_orders_units).toBe(0);
      expect(result.returned_units).toBe(0);
      await expect(
        service.list(
          {},
          {
            ...owner,
            store_membership: {
              ...owner.store_membership,
              store_id: randomUUID(),
            },
          },
        ),
      ).resolves.toMatchObject({ total: 0 });
    });
  },
);

(process.env.M2_DATABASE_URL ? describe : describe.skip)(
  "full-order returns in an isolated M2 schema",
  () => {
    let env: Awaited<ReturnType<typeof isolated>>, service: OrderReturnService;
    const user = randomUUID(),
      ownerId = randomUUID(),
      store = randomUUID(),
      product = randomUUID(),
      variant = randomUUID();
    const customer = { user_id: user, roles: ["CUSTOMER"] },
      owner = {
        user_id: ownerId,
        roles: ["STORE_OWNER"],
        store_membership: { store_id: store, role: "OWNER", permissions: [] },
      };
    async function seed(status = "COMPLETED", method = "COD", paid = true) {
      const id = randomUUID(),
        payment = randomUUID();
      await env.db.query(
        `INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,address_snapshot,status,payment_method,goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd,version,created_at) VALUES($1,$2,$3,$4,'{"recipient_name":"Fixture recipient","line1":"Fixture street"}',$5,$6,1000,0,0,0,1000,0,now())`,
        [id, randomUUID(), user, store, status, method],
      );
      await env.db.query(
        "INSERT INTO order_item(order_id,product_id,variant_id,product_snapshot,sku_snapshot,unit_price_vnd,quantity,line_total_vnd) VALUES($1,$2,$3,'{\"title\":\"Fixture product\"}','OPS',1000,1,1000)",
        [id, product, variant],
      );
      await env.db.query(
        "INSERT INTO payment(id,order_id,method,status,payable_vnd,collectible_vnd,collected_vnd) VALUES($1,$2,$3,$4,1000,$5,$6)",
        [
          payment,
          id,
          method,
          paid ? "SUCCEEDED" : "PENDING",
          method === "COD" ? 1000 : 0,
          paid ? 1000 : 0,
        ],
      );
      await env.db.query(
        "INSERT INTO order_inventory_state(order_id,reservation_ids,items_json,state,correlation_id) VALUES($1,$2,$3,'CONSUMED','return-test')",
        [
          id,
          [randomUUID()],
          JSON.stringify([
            { variant_id: variant, store_id: store, quantity: 1 },
          ]),
        ],
      );
      if (method === "SANDBOX" && paid)
        await env.db.query(
          "INSERT INTO payment_attempt(payment_id,provider_reference,provider,status,amount_vnd) VALUES($1,$2,'SEPAY_TEST','SUCCEEDED',1000)",
          [payment, randomUUID()],
        );
      return id;
    }
    async function request(id: string, failed = false) {
      return service.create(
        id,
        {
          reason: "Return requested",
          expected_order_version: 0,
          operation_id: randomUUID(),
        },
        failed ? owner : customer,
        "return-test",
        failed,
      );
    }
    async function receive(id: string, restock = true) {
      let read = await new OrderService(undefined, {
        source: env.db,
      }).getStoreOrder(id, owner, "return-test");
      if (read.return_case!.status === "REQUESTED")
        read = await service.decide(
          id,
          {
            action: "APPROVE",
            reason: "Approved",
            expected_version: 0,
            expected_order_version: read.version,
            operation_id: randomUUID(),
          },
          owner,
          "return-test",
        );
      return service.decide(
        id,
        {
          action: "RECEIVE",
          restock,
          reason: "Physical parcel counted",
          expected_version: read.return_case!.version,
          expected_order_version: read.version,
          operation_id: randomUUID(),
        },
        owner,
        "return-test",
      );
    }
    beforeAll(async () => {
      env = await isolated(process.env.M2_DATABASE_URL!, "commerce-service");
      service = new OrderReturnService(env.db);
    });
    afterAll(async () => {
      await env?.close();
    });
    beforeEach(async () => {
      await env.db.query(
        'TRUNCATE "order",checkout_attempt,operation_result,m2_audit CASCADE',
      );
    });
    test("Customer requests; Owner approves; receipt queues a durable Restock once and cash remains unpaid back", async () => {
      const id = await seed();
      const first = await request(id);
      expect(first.status).toBe("COMPLETED");
      expect(first.return_case?.status).toBe("REQUESTED");
      expect(
        (
          await env.db.query("SELECT command_kind FROM order_inventory_state")
        )[0].command_kind,
      ).toBeNull();
      const received = await receive(id);
      expect(received.status).toBe("RETURNED");
      expect(received.return_case).toMatchObject({
        status: "RECEIVED",
        stock_state: "CONSUMED",
        cash_refund_due_vnd: 1000,
      });
      expect(received.status_history?.at(-1)).toMatchObject({
        to_status: "RETURNED",
        actor_user_id: ownerId,
      });
      expect(received.address_snapshot?.recipient_name).toBe(
        "Fixture recipient",
      );
      expect(
        schemaErrors(
          received,
          bundle.operations.getStoreOrder.responses["200"],
        ),
      ).toEqual([]);
      let calls: any[] = [];
      const ledger = new Set<string>();
      const runner = new OrderInventoryRunner(env.db, async (op, body) => {
        calls.push({ op, body });
        if (!ledger.has(body.operation_id)) {
          ledger.add(body.operation_id);
          throw new Error("Lost ACK after apply");
        }
        return { status: "ALREADY_APPLIED", operation_id: body.operation_id };
      });
      await runner.process(id);
      await runner.process(id);
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual(calls[1]);
      expect(ledger.size).toBe(1);
      expect(
        (await env.db.query("SELECT state FROM order_inventory_state"))[0]
          .state,
      ).toBe("RESTOCKED");
      const cash = {
        operation_id: randomUUID(),
        expected_order_version: received.version,
        amount_vnd: 1000,
        cash_repaid: true,
      };
      await expect(
        service.cashRefund(
          id,
          { ...cash, cash_repaid: false },
          owner,
          "return-test",
        ),
      ).rejects.toMatchObject({ status: 422 });
      await expect(
        service.cashRefund(
          id,
          { ...cash, amount_vnd: 999 },
          owner,
          "return-test",
        ),
      ).rejects.toMatchObject({ status: 422 });
      const refunded = await service.cashRefund(id, cash, owner, "return-test");
      expect(refunded.payment_status).toBe("REFUNDED");
      expect(
        (await service.cashRefund(id, cash, owner, "return-test"))
          .payment_status,
      ).toBe("REFUNDED");
      expect(
        (await env.db.query("SELECT refunded_vnd FROM payment"))[0]
          .refunded_vnd,
      ).toBe("1000");
      expect(
        (await env.db.query("SELECT count(*)::int n FROM refund"))[0].n,
      ).toBe(1);
    });
    test("failed delivery is recorded while SHIPPED and damaged goods never enter saleable stock", async () => {
      const id = await seed("SHIPPED", "COD", false);
      const reported = await request(id, true);
      expect(reported.status).toBe("SHIPPED");
      expect(reported.return_case?.status).toBe("APPROVED");
      const result = await receive(id, false);
      expect(result.status).toBe("RETURNED");
      expect(result.payment_status).toBe("CANCELLED");
      expect(result.return_case).toMatchObject({
        stock_state: "QUARANTINED",
        cash_refund_due_vnd: 0,
      });
      expect(
        (
          await env.db.query("SELECT command_kind FROM order_inventory_state")
        )[0].command_kind,
      ).toBeNull();
      expect(
        (await env.db.query("SELECT count(*)::int n FROM refund"))[0].n,
      ).toBe(0);
    });
    test("paid online receipt records a requested Refund job, not fake payment success", async () => {
      const id = await seed("COMPLETED", "SANDBOX");
      await request(id);
      const result = await receive(id);
      expect(result.refund_status).toBe("REQUESTED");
      expect(
        (await env.db.query("SELECT status FROM refund_job"))[0].status,
      ).toBe("PENDING");
      expect(
        (await env.db.query("SELECT refunded_vnd FROM payment"))[0]
          .refunded_vnd,
      ).toBe("0");
    });
    test("foreign Customer, non-Owner and stale version cannot change a return", async () => {
      const id = await seed();
      await expect(
        service.create(
          id,
          {
            reason: "x",
            expected_order_version: 0,
            operation_id: randomUUID(),
          },
          { ...customer, user_id: randomUUID() },
          "return-test",
        ),
      ).rejects.toMatchObject({ status: 404 });
      await request(id);
      const body = {
        action: "APPROVE" as const,
        reason: "Approve",
        expected_version: 0,
        expected_order_version: 0,
        operation_id: randomUUID(),
      };
      await expect(
        service.decide(
          id,
          body,
          {
            ...owner,
            store_membership: { ...owner.store_membership, role: "SELLER" },
          },
          "return-test",
        ),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        service.decide(
          id,
          { ...body, expected_version: 2 },
          owner,
          "return-test",
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (await env.db.query("SELECT status FROM order_return"))[0].status,
      ).toBe("REQUESTED");
    });
    test("refund failure rolls back receipt, Order status and pending inventory command together", async () => {
      const id = await seed("COMPLETED", "SANDBOX");
      await request(id);
      const approved = await service.decide(
        id,
        {
          action: "APPROVE",
          reason: "Approved",
          expected_version: 0,
          expected_order_version: 0,
          operation_id: randomUUID(),
        },
        owner,
        "return-test",
      );
      await env.db.query("DELETE FROM payment_attempt");
      await expect(
        service.decide(
          id,
          {
            action: "RECEIVE",
            restock: true,
            reason: "Received",
            expected_version: approved.return_case!.version,
            expected_order_version: 0,
            operation_id: randomUUID(),
          },
          owner,
          "return-test",
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect((await env.db.query('SELECT status FROM "order"'))[0].status).toBe(
        "COMPLETED",
      );
      expect(
        (await env.db.query("SELECT status FROM order_return"))[0].status,
      ).toBe("APPROVED");
      expect(
        (
          await env.db.query("SELECT command_kind FROM order_inventory_state")
        )[0].command_kind,
      ).toBeNull();
    });
    test('cash-refund audit failure rolls back financial effects; concurrent confirmations refund once',async()=>{
      const id=await seed();await request(id);const returned=await receive(id);
      const first={operation_id:randomUUID(),expected_order_version:returned.version,amount_vnd:1000,cash_repaid:true};
      await env.db.query("CREATE FUNCTION deny_cod_refund_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action='COD_REFUND_CONFIRMED' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END$$");
      await env.db.query('CREATE TRIGGER deny_cash_audit BEFORE INSERT ON m2_audit FOR EACH ROW EXECUTE FUNCTION deny_cod_refund_audit()');
      try{await expect(service.cashRefund(id,first,owner,'return-test')).rejects.toThrow();expect((await env.db.query('SELECT refunded_vnd FROM payment'))[0].refunded_vnd).toBe('0');expect((await env.db.query('SELECT count(*)::int n FROM refund'))[0].n).toBe(0)}finally{await env.db.query('DROP TRIGGER deny_cash_audit ON m2_audit');await env.db.query('DROP FUNCTION deny_cod_refund_audit()')}
      const second={...first,operation_id:randomUUID()};const results=await Promise.allSettled([service.cashRefund(id,first,owner,'return-test'),service.cashRefund(id,second,owner,'return-test')]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await env.db.query('SELECT refunded_vnd FROM payment'))[0].refunded_vnd).toBe('1000');expect((await env.db.query('SELECT count(*)::int n FROM refund'))[0].n).toBe(1);
    });
    test("voucher suggestions enforce Store scope, minimum spend and Customer quota without reserving another use", async () => {
      const put = async (
        code: string,
        scope: string,
        storeId: string | null,
        min: number,
        limit = 2,
      ) => {
        const id = randomUUID();
        await env.db.query(
          "INSERT INTO voucher(id,code,scope,store_id,owner_user_id,discount_type,discount_value,min_goods_vnd,starts_at,ends_at,usage_limit,per_customer_limit,status,version) VALUES($1,$2,$3,$4,$5,'FIXED',100,$6,now()-interval '1 day',now()+interval '1 day',10,$7,'ACTIVE',0)",
          [id, code, scope, storeId, ownerId, min, limit],
        );
        return id;
      };
      await put("STORE100", "STORE", store, 500);
      await put("FOREIGN100", "STORE", randomUUID(), 0);
      await put("MIN2000", "PLATFORM", null, 2000);
      const used = await put("USED", "PLATFORM", null, 0, 1);
      await env.db.query(
        "INSERT INTO voucher_reservation(voucher_id,purchase_group_id,customer_user_id,status,discount_vnd,expires_at) VALUES($1,$2,$3,'ACTIVE',100,now()+interval '1 hour')",
        [used, randomUUID(), user],
      );
      const s = new OrderService(undefined, { source: env.db });
      jest
        .spyOn(s, "quoteCheckout")
        .mockResolvedValue({
          quote_id: randomUUID(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          payable_total_vnd: 1000,
          stores: [
            {
              store_id: store,
              amounts: {
                goods_vnd: 1000,
                store_discount_vnd: 0,
                platform_discount_vnd: 0,
                shipping_vnd: 0,
                payable_vnd: 1000,
              },
              items: [],
            },
          ],
        });
      const result = await s.suggestVouchers(
        {
          cart_item_ids: [randomUUID()],
          address_id: randomUUID(),
          payment_methods: { [store]: "COD" },
        },
        customer,
        "voucher-test",
      );
      expect(
        result.items.find((i) => i.voucher.code === "STORE100"),
      ).toMatchObject({ eligible: true, estimated_discount_vnd: 100 });
      expect(result.items.some((i) => i.voucher.code === "FOREIGN100")).toBe(
        false,
      );
      expect(
        result.items.find((i) => i.voucher.code === "USED")?.eligible,
      ).toBe(false);
      expect(
        result.items.find((i) => i.voucher.code === "MIN2000")?.eligible,
      ).toBe(false);
      expect(
        (
          await env.db.query("SELECT count(*)::int n FROM voucher_reservation")
        )[0].n,
      ).toBe(1);
    });
  },
);
