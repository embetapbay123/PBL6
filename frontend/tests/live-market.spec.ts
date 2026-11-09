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
    if(call.path==='/me/favorites')return route.fulfill({json:pageData([],100)});
    if(call.path==='/stores/'+store)return route.fulfill({json:{id:store,name:'Live Store',shipping_fee_vnd:20000}});
    if(['/store/inventory/movements','/store/stock-commitments'].includes(call.path))return route.fulfill({json:pageData([])});
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
            product_id:product,product_title:'Live product from API',sku:'LIVE-SKU',variant_values:{color:'Đỏ',size:'M'},
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
    page.getByRole("cell").filter({hasText:'Live product from API · Đỏ / M · SKU: LIVE-SKU'}),
  ).toBeVisible();
  await page.getByRole("button", { name: "Điều chỉnh", exact: true }).click();
  await page.getByRole('spinbutton',{name:'Số lượng',exact:true}).fill("2");
  await page.getByLabel("Lý do").fill("Received shipment");
  await page.getByRole("button", { name: "Lưu điều chỉnh" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Stock response unavailable",
  );
  await expect(page.getByRole('spinbutton',{name:'Số lượng',exact:true})).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Điều chỉnh", exact: true }).click();
  await expect(page.getByRole('spinbutton',{name:/^Số lượng(?: thay đổi có dấu)?$/})).toHaveValue("2");
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
  await page.getByRole("button", { name: "Xác nhận đơn",exact:true }).click();
  await expect(page.getByRole("alert")).toContainText("Order changed");
  await expect(
    page.getByRole("button", { name: "Xác nhận đơn",exact:true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Làm mới" }).click();
  await page.getByRole("button", { name: "Xác nhận đơn",exact:true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã xác nhận");
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
  const collect = page.getByRole("button", { name: "Xác nhận COD" });
  await expect(collect).toBeDisabled();
  await page.getByRole("checkbox").check();
  await collect.click();
  await expect(page.getByRole("alert")).toContainText("Collection unavailable");
  await expect(collect).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Hoàn tất đơn",exact:true }),
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
  const dialog = page.getByRole("dialog", { name: "Tạo voucher mới", exact: true });
  await expect(dialog.getByText(/Giảm 10% cho đơn từ 50\.000.*Tối đa 30\.000/)).toBeVisible();
  await dialog.getByText("Thử mức giảm", { exact: true }).click();
  await dialog.getByRole("spinbutton", { name: "Tiền hàng ví dụ (VND)" }).fill("-1");
  await expect(dialog.getByText("Nhập số nguyên từ 0 đến 1 tỷ đồng.")).toBeVisible();
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
  await page.getByRole("button", { name: "Thanh toán" }).click();
  await page
    .getByLabel("Thanh toán cửa hàng " + store, { exact: true })
    .selectOption("SANDBOX");
  await page.getByLabel("Voucher toàn sàn", { exact: true }).fill("DEMO20K");
  await page
    .getByLabel("Voucher cửa hàng " + store, { exact: true })
    .fill("STORE10K");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  const confirm = page.getByRole("button", {
    name: "Đặt hàng",
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
    page.getByRole("link", { name: "Chuyển khoản" }),
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
  await page.getByRole("button", { name: "Thanh toán" }).click();
  const confirm = page.getByRole("button", {
    name: "Đặt hàng",
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

test('catalog action buttons add the actual variant and toggle its favorite through APIs',async({page})=>{
  let saved=false;
  const calls=await setup(page,'CUSTOMER',(route,c)=>{
    if(c.path==='/cart/items')return route.fulfill({json:c.method==='GET'?pageData([]):{id:item,product_id:product,variant_id:variant,quantity:1}});
    if(c.path==='/me/favorites')return route.fulfill({json:pageData(saved?[product]:[],100)});
    if(c.path==='/me/favorites/'+product){saved=c.method==='PUT';return route.fulfill({json:{product_id:product}});}
  });
  await page.goto('/');const card=page.locator('article.product-card').first();
  await card.getByRole('button',{name:'Thêm vào giỏ',exact:true}).click();
  await expect(card.getByRole('status')).toContainText('Đã thêm vào giỏ');
  expect(calls.find(c=>c.path==='/cart/items'&&c.method==='POST')?.body).toEqual({product_id:product,variant_id:variant,quantity:1});
  const favorite=card.getByRole('button',{name:'Yêu thích Live product from API',exact:true});await favorite.click();
  await expect(card.getByRole('button',{name:'Bỏ yêu thích Live product from API'})).toHaveAttribute('aria-pressed','true');
  await card.getByRole('button',{name:'Bỏ yêu thích Live product from API'}).click();
  expect(calls.filter(c=>c.path==='/me/favorites/'+product).map(c=>c.method)).toEqual(['PUT','DELETE']);
});

test('catalog variant chooser traps focus and blocks another add after an uncertain response',async({page})=>{
  let posts=0;
  await setup(page,'CUSTOMER',(route,c)=>{
    if(c.path==='/products')return route.fulfill({json:pageData([{...productData,variants:[...productData.variants,{...productData.variants[0],id:id(70),sku:'BLUE',is_default:false}]}])});
    if(c.path==='/cart/items'){
      if(c.method==='GET')return route.fulfill({json:pageData([])});
      posts++;expect(c.body.variant_id).toBe(id(70));return route.fulfill({status:503,json:{code:'UNAVAILABLE',message:'Chưa xác định kết quả thêm giỏ',details:[]}});
    }
  });
  await page.goto('/');await page.getByRole('button',{name:'Thêm vào giỏ',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Chọn phân loại Live product from API'});
  await dialog.getByLabel('Phân loại').selectOption(id(70));
  await dialog.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true}).focus();await page.keyboard.press('Tab');await expect(dialog.getByLabel('Phân loại')).toBeFocused();
  await dialog.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Chưa xác định');await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(dialog.getByRole('button',{name:'Thêm vào giỏ hàng',exact:true})).toBeDisabled();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Thêm vào giỏ',exact:true})).toBeDisabled();expect(posts).toBe(1);
});

test('buy now carries the stepper quantity to checkout without changing the saved cart',async({page})=>{
  const calls=await setup(page,'CUSTOMER',(route,c)=>{
    if(c.path==='/cart/items')return route.fulfill({json:c.method==='GET'?pageData([{id:item,product_id:product,variant_id:variant,store_id:store,quantity:2}]):{id:item,product_id:product,variant_id:variant,store_id:store,quantity:2}});
    if(c.path.includes('/addresses'))return route.fulfill({json:pageData([])});
    if(c.path==='/products/'+product+'/reviews')return route.fulfill({json:pageData([])});
  });
  await page.goto('/products/'+product);
  await page.getByRole('button',{name:'Tăng số lượng',exact:true}).click();await page.getByRole('button',{name:'Tăng số lượng',exact:true}).click();await page.getByRole('button',{name:'Giảm số lượng',exact:true}).click();
  await expect(page.getByLabel('Số lượng',{exact:true})).toHaveValue('2');
  await page.getByRole('button',{name:'Mua ngay',exact:true}).click();await expect(page).toHaveURL(/\/checkout$/);
  expect(calls.filter(c=>c.path==='/cart/items'&&c.method==='POST')).toEqual([]);
  expect(await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)??'null'),'pbl6_buy_now_'+id(20))).toMatchObject({checkoutUserId:id(20),buyNow:{product_id:product,variant_id:variant,quantity:2}});
});

test('seller list actions show details, filter rows and confirm the versioned sale status',async({page})=>{
  let status='ACTIVE',version=7;
  const calls=await setup(page,'OWNER',(route,c)=>{
    if(c.path==='/store/products')return route.fulfill({json:pageData(new URL(route.request().url()).searchParams.get('q')==='No match'?[]:[{...productData,status,version}])});
    if(c.path==='/store/products/'+product&&c.method==='PATCH'){status=c.body.status;version++;return route.fulfill({json:{...productData,status,version}});}
  });
  await page.goto('/seller/products');await page.getByRole('button',{name:'Thao tác Live product from API',exact:true}).click();await page.getByRole('button',{name:'Chi tiết Live product from API',exact:true}).click();
  const detail=page.getByRole('dialog',{name:'Chi tiết Live product from API'});await expect(detail.getByText(/LIVE-SKU/)).toBeVisible();await detail.getByRole('button',{name:'Đóng',exact:true}).click();
  await page.getByLabel('Tìm tên hoặc SKU trong Store',{exact:true}).fill('No match');await expect(page.locator('tbody tr')).toHaveCount(0);await page.getByLabel('Tìm tên hoặc SKU trong Store',{exact:true}).fill('');
  await page.getByRole('button',{name:'Thao tác Live product from API',exact:true}).click();await page.getByRole('button',{name:'Dừng bán Live product from API',exact:true}).click();const confirm=page.getByRole('dialog',{name:'Dừng bán sản phẩm',exact:true});await confirm.getByRole('button',{name:'Xác nhận dừng bán'}).click();await expect(confirm).toHaveCount(0);
  await page.getByRole('button',{name:'Thao tác Live product from API',exact:true}).click();await expect(page.getByRole('button',{name:'Mở bán Live product from API',exact:true})).toBeVisible();await page.keyboard.press('Escape');expect(calls.find(c=>c.method==='PATCH')?.body).toEqual({status:'STOPPED',expected_version:7});
  await page.getByRole('button',{name:'Thêm sản phẩm mới',exact:true}).click();await expect(page.getByRole('dialog',{name:'Thêm sản phẩm mới',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page).not.toHaveURL(/create=1/);
});

test('header search button submits the entered query and layouts contain phone and tablet content',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await setup(page);await page.goto('/');await expect(page.locator('article.product-card')).toHaveCount(1);
  await page.getByLabel('Tìm kiếm toàn sàn',{exact:true}).fill('Áo xanh');await page.getByRole('button',{name:'Tìm toàn sàn',exact:true}).click();await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe('Áo xanh');
  for(const width of [1440,768,390]){
    await page.setViewportSize({width,height:900});await expect(page.getByRole('button',{name:'Thêm vào giỏ',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if(width===390){await expect(page.getByRole('navigation',{name:'Điều hướng nhanh trên điện thoại'})).toBeVisible();await page.getByRole('button',{name:'Mở menu'}).click();await expect(page.getByRole('navigation',{name:'Điều hướng chính'})).toBeVisible();}
  }
  expect(errors).toEqual([]);
});

test('Admin order queue sends server filters and opens actual order amounts in a keyboard modal',async({page})=>{
  const filters:string[]=[];await setup(page,'ADMIN',(route,c)=>{if(c.path!=='/admin/orders')return undefined;const status=new URL(route.request().url()).searchParams.get('status');filters.push(status??'');return route.fulfill({json:pageData(status&&status!==order.status?[]:[{...order,refund_status:'PENDING'}])});});
  await page.goto('/admin?tab=orders');await page.getByRole('button',{name:'Chi tiết đơn '+orderId,exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Chi tiết đơn '+orderId,exact:true});await expect(dialog).toContainText('120.000');await expect(dialog).toContainText('PENDING');await dialog.getByRole('link',{name:'Xem yêu cầu đổi trả'}).focus();await page.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'Đóng',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Chi tiết đơn '+orderId,exact:true})).toBeFocused();
  await page.getByRole('combobox',{name:'Trạng thái đơn',exact:true}).selectOption('COMPLETED');await expect.poll(()=>filters.includes('COMPLETED')).toBe(true);await expect(page.getByText('Không có đơn hàng phù hợp.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Bỏ bộ lọc đơn',exact:true}).click();await expect(page.getByRole('button',{name:'Chi tiết đơn '+orderId,exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Seller sale conflict requires explicit fresh read and then uses the new version',async({page})=>{
  let version=7,patches=0;
  const calls=await setup(page,'OWNER',(route,c)=>{
    if(c.path==='/store/products')return route.fulfill({json:pageData([{...productData,version}])});
    if(c.path==='/store/products/'+product&&c.method==='PATCH'){
      patches++;if(patches===1){version=8;return route.fulfill({status:409,json:{code:'VERSION_CONFLICT',message:'Sản phẩm vừa được cập nhật',details:[]}});}
      return route.fulfill({json:{...productData,status:'STOPPED',version:9}});
    }
  });
  await page.goto('/seller/products');await page.getByRole('button',{name:'Thao tác Live product from API',exact:true}).click();await page.getByRole('button',{name:'Dừng bán Live product from API',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Dừng bán sản phẩm',exact:true});await dialog.getByRole('button',{name:'Xác nhận dừng bán'}).click();await expect(dialog.getByRole('alert')).toContainText('Sản phẩm vừa được cập nhật');await expect(dialog.getByRole('button',{name:'Xác nhận dừng bán'})).toHaveCount(0);expect(patches).toBe(1);
  await dialog.getByRole('button',{name:'Tải lại danh sách'}).click();await expect(dialog).toHaveCount(0);await page.getByRole('button',{name:'Thao tác Live product from API',exact:true}).click();await page.getByRole('button',{name:'Dừng bán Live product from API',exact:true}).click();await dialog.getByRole('button',{name:'Xác nhận dừng bán'}).click();await expect(dialog).toHaveCount(0);expect(calls.filter(c=>c.method==='PATCH').map(c=>c.body.expected_version)).toEqual([7,8]);
});

test('guest product action requests login without issuing a cart write',async({page})=>{
  let writes=0;await page.route('**/api/v1/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/cart/items')&&route.request().method()==='POST')writes++;
    return route.fulfill({json:path.endsWith('/products')?pageData([productData]):pageData([])});
  });
  await page.goto('/');await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();await expect(page.getByRole('link',{name:'Đăng ký',exact:true})).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Thêm vào giỏ',exact:true}).click();await expect(page).toHaveURL(/\/login$/);expect(writes).toBe(0);
});

test('catalog favorite button reads persisted favorites after a reload',async({page})=>{
  const calls=await setup(page,'CUSTOMER',(route,c)=>{
    if(c.path==='/me/favorites')return route.fulfill({json:pageData([product],100)});
    if(c.path==='/me/favorites/'+product)return route.fulfill({json:{product_id:product}});
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Bỏ yêu thích Live product from API'})).toHaveAttribute('aria-pressed','true');
  await page.reload();await page.getByRole('button',{name:'Bỏ yêu thích Live product from API'}).click();await expect(page.getByRole('button',{name:'Yêu thích Live product from API',exact:true})).toHaveAttribute('aria-pressed','false');expect(calls.filter(c=>c.path==='/me/favorites/'+product).map(c=>c.method)).toEqual(['DELETE']);
});

test('mobile catalog filter applies only after confirmation and account menu exposes secondary routes',async({page})=>{
 const calls=await setup(page);await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Bộ lọc sản phẩm',exact:true});await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Áp dụng',exact:true}).click();await expect(dialog).not.toBeVisible();
 await page.getByRole('button',{name:'Menu tài khoản',exact:true}).click();const menu=page.getByRole('navigation',{name:'Menu tài khoản',exact:true});await expect(menu.getByRole('link',{name:'Sổ địa chỉ',exact:true})).toBeVisible();await menu.getByRole('link',{name:'Tài khoản của tôi',exact:true}).click();await expect(page).toHaveURL(/\/profile$/);await expect(page.getByRole('complementary',{name:'Điều hướng tài khoản'})).toBeVisible();expect(calls.filter(c=>c.path==='/products').length).toBeGreaterThan(0);
});

test('Seller shell collapses navigation and never shows the customer chat launcher',async({page})=>{
 await setup(page,'OWNER');await page.goto('/seller/products');await expect(page.getByRole('button',{name:'Mở chat',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Thu gọn menu',exact:true}).click();await expect(page.locator('.live-market')).toHaveClass(/sidebar-collapsed/);await page.getByRole('button',{name:'Mở rộng menu',exact:true}).click();await expect(page.locator('.live-market')).not.toHaveClass(/sidebar-collapsed/);
});
