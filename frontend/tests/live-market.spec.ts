import { test, expect, Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "51000000-0000-4000-8000-" + String(n).padStart(12, "0");
const store = id(1),
  variant = id(2),
  product = id(3),
  orderId = id(4),
  address = id(5),
  item = id(6),
  secondStore = id(7);
const amounts = {
  goods_vnd: 100000,
  store_discount_vnd: 0,
  platform_discount_vnd: 0,
  shipping_vnd: 20000,
  payable_vnd: 120000,
};
const order = {
  id: orderId,
  purchase_group_id: id(8),
  store_id: store,
  status: "PENDING",
  version: 0,
  payment_method: "COD",
  payment_status: "PENDING",
  amounts,
  items: [],
};
const productData = {
  ...fixtures.getProduct.response,
  id: product,
  store_id: store,
  title: "Live product from API",
  attributes: { brand: "Live brand" },
  status: "ACTIVE",
  moderation_status: "VISIBLE",
  variants: [
    {
      id: variant,
      sku: "LIVE-SKU",
      price_vnd: 100000,
      status: "ACTIVE",
      is_default: true,
      variant_values: {},
    },
  ],
  images: [],
};
const pageData = (items: unknown[], size = 20) => ({
  items,
  total: items.length,
  page: 1,
  size,
});
type Call = { path: string; method: string; body: any; key?: string };
type Handler = (route: Route, call: Call) => Promise<unknown> | undefined;

async function setup(
  page: Page,
  role: "CUSTOMER" | "OWNER" | "SELLER" | "ADMIN" = "CUSTOMER",
  handler?: Handler,
) {
  const calls: Call[] = [];
  const context = {
    user_id: id(20),
    roles:
      role === "OWNER"
        ? ["CUSTOMER", "STORE_OWNER"]
        : role === "ADMIN"
          ? ["ADMIN"]
          : role === "SELLER"
            ? ["CUSTOMER", "SELLER"]
            : ["CUSTOMER"],
    role_permissions: role === "ADMIN" ? ["platform.admin"] : [],
    token_version: 0,
    ...(["OWNER", "SELLER"].includes(role)
      ? {
          store_membership: {
            store_id: store,
            role,
            status: "ACTIVE",
            permissions: role === "SELLER" ? ["product.store.read_write"] : [],
          },
        }
      : {}),
  };
  await page.route("**/api/v1/**", (route) => {
    const req = route.request(),
      url = new URL(req.url());
    const call = {
      path: url.pathname.replace("/api/v1", ""),
      method: req.method(),
      body: req.postData() ? req.postDataJSON() : undefined,
      key: req.headers()["idempotency-key"],
    };
    calls.push(call);
    const handled = handler?.(route, call);
    if (handled) return handled;
    if (
      call.path.startsWith("/auth/login") ||
      call.path.startsWith("/auth/refresh")
    )
      return route.fulfill({
        json: { ...fixtures.login.response, context },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (call.path === "/auth/logout")
      return route.fulfill({ json: { status: "SUCCESS" } });
    if(call.path==='/store/inventory/movements')return route.fulfill({json:pageData([])});
    if(call.path==='/store/inventory/summary')return route.fulfill({json:{period_start:new Date().toISOString(),period_end:new Date().toISOString(),received_units:0,issued_to_orders_units:0,returned_units:0,adjusted_out_units:0,opening_units:0}});
    if (call.path === "/products" || call.path === "/store/products")
      return route.fulfill({ json: pageData([productData]) });
    if (call.path === "/products/" + product)
      return route.fulfill({ json: productData });
    if (call.path === "/store")
      return route.fulfill({
        json: {
          id: store,
          name: "Live Store",
          status: "ACTIVE",
          shipping_fee_vnd: 20000,
          version: 0,
        },
      });
    if (
      [
        "/categories",
        "/product-types",
        "/recommendations/for-you",
        "/me/orders",
      ].includes(call.path)
    )
      return route.fulfill({
        json: call.path.includes("for-you")
          ? {
              source: "BASELINE",
              product_ids: [],
              recently_viewed_product_ids: [],
            }
          : pageData([]),
      });
    return route.fulfill({
      status: 404,
      json: {
        code: "NOT_FOUND",
        message: "Unconfigured fixture: " + call.path,
        details: [],
      },
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("live@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Fixture-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đã đăng nhập" }),
  ).toBeVisible();
  return calls;
}

test("the default storefront renders API products and responsive navigation, without mock role switching", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.getByRole("link", { name: "Sản phẩm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Live product from API" }),
  ).toBeVisible();
  await expect(page.getByText("100.000 ₫", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Khung tích hợp API", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin Portal" })).toHaveCount(0);
  await page.getByLabel("Sắp xếp").selectOption("price_desc");
  await expect
    .poll(() => calls.filter((c) => c.path === "/products").length)
    .toBeGreaterThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeVisible();
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("*")]
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        x: e.getBoundingClientRect().x,
        right: e.getBoundingClientRect().right,
      }))
      .filter((e) => e.right > innerWidth + 1 || e.x < -1)
      .slice(0, 15),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.width,
  );
});

