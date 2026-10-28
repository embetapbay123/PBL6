import { test, expect, Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixtures = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "62000000-0000-4000-8000-" + String(n).padStart(12, "0");
const store = id(1),
  variant = id(2),
  orderId = id(3),
  product = id(4),
  item = id(5),
  address = id(6),
  user = id(7);
const amounts = {
  goods_vnd: 100000,
  store_discount_vnd: 0,
  platform_discount_vnd: 0,
  shipping_vnd: 10000,
  payable_vnd: 110000,
};
const baseOrder = {
  id: orderId,
  store_id: store,
  purchase_group_id: id(9),
  status: "SHIPPED",
  version: 4,
  payment_method: "COD",
  payment_status: "PENDING",
  amounts,
  inventory_state: "CONSUMED",
  items: [
    {
      id: item,
      variant_id: variant,
      product_snapshot: { title: "Purchased item" },
      sku_snapshot: "DEMO-SKU",
      quantity: 1,
      unit_price_vnd: 100000,
    },
  ],
  created_at: "2026-10-24T03:00:00Z",
  address_snapshot: {
    recipient_name: "Actual recipient",
    phone: "0900000000",
    line1: "Actual saved street",
    city: "Da Nang",
  },
  status_history: [
    {
      id: id(10),
      from_status: "PROCESSING",
      to_status: "SHIPPED",
      created_at: "2026-10-25T03:00:00Z",
      actor_user_id: user,
      reason: "Handed to delivery",
    },
  ],
};
const pageData = (items: any[], size = 20) => ({
  items,
  total: items.length,
  page: 1,
  size,
});
type Call = { path: string; method: string; body: any };
type Handler = (route: Route, call: Call) => Promise<unknown> | undefined;
async function setup(
  page: Page,
  role: "CUSTOMER" | "OWNER" | "SELLER" | "ADMIN",
  handler?: Handler,
) {
  const calls: Call[] = [];
  const context = {
    user_id: user,
    roles:
      role === 'ADMIN' ? ['ADMIN'] : role === "OWNER"
        ? ["CUSTOMER", "STORE_OWNER"]
        : role === "SELLER"
          ? ["CUSTOMER", "SELLER"]
          : ["CUSTOMER"],
    role_permissions: [],
    token_version: 0,
    ...(role === "CUSTOMER" || role === 'ADMIN'
      ? {}
      : {
          store_membership: {
            store_id: store,
            role,
            status: "ACTIVE",
            permissions: [
              "inventory.store.read_adjust",
              "order.store.read_status_cancel",
              "cod.store.collect",
              "product.store.read_write",
            ],
          },
        }),
  };
  await page.route("**/api/v1/**", (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/v1", ""),
      call = {
        path,
        method: req.method(),
        body: req.postData() ? req.postDataJSON() : undefined,
      };
    calls.push(call);
    const result = handler?.(route, call);
    if (result) return result;
    if (["/auth/login", "/auth/refresh"].includes(path))
      return route.fulfill({
        json: { ...fixtures.login.response, context },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (path === "/store/orders")
      return route.fulfill({ json: pageData([baseOrder]) });
    if (path === "/store/orders/" + orderId || path === "/me/orders/" + orderId)
      return route.fulfill({ json: baseOrder });
    if (path === "/store/inventory")
      return route.fulfill({
        json: pageData([
          {
            variant_id: variant,
            quantity: 12,
            reserved_quantity: 2,
            available_quantity: 10,
            version: 7,
          },
        ]),
      });
    if (path === "/store/inventory/summary")
      return route.fulfill({
        json: {
          ...fixtures.getInventorySummary.response,
          received_units: 7,
          adjusted_in_units: 2,
          issued_to_orders_units: 4,
        },
      });
    if (
      path === "/store/inventory/movements" ||
      path === "/store/inventory/requests"
    )
      return route.fulfill({ json: pageData([]) });
    if (path === "/store/products" || path === "/products")
      return route.fulfill({ json: pageData([]) });
    if (path === "/products/" + product)
      return route.fulfill({
        json: {
          ...fixtures.getProduct.response,
          id: product,
          title: "Current product",
          attributes: {},
          variants: [],
          images: [],
        },
      });
    if (path === "/me/addresses")
      return route.fulfill({
        json: pageData(
          [
            {
              id: address,
              recipient_name: "Customer",
              phone: "0900000000",
              line1: "Street",
              ward: "Ward",
              district: "District",
              city: "City",
              is_default: true,
            },
          ],
          100,
        ),
      });
    if (path === "/cart/items")
      return route.fulfill({
        json: pageData(
          [
            {
              id: item,
              product_id: product,
              variant_id: variant,
              store_id: store,
              quantity: 1,
            },
          ],
          100,
        ),
      });
    if (path === "/checkout/quotes")
      return route.fulfill({
        json: {
          quote_id: id(30),
          stores: [{ store_id: store, amounts, items: [] }],
          payable_total_vnd: 110000,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    return route.fulfill({
      status: 404,
      json: {
        code: "NOT_FOUND",
        message: "Unconfigured fixture " + path,
        details: [],
      },
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Fixture-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đã đăng nhập" }),
  ).toBeVisible();
  return calls;
}
test("Customer selects eligible Store/platform vouchers and sees disabled ineligible suggestions", async ({
  page,
}) => {
  const voucher = (code: string, scope: string, eligible = true) => ({
    voucher: {
      id: id(code.length),
      code,
      scope,
      store_id: store,
      discount_type: "FIXED",
      discount_value: 10000,
      min_goods_vnd: 50000,
      starts_at: "2026-10-01T00:00:00Z",
      ends_at: "2026-11-30T00:00:00Z",
      usage_limit: 100,
      per_customer_limit: 1,
      status: "ACTIVE",
      version: 0,
    },
    eligible,
    reason: eligible ? "Eligible" : "Đã hết lượt của bạn",
    estimated_discount_vnd: eligible ? 10000 : 0,
  });
  const calls = await setup(page, "CUSTOMER", (r, c) =>
    c.path === "/vouchers/suggestions"
      ? r.fulfill({
          json: {
            items: [
              voucher("STORE10", "STORE"),
              voucher("PLATFORM10", "PLATFORM"),
              voucher("USED", "PLATFORM", false),
            ],
            evaluated_at: new Date().toISOString(),
            truncated: false,
          },
        })
      : undefined,
  );
  await page.goto("/cart");
  await page.getByRole("button", { name: "Tiến hành thanh toán" }).click();
  await page.getByRole("button", { name: "Chọn voucher / Gợi ý mã" }).click();
  await expect(
    page.getByRole("button", { name: "Chọn USED", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Chọn STORE10", exact: true }).click();
  await expect(page.getByText('Đã chọn: STORE10')).toBeVisible();
  await page
    .getByRole("button", { name: "Chọn PLATFORM10", exact: true })
    .click();
  await expect
    .poll(() => calls.filter((c) => c.path === "/checkout/quotes").at(-1)?.body)
    .toMatchObject({
      platform_voucher_code: "PLATFORM10",
      store_vouchers: { [store]: "STORE10" },
    });
  await page
    .getByRole("button", { name: "Bỏ chọn PLATFORM10", exact: true })
    .click();
  await expect
    .poll(
      () =>
        calls.filter((c) => c.path === "/checkout/quotes").at(-1)?.body
          .platform_voucher_code,
    )
    .toBeUndefined();
  await page.getByRole('button',{name:'Bỏ tất cả mã đã chọn'}).click();
  await expect(page.getByText('Chưa chọn mã ưu đãi.')).toBeVisible();
  await expect.poll(()=>calls.filter(c=>c.path==='/checkout/quotes').at(-1)?.body.store_vouchers).toBeUndefined();
  expect(calls.some((c) => c.path === "/orders/batches")).toBe(false);
});

test('Customer Order filters survive pagination and clear back to page one',async({page})=>{
  const queries:URLSearchParams[]=[];
  await setup(page,'CUSTOMER',(route,c)=>{
    if(c.path==='/me/orders'){
      const q=new URL(route.request().url()).searchParams;queries.push(q);
      return route.fulfill({json:{items:[baseOrder],total:21,page:Number(q.get('page')??1),size:20}});
    }
  });
  await page.goto('/customer/orders');await page.getByLabel('Mã đơn',{exact:true}).fill('PBL-00000003');
  await page.getByRole('navigation',{name:'Xem đơn theo trạng thái'}).getByRole('button',{name:'Đang giao'}).click();await expect.poll(()=>queries.at(-1)?.get('status')).toBe('SHIPPED');
  await page.getByLabel('Trạng thái đơn',{exact:true}).selectOption('SHIPPED');await page.getByLabel('Ngày tạo từ').fill('2026-10-20');await page.getByLabel('Đến ngày (bao gồm)').fill('2026-10-27');
  await page.getByRole('button',{name:'Lọc đơn hàng',exact:true}).click();await expect.poll(()=>queries.at(-1)?.get('q')).toBe('PBL-00000003');
  await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect.poll(()=>queries.at(-1)?.get('page')).toBe('2');
  expect(queries.at(-1)?.get('status')).toBe('SHIPPED');expect(queries.at(-1)?.get('from')).toBeTruthy();expect(queries.at(-1)?.get('to')).toBeTruthy();
  await page.getByRole('button',{name:'Xóa bộ lọc',exact:true}).click();await expect.poll(()=>queries.at(-1)?.get('page')).toBe('1');expect(queries.at(-1)?.has('q')).toBe(false);
});

test('Admin filters ignore an older response that arrives after the new result',async({page})=>{
 let release:(()=>Promise<void>)|undefined;
 await setup(page,'ADMIN',(route,c)=>{
  if(c.path==='/admin/orders'){
   if(!new URL(route.request().url()).searchParams.has('q'))return new Promise<void>(resolve=>{release=async()=>{await route.fulfill({json:{items:[{...baseOrder,id:id(44)}],total:99,page:1,size:20}});resolve()}});
   return route.fulfill({json:pageData([baseOrder])});
  }
 });
 await page.goto('/admin?tab=orders');await page.getByLabel('Mã đơn',{exact:true}).fill('PBL-00000003');await page.getByRole('button',{name:'Lọc đơn hàng',exact:true}).click();
 await expect(page.getByText('PBL-00000003',{exact:true})).toBeVisible();expect(release).toBeDefined();await release!();
 await expect(page.getByText('PBL-00000044',{exact:true})).toHaveCount(0);await expect(page.getByText('1 đơn khớp bộ lọc · trang 1.')).toBeVisible();
});

test('Seller ships only with carrier/reference and sends evidence in the existing transition command',async({page})=>{
 let current:any={...baseOrder,status:'PROCESSING'};
 const calls=await setup(page,'OWNER',(route,c)=>{
  if(c.path==='/store/orders')return route.fulfill({json:pageData([current])});
  if(c.path==='/store/orders/'+orderId)return route.fulfill({json:current});
  if(c.path==='/store/orders/'+orderId+'/status'){
   current={...current,status:'SHIPPED',version:5,shipment:{...c.body.shipment,status:'SHIPPED',source:'MANUAL',shipped_at:'2026-10-27T03:00:00Z',dispatched_by:user}};
   return route.fulfill({json:current});
  }
 });
 await page.goto('/seller/orders');await page.getByRole('button',{name:'Xem đơn',exact:true}).click();
 const ship=page.getByRole('button',{name:'Chuyển sang SHIPPED',exact:true});await expect(ship).toBeDisabled();
 await page.getByLabel('Đơn vị giao hàng',{exact:true}).fill('Store delivery');await expect(ship).toBeDisabled();
 await page.getByLabel('Mã vận chuyển / reference',{exact:true}).fill('MANUAL-001');await page.getByLabel('Ghi chú bàn giao').fill('Collected at counter');await ship.click();
 await expect(page.getByText('Mã vận chuyển / reference: MANUAL-001')).toBeVisible();
 expect(calls.find(c=>c.path.endsWith('/status'))?.body).toEqual({to_status:'SHIPPED',expected_version:4,shipment:{carrier_name:'Store delivery',tracking_code:'MANUAL-001',dispatch_note:'Collected at counter'}});
});

test('paid Order completion still requires explicit receipt evidence',async({page})=>{
 let current:any={...baseOrder,payment_status:'SUCCEEDED'};
 const calls=await setup(page,'OWNER',(route,c)=>{
  if(c.path==='/store/orders')return route.fulfill({json:pageData([current])});
  if(c.path==='/store/orders/'+orderId)return route.fulfill({json:current});
  if(c.path.endsWith('/status')){current={...current,status:'COMPLETED',version:5,shipment:{status:'DELIVERED',source:'MANUAL',delivery_note:c.body.delivery_confirmation.note}};return route.fulfill({json:current})}
 });
 await page.goto('/seller/orders');await page.getByRole('button',{name:'Xem đơn',exact:true}).click();
 const complete=page.getByRole('button',{name:'Chuyển sang COMPLETED',exact:true});await expect(complete).toBeDisabled();
 await page.getByLabel('Căn cứ giao nhận',{exact:true}).fill('Signed receipt checked');await expect(complete).toBeDisabled();
 await page.getByRole('checkbox',{name:'Tôi đã kiểm tra và xác nhận khách đã nhận hàng'}).check();await complete.click();
 await expect(page.getByText('Căn cứ giao nhận: Signed receipt checked')).toBeVisible();
 expect(calls.find(c=>c.path.endsWith('/status'))?.body).toEqual({to_status:'COMPLETED',expected_version:4,delivery_confirmation:{confirmed:true,note:'Signed receipt checked'}});
});
test("Seller stock changes create a proposal with receipt metadata and never apply stock directly", async ({
  page,
}) => {
  const calls = await setup(page, "SELLER", (r, c) =>
    c.path === "/store/inventory/requests" && c.method === "POST"
      ? r.fulfill({
          status: 201,
          json: { ...fixtures.createStockRequest.response, status: "PENDING" },
        })
      : undefined,
  );
  await page.goto("/seller/inventory");
  await page.getByRole("button", { name: "Điều chỉnh", exact: true }).click();
  await page.getByLabel("Số lượng thay đổi").fill("5");
  await page.getByLabel("Lý do", { exact: true }).fill("Delivery checked");
  await page.getByLabel("Nhà cung cấp / nguồn nhập").fill("Supplier A");
  await page.getByLabel("Số chứng từ / phiếu nhập").fill("INV-01");
  await page.getByRole("button", { name: "Gửi đề nghị cho Owner" }).click();
  await expect(page.getByRole("status")).toContainText("tồn kho chưa thay đổi");
  const write = calls.find(
    (c) => c.path === "/store/inventory/requests" && c.method === "POST",
  );
  expect(write?.body).toMatchObject({
    delta_quantity: 5,
    adjustment_kind: "RECEIPT",
    supplier_name: "Supplier A",
    source_reference: "INV-01",
    expected_version: 7,
  });
  expect(write?.body.received_at).toMatch(/^\d{4}-/);
  expect(calls.some((c) => c.path === "/store/inventory/adjustments")).toBe(
    false,
  );
});
test("Owner proposal approval requires explicit confirmation and the current inventory version", async ({
  page,
}) => {
  let approved = false;
  const request = {
    id: id(41),
    variant_id: variant,
    store_id: store,
    requested_by: id(42),
    delta_quantity: 3,
    reason: "Stock delivery",
    created_at: "2026-10-24T03:00:00Z",
    status: "PENDING",
    version: 0,
  };
  const calls = await setup(page, "OWNER", (r, c) => {
    if (c.path === "/store/inventory/requests")
      return r.fulfill({
        json: pageData([
          { ...request, status: approved ? "APPROVED" : "PENDING" },
        ]),
      });
    if (c.path === "/store/inventory/requests/" + request.id) {
      approved = true;
      return r.fulfill({
        json: { ...request, status: "APPROVED", version: 1 },
      });
    }
  });
  await page.goto("/seller/inventory");
  await page.getByRole("tab", { name: "Duyệt đề nghị đổi số lượng" }).click();
  await page.getByRole("button", { name: "Xem và quyết định" }).click();
  await page.getByLabel("Lý do quyết định").fill("Checked invoice");
  const save = page.getByRole("button", { name: "Duyệt thay đổi số lượng" });
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox", { name: /Tôi là chủ gian hàng/ }).check();
  await save.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    calls.find((c) => c.path.endsWith("/" + request.id) && c.method === "PATCH")
      ?.body,
  ).toMatchObject({
    decision: "APPROVE",
    expected_version: 0,
    expected_inventory_version: 7,
    reason: "Checked invoice",
  });
});
test("Store detail shows saved shipping, status times and available stock without deducting again", async ({
  page,
}) => {
  await setup(page, "OWNER");
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Xem đơn", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Xử lý đơn Store" });
  await expect(modal).toContainText("Actual recipient");
  await expect(modal).toContainText("Actual saved street");
  await expect(modal).toContainText("Handed to delivery");
  await expect(modal.locator("time")).toHaveAttribute(
    "datetime",
    "2026-10-25T03:00:00Z",
  );
  await expect(
    modal.getByRole("cell", { name: "10", exact: true }),
  ).toBeVisible();
  await expect(modal).toContainText("Tồn hiện tại cho các đơn mới");
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("failed delivery waits for physical receipt and disposition before creating a return receipt", async ({
  page,
}) => {
  let current: any = { ...baseOrder };
  const calls = await setup(page, "OWNER", (r, c) => {
    if (c.path === "/store/orders/" + orderId)
      return r.fulfill({ json: current });
    if (c.path === "/store/orders/" + orderId + "/returns") {
      if (c.method === "POST")
        current = {
          ...current,
          return_case: {
            id: id(50),
            order_id: orderId,
            kind: "DELIVERY_FAILED",
            status: "APPROVED",
            reason: c.body.reason,
            requested_by: user,
            requested_at: new Date().toISOString(),
            version: 0,
            cash_refund_due_vnd: 0,
          },
        };
      else
        current = {
          ...current,
          status: "RETURNED",
          version: 5,
          payment_status: "CANCELLED",
          inventory_state: "QUARANTINED",
          return_case: {
            ...current.return_case,
            status: "RECEIVED",
            version: 1,
            received_at: new Date().toISOString(),
            stock_state: "QUARANTINED",
            restock: c.body.restock,
          },
        };
      return r.fulfill({ json: current });
    }
  });
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Xem đơn", exact: true }).click();
  await page.getByLabel("Lý do xử lý trả hàng").fill("Delivery failed");
  await page
    .getByRole("button", { name: "Báo giao thất bại / chờ hàng về" })
    .click();
  const receive = page.getByRole("button", {
    name: "Xác nhận đã nhận hàng trả",
  });
  await expect(receive).toBeDisabled();
  expect(
    calls.filter((c) => c.path.endsWith("/returns") && c.method === "PATCH"),
  ).toHaveLength(0);
  await page.getByLabel("Lý do xử lý trả hàng").fill("Physical parcel damaged");
  await page.getByLabel("Kiểm tra tình trạng hàng").selectOption("NO");
  await page.getByRole("checkbox", { name: /đã nhận đủ hàng/ }).check();
  await receive.click();
  await expect(page.getByRole("dialog")).toContainText("không cộng kho");
  expect(
    calls.find((c) => c.path.endsWith("/returns") && c.method === "PATCH")
      ?.body,
  ).toMatchObject({
    action: "RECEIVE",
    restock: false,
    expected_version: 0,
    expected_order_version: 4,
  });
});
test("uncertain Customer return requests retain the same operation and body after reload", async ({
  page,
}) => {
  let first = true,
    current: any = {
      ...baseOrder,
      status: "COMPLETED",
      payment_status: "SUCCEEDED",
    };
  const calls = await setup(page, "CUSTOMER", (r, c) => {
    if (c.path === "/me/orders/" + orderId) return r.fulfill({ json: current });
    if (c.path.endsWith("/returns")) {
      if (first) {
        first = false;
        return r.fulfill({
          status: 503,
          json: { code: "DOWN", message: "Return result unknown", details: [] },
        });
      }
      current = {
        ...current,
        return_case: {
          id: id(50),
          order_id: orderId,
          kind: "CUSTOMER_RETURN",
          status: "REQUESTED",
          reason: c.body.reason,
          requested_by: user,
          requested_at: new Date().toISOString(),
          version: 0,
          cash_refund_due_vnd: 110000,
        },
      };
      return r.fulfill({ json: current });
    }
  });
  await page.goto("/customer/orders/" + orderId);
  await page.getByLabel("Lý do xử lý trả hàng").fill("Wrong item");
  await page.getByRole("button", { name: "Gửi đề nghị trả hàng" }).click();
  await expect(page.getByRole("alert")).toContainText("Return result unknown");
  await page.reload();
  await page
    .getByRole("button", { name: "Kiểm tra lại yêu cầu trả hàng" })
    .click();
  await expect(page.getByText("Chờ duyệt", { exact: true })).toBeVisible();
  const writes = calls.filter((c) => c.path.endsWith("/returns"));
  expect(writes).toHaveLength(2);
  expect(writes[0].body).toEqual(writes[1].body);
  expect(writes[0].body).toMatchObject({
    expected_order_version: 4,
    reason: "Wrong item",
  });
});
test("COD repayment requires the exact amount and actual-cash checkbox, never fake success on 501", async ({
  page,
}) => {
  const current: any = {
    ...baseOrder,
    status: "RETURNED",
    payment_status: "SUCCEEDED",
    return_case: {
      id: id(50),
      order_id: orderId,
      kind: "CUSTOMER_RETURN",
      status: "RECEIVED",
      reason: "Wrong item",
      requested_by: user,
      requested_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      version: 2,
      cash_refund_due_vnd: 110000,
      stock_state: "RESTOCKED",
      restock: true,
    },
  };
  const calls = await setup(page, "OWNER", (r, c) => {
    if (c.path === "/store/orders/" + orderId)
      return r.fulfill({ json: current });
    if (c.path.endsWith("/cod-refund"))
      return r.fulfill({
        status: 501,
        json: {
          code: "NOT_IMPLEMENTED",
          message: "Cash refund unavailable",
          details: [],
        },
      });
  });
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Xem đơn", exact: true }).click();
  const refund = page.getByRole("button", {
    name: "Ghi nhận đã hoàn tiền COD",
  });
  await expect(refund).toBeDisabled();
  await page.getByLabel("Số tiền mặt đã trả khách").fill("110000");
  await expect(refund).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /đã thực sự hoàn tiền mặt/ })
    .check();
  await refund.click();
  await expect(page.getByRole("alert")).toContainText(
    "Cash refund unavailable",
  );
  await expect(page.getByText("Đã hoàn tiền", { exact: true })).toHaveCount(0);
  expect(calls.find((c) => c.path.endsWith("/cod-refund"))?.body).toMatchObject(
    { amount_vnd: 110000, cash_repaid: true, expected_order_version: 4 },
  );
});