test('a minimal unavailable Product response does not crash the phone detail page', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await setup(page, 'CUSTOMER', (route, c) => c.path === '/products/' + product ? route.fulfill({json:{id:product,title:'Unavailable product',status:'ACTIVE',variants:[]}}) : undefined);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/products/' + product);
  await expect(page.getByRole('heading',{name:'Unavailable product',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true})).toBeDisabled();
  expect(errors).toEqual([]);
});

test("inventory retries preserve operation ID, payload and version across a reload", async ({
  page,
}) => {
  let count = 0;
  const calls = await setup(page, "OWNER", (route, c) => {
    if (c.path === "/store/inventory")
      return route.fulfill({
        json: pageData([
          {
            variant_id: variant,
            quantity: 15,
            reserved_quantity: 2,
            available_quantity: 13,
            version: count ? 1 : 0,
          },
        ]),
      });
    if (c.path === "/store/inventory/adjustments") {
      count++;
      return route.fulfill(
        count === 1
          ? {
              status: 503,
              json: {
                code: "DOWN",
                message: "Stock response unavailable",
                details: [],
              },
            }
          : {
              json: {
                variant_id: variant,
                quantity: 17,
                reserved_quantity: 2,
                available_quantity: 15,
                version: 1,
              },
            },
      );
    }
  });
  await page.goto("/seller/inventory");
  await expect(
    page.getByRole("cell", { name: "Live product from API · LIVE-SKU" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Điều chỉnh", exact: true }).click();
  await page.getByLabel("Số lượng thay đổi").fill("2");
  await page.getByLabel("Lý do").fill("Received shipment");
  await expect(page.getByRole("button",{name:"Lưu điều chỉnh"})).toBeDisabled();
  await page.getByRole('checkbox',{name:/Tôi là chủ gian hàng/}).check();
  await page.getByRole("button", { name: "Lưu điều chỉnh" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Stock response unavailable",
  );
  await expect(page.getByLabel("Số lượng thay đổi")).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Điều chỉnh", exact: true }).click();
  await expect(page.getByLabel("Số lượng thay đổi")).toHaveValue("2");
  await page.getByRole("button", { name: "Thử lại điều chỉnh" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const writes = calls.filter((c) => c.path === "/store/inventory/adjustments");
  expect(writes).toHaveLength(2);
  expect(writes[1].body).toEqual(writes[0].body);
  expect(writes[0].body).toMatchObject({
    variant_id: variant,
    delta_quantity: 2,
    reason: "Received shipment",
    expected_version: 0,
  });
  expect(writes[0].body.operation_id).toMatch(/^[0-9a-f-]{36}$/);
});

test("Store order conflicts block further writes until a fresh version is read", async ({
  page,
}) => {
  let version = 0,
    writes = 0,
    status = "PENDING";
  const calls = await setup(page, "OWNER", (route, c) => {
    if (c.path === "/store/orders")
      return route.fulfill({ json: pageData([{ ...order, version, status }]) });
    if (c.path === "/store/orders/" + orderId)
      return route.fulfill({ json: { ...order, version, status } });
    if (c.path.endsWith("/status")) {
      writes++;
      version++;
      if (writes > 1) status = "CONFIRMED";
      return route.fulfill(
        writes === 1
          ? {
              status: 409,
              json: {
                code: "VERSION_CONFLICT",
                message: "Order changed",
                details: [],
              },
            }
          : { json: { ...order, version, status } },
      );
    }
  });
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Xem đơn", exact: true }).click();
  await page.getByRole("button", { name: "Chuyển sang CONFIRMED" }).click();
  await expect(page.getByRole("alert")).toContainText("Order changed");
  await expect(
    page.getByRole("button", { name: "Chuyển sang CONFIRMED" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Đọc lại đơn" }).click();
  await page.getByRole("button", { name: "Chuyển sang CONFIRMED" }).click();
  await expect(page.getByRole("dialog")).toContainText("CONFIRMED");
  expect(
    calls.filter((c) => c.path.endsWith("/status")).map((c) => c.body),
  ).toEqual([
    { to_status: "CONFIRMED", expected_version: 0 },
    { to_status: "CONFIRMED", expected_version: 1 },
  ]);
});

test("COD requires explicit cash confirmation and a failed API never reports collected money", async ({
  page,
}) => {
  const calls = await setup(page, "OWNER", (route, c) => {
    if (c.path === "/store/orders")
      return route.fulfill({
        json: pageData([{ ...order, status: "SHIPPED" }]),
      });
    if (c.path === "/store/orders/" + orderId)
      return route.fulfill({ json: { ...order, status: "SHIPPED" } });
    if (c.path.endsWith("/cod-collection"))
      return route.fulfill({
        status: 503,
        json: { code: "DOWN", message: "Collection unavailable", details: [] },
      });
  });
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Xem đơn", exact: true }).click();
  const collect = page.getByRole("button", { name: "Ghi nhận đã thu tiền" });
  await expect(collect).toBeDisabled();
  await page.getByRole("checkbox",{name:/Tôi đã nhận đủ/}).check();
  await collect.click();
  await expect(page.getByRole("alert")).toContainText("Collection unavailable");
  await expect(collect).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Chuyển sang COMPLETED" }),
  ).toBeDisabled();
  expect(
    calls.filter((c) => c.path.endsWith("/cod-collection")).map((c) => c.body),
  ).toEqual([{ expected_version: 0, amount_collected_vnd: 120000 }]);
  await expect(
    page.getByText("Đã cập nhật đơn hàng.", { exact: true }),
  ).toHaveCount(0);
});

test("Seller permissions hide Owner tools and deny direct inventory access before issuing requests", async ({
  page,
}) => {
  const calls = await setup(page, "SELLER");
  await page.goto("/seller/products");
  const menu = page.getByRole("complementary", { name: "Menu Store" });
  await expect(menu.getByRole("link", { name: "Voucher Store" })).toHaveCount(
    0,
  );
  await expect(menu.getByRole("link", { name: "Tồn kho" })).toHaveCount(0);
  await page.goto("/seller/inventory");
  await expect(page.getByRole("alert")).toContainText("chưa có quyền");
  expect(calls.some((c) => c.path === "/store/inventory")).toBe(false);
  await page.goto("/seller/vouchers");
  await expect(page.getByRole("alert")).toContainText("không có quyền");
  expect(calls.some((c) => c.path === "/store/vouchers")).toBe(false);
});

test("Owner creates a percentage voucher with an explicit cap and the Store scope", async ({
  page,
}) => {
  let created: any;
  const calls = await setup(page, "OWNER", (route, c) => {
    if (c.path === "/store/vouchers" && c.method === "GET")
      return route.fulfill({
        json: pageData(
          created
            ? [{ ...created, id: id(30), status: "ACTIVE", version: 0 }]
            : [],
        ),
      });
    if (c.path === "/store/vouchers" && c.method === "POST") {
      created = c.body;
      return route.fulfill({
        status: 201,
        json: { ...created, id: id(30), status: "ACTIVE", version: 0 },
      });
    }
  });
  await page.goto("/seller/vouchers");
  await page.getByRole("button", { name: "Tạo voucher mới" }).click();
  await page.getByLabel("Mã voucher", { exact: true }).fill("TEST10");
  await page.getByLabel("Loại giảm").selectOption("PERCENT");
  await page.getByLabel("Giảm tối đa (VND)", { exact: true }).fill("30000");
  await page.getByRole("button", { name: "Tạo voucher", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "TEST10", exact: true }),
  ).toBeVisible();
  expect(
    calls.find((c) => c.method === "POST" && c.path === "/store/vouchers")
      ?.body,
  ).toMatchObject({
    scope: "STORE",
    code: "TEST10",
    discount_type: "PERCENT",
    discount_value: 10,
    max_discount_vnd: 30000,
    min_goods_vnd: 50000,
  });
  expect(created).not.toHaveProperty("store_id");
});

test("Admin sidebar selects real API panels through the URL and browser history", async ({
  page,
}) => {
  const calls = await setup(page, "ADMIN", (route, c) => {
    if (c.path === "/admin/dashboard")
      return route.fulfill({ json: { user_count: 87, store_count: 3 } });
    if (c.path === "/admin/users")
      return route.fulfill({
        json: pageData(
          [
            {
              id: id(31),
              email: "server-user@example.test",
              status: "ACTIVE",
              version: 0,
            },
          ],
          10,
        ),
      });
    if (c.path === "/admin/vouchers")
      return route.fulfill({ json: pageData([]) });
  });
  await page.goto("/admin");
  await expect(page.getByText("87", { exact: true })).toBeVisible();
  const menu = page.getByRole("complementary", { name: "Menu quản trị" });
  await menu.getByRole("link", { name: "Tài khoản", exact: true }).click();
  await expect(page).toHaveURL(/tab=users/);
  await expect(
    page.getByRole("cell", { name: "server-user@example.test" }),
  ).toBeVisible();
  await menu.getByRole("link", { name: "Ưu đãi toàn sàn" }).click();
  await expect(
    page.getByRole("heading", { name: "Voucher toàn sàn", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("cell", { name: "server-user@example.test" }),
  ).toBeVisible();
  expect(calls.some((c) => c.path === "/admin/vouchers")).toBe(true);
});

test("mixed payment and voucher checkout freezes its exact body and key across uncertain results and reload", async ({
  page,
}) => {
  let attempts = 0,
    quotes = 0;
  const calls = await setup(page, "CUSTOMER", (route, c) => {
    if (c.path === "/cart/items")
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
            {
              id: id(60),
              product_id: product,
              variant_id: variant,
              store_id: secondStore,
              quantity: 1,
            },
          ],
          100,
        ),
      });
    if (c.path === "/me/addresses")
      return route.fulfill({
        json: pageData(
          [
            {
              id: address,
              recipient_name: "Fixture Customer",
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
    if (c.path === "/checkout/quotes") {
      quotes++;
      return route.fulfill({
        json: {
          quote_id: id(50 + quotes),
          payable_total_vnd: 240000,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          stores: [
            { store_id: store, amounts, items: [] },
            { store_id: secondStore, amounts, items: [] },
          ],
        },
      });
    }
    if (c.path === "/orders/batches") {
      attempts++;
      return route.fulfill(
        attempts === 1
          ? {
              status: 503,
              json: {
                code: "DOWN",
                message: "Confirmation unavailable",
                details: [],
              },
            }
          : {
              json: {
                purchase_group_id: id(8),
                order_ids: [orderId],
                orders: [
                  {
                    ...order,
                    status: "AWAITING_PAYMENT",
                    payment_method: "SANDBOX",
                  },
                ],
                payable_total_vnd: 240000,
              },
            },
      );
    }
  });
  await page.goto("/cart");
  await page.getByRole("button", { name: "Tiến hành thanh toán" }).click();
  await page
    .getByLabel("Thanh toán cửa hàng " + store, { exact: true })
    .selectOption("SANDBOX");
  await page.getByLabel("Voucher toàn sàn", { exact: true }).fill("DEMO20K");
  await page
    .getByLabel("Voucher cửa hàng " + store, { exact: true })
    .fill("STORE10K");
  await page.getByRole("button", { name: "Áp dụng ưu đãi" }).click();
  const confirm = page.getByRole("button", {
    name: "Xác nhận đặt hàng",
    exact: true,
  });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("alert")).toContainText("Chưa xác định");
  await expect(
    page.getByLabel("Thanh toán cửa hàng " + store, { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Voucher sàn: DEMO20K", { exact: true }),
  ).toBeVisible();
  await confirm.click();
  await expect(
    page.getByRole("heading", { name: "Đã tạo nhóm đơn hàng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mở thông tin chuyển khoản" }),
  ).toHaveAttribute("href", "/orders/" + orderId + "/pay");
  const writes = calls.filter((c) => c.path === "/orders/batches");
  expect(writes).toHaveLength(2);
  expect(writes[1].body).toEqual(writes[0].body);
  expect(writes[1].key).toEqual(writes[0].key);
  expect(writes[0].body).toMatchObject({
    payment_methods: { [store]: "SANDBOX", [secondStore]: "COD" },
    platform_voucher_code: "DEMO20K",
    store_vouchers: { [store]: "STORE10K" },
  });
  expect(writes[0].body.quote_id).toBe(id(50 + quotes));
});

test("changing payment input cannot confirm with a previous quote while replacement is pending", async ({
  page,
}) => {
  let replacement: Route | undefined;
  const calls = await setup(page, "CUSTOMER", (route, c) => {
    if (c.path === "/cart/items")
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
    if (c.path === "/me/addresses")
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
            },
          ],
          100,
        ),
      });
    if (c.path === "/checkout/quotes") {
      if (c.body.payment_methods[store] === "SANDBOX") {
        replacement = route;
        return Promise.resolve();
      }
      return route.fulfill({
        json: {
          quote_id: id(70),
          stores: [],
          payable_total_vnd: 120000,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      });
    }
  });
  await page.goto("/cart");
  await page.getByRole("button", { name: "Tiến hành thanh toán" }).click();
  const confirm = page.getByRole("button", {
    name: "Xác nhận đặt hàng",
    exact: true,
  });
  await expect(confirm).toBeEnabled();
  await page
    .getByLabel("Thanh toán cửa hàng " + store, { exact: true })
    .selectOption("SANDBOX");
  await expect(confirm).toBeDisabled();
  await expect.poll(() => !!replacement).toBe(true);
  expect(calls.some((c) => c.path === "/orders/batches")).toBe(false);
  await replacement!.fulfill({
    json: {
      quote_id: id(71),
      stores: [],
      payable_total_vnd: 120000,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
  });
  await expect(confirm).toBeEnabled();
});
