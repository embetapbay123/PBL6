import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixtures = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "89000000-0000-4000-8000-" + String(n).padStart(12, "0");
const user = id(1),
  store = id(2),
  product = id(3),
  red = id(4),
  blue = id(5);
const title = "Áo công sở cùng tên";
const rowName = (color: string) => "Dòng giỏ: " + title + " · " + color;

async function model(page: Page, { brokenImage = false, singleVariant = false, loseRemoveAck = false } = {}) {
  const productData = {
    ...fixtures.getProduct.response,
    id: product,
    store_id: store,
    title,
    status: "ACTIVE",
    moderation_status: "VISIBLE",
    images: [],
    variants: [
      {
        id: red,
        sku: "OPAQUE-009264",
        variant_values: { color: "Đỏ", size: "M" },
        price_vnd: 100000,
        status: "ACTIVE",
        is_default: true,
      },
      {
        id: blue,
        sku: "OPAQUE-009265",
        variant_values: { color: "Xanh", size: "L" },
        price_vnd: 150000,
        status: "ACTIVE",
        is_default: false,
      },
    ],
  };
  const state = {
    cart: [
      {
        id: id(6),
        product_id: product,
        variant_id: red,
        store_id: store,
        quantity: 3,
      },
      {
        id: id(7),
        product_id: product,
        variant_id: blue,
        store_id: store,
        quantity: 1,
      },
    ],
    writes: [] as { path: string; method: string; body: any }[],
    failProduct: false,
  };
  if (singleVariant) {
    productData.variants.splice(1);
    state.cart.splice(1);
  }
  if (brokenImage) {
    productData.images = [
      {
        id: id(9),
        product_id: product,
        image_url: "https://image.fixture.test/cart-broken.png",
        position: 0,
      },
    ];
    await page.route("https://image.fixture.test/cart-broken.png", (route) =>
      route.abort(),
    );
  }
  const paged = (items: unknown[]) => ({
    items,
    total: items.length,
    page: 1,
    size: 100,
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.replace("/api/v1", ""),
      body = request.postData() ? request.postDataJSON() : undefined;
    if (request.method() !== "GET")
      state.writes.push({ path, method: request.method(), body });
    if (path.startsWith("/auth/"))
      return route.fulfill({
        json: {
          ...fixtures.login.response,
          access_token: "fixture-cart-usability",
          context: {
            user_id: user,
            roles: ["CUSTOMER"],
            role_permissions: [],
            token_version: 0,
          },
        },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (path === "/products/" + product)
      return state.failProduct
        ? route.fulfill({
            status: 503,
            json: { code: "UNAVAILABLE", message: "Không đọc được sản phẩm" },
          })
        : route.fulfill({ json: productData });
    if (path === "/products")
      return state.failProduct
        ? route.fulfill({
            status: 503,
            json: { code: "UNAVAILABLE", message: "Không đọc được sản phẩm" },
          })
        : route.fulfill({ json: paged([productData]) });
    if (path === "/stores/" + store)
      return route.fulfill({
        json: { id: store, name: "Store Áo Việt", shipping_fee_vnd: 20000 },
      });
    if (path === "/cart/items" && request.method() === "GET")
      return route.fulfill({ json: paged(state.cart) });
    if (path === "/cart/items" && request.method() === "POST") {
      const row = state.cart.find(
        (item) => item.variant_id === body.variant_id,
      )!;
      row.quantity += body.quantity;
      return route.fulfill({ status: 201, json: row });
    }
    const row = state.cart.find((item) => path === "/cart/items/" + item.id);
    if (row && request.method() === "PATCH") {
      row.quantity = body.quantity;
      return route.fulfill({ json: row });
    }
    if (row && request.method() === "DELETE") {
      state.cart = state.cart.filter((item) => item.id !== row.id);
      if (loseRemoveAck) return route.fulfill({ status: 503, json: { code: "LOST_ACK", message: "Mất phản hồi" } });
      return route.fulfill({ json: { status: "SUCCESS" } });
    }
    if (path.startsWith("/recommendations/"))
      return route.fulfill({
        json: {
          source: "BASELINE",
          product_ids: [],
          recently_viewed_product_ids: [],
        },
      });
    return route.fulfill({ json: paged([]) });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Fixture-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đã đăng nhập", exact: true }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("link", { name: "Giỏ hàng", exact: true })
    .click();
  await expect(page.locator(".cart-store-group")).toHaveCount(1);
  await expect(page.getByLabel("Chọn tất cả sản phẩm của gian hàng Store Áo Việt")).toBeVisible();
  return state;
}

test("UX02: keyboard users distinguish same-product variants and see line and selected totals", async ({
  page,
}) => {
  const s = await model(page),
    redRow = page.getByRole("group", { name: rowName("Đỏ / M"), exact: true }),
    blueRow = page.getByRole("group", {
      name: rowName("Xanh / L"),
      exact: true,
    });
  await expect(redRow).toContainText("Thành tiền dự tính: 300.000 ₫");
  await expect(blueRow).toContainText("Thành tiền dự tính: 150.000 ₫");
  const summary = page.locator(".purchase-summary");
  await expect(summary).toContainText("Tạm tính 450.000 ₫");
  const blueChoice = blueRow.getByRole("checkbox", {
    name: "Chọn " + title + " · Xanh / L",
    exact: true,
  });
  await blueChoice.focus();
  await page.keyboard.press("Space");
  await expect(blueChoice).not.toBeChecked();
  await expect(summary).toContainText("Tạm tính 300.000 ₫");
  const minus = redRow.getByRole("button", {
    name: "Giảm số lượng",
    exact: true,
  });
  await expect(minus).toHaveAccessibleDescription(
    /Áo công sở cùng tên.*Đỏ \/ M/,
  );
  await minus.focus();
  await page.keyboard.press("Enter");
  await expect(summary).toContainText("Tạm tính 200.000 ₫");
  await expect(
    page.getByRole("status").filter({ hasText: "Đã cập nhật" }),
  ).toContainText("Số lượng: 2");
  expect(s.cart.map((row) => row.quantity)).toEqual([2, 1]);
  expect(s.writes.filter((call) => call.path.startsWith("/cart"))).toEqual([
    { path: "/cart/items/" + id(6), method: "PATCH", body: { quantity: 2 } },
  ]);
});

test("UX02: changing the variant in the cart merges the quantity and restores focus", async ({
  page,
}) => {
  const s = await model(page),
    redRow = page.getByRole("group", { name: rowName("Đỏ / M"), exact: true });
  const changeBtn = redRow.getByRole("button", { name: "Đổi phân loại", exact: true });
  if (await changeBtn.isVisible()) await changeBtn.click();
  await redRow.getByLabel("Đổi phân loại", { exact: true }).selectOption(blue);
  expect(s.writes.filter((call) => call.path.startsWith("/cart"))).toHaveLength(
    0,
  );
  const blueRow = page.getByRole("group", { name: rowName("Xanh / L"), exact: true });
  await blueRow.getByRole("checkbox").uncheck();
  await redRow.getByRole("button", { name: "Đổi", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(redRow).toHaveCount(0);
  await expect(blueRow).toContainText("Thành tiền dự tính: 600.000 ₫");
  await expect(blueRow.getByRole("checkbox")).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Chọn " + title + " · Xanh / L",
      exact: true,
    }),
  ).toBeFocused();
  await expect(page.locator(".purchase-summary")).toContainText(
    "Tạm tính 600.000 ₫",
  );
  expect(s.cart).toEqual([
    expect.objectContaining({ variant_id: blue, quantity: 4 }),
  ]);
  expect(
    s.writes
      .filter((call) => call.path.startsWith("/cart"))
      .map((call) => [call.method, call.path, call.body]),
  ).toEqual([
    [
      "POST",
      "/cart/items",
      { product_id: product, variant_id: blue, quantity: 3 },
    ],
    ["DELETE", "/cart/items/" + id(6), undefined],
  ]);
});

test("a cart row with no alternative does not offer a variant change", async ({ page }) => {
  await model(page, { singleVariant: true });
  await expect(page.getByRole("group", { name: rowName("Đỏ / M"), exact: true })).toBeVisible();
  await expect(page.getByLabel("Đổi phân loại", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toHaveCount(0);
  await expect(page.locator(".purchase-summary")).toContainText("Đã chọn 3 món");
  await expect(page.locator(".purchase-summary")).toContainText("Tạm tính 300.000 ₫");
});

test("a lost remove response asks for readback without adding the replacement again", async ({ page }) => {
  const s = await model(page, { loseRemoveAck: true });
  const redRow = page.getByRole("group", { name: rowName("Đỏ / M"), exact: true });
  await redRow.getByLabel("Đổi phân loại", { exact: true }).selectOption(blue);
  await redRow.getByRole("button", { name: "Đổi", exact: true }).click();
  await expect(page.getByText(/Đã thêm phân loại mới nhưng chưa xác nhận/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Thanh toán", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(redRow).toHaveCount(0);
  await expect(page.getByRole("group", { name: rowName("Xanh / L"), exact: true })).toContainText("600.000 ₫");
  expect(s.writes.filter((call) => call.path.startsWith("/cart")).map((call) => call.method)).toEqual(["POST", "DELETE"]);
});

test("UX02: failed metadata read hides stale prices instead of claiming a standard choice or zero; retry is GET-only", async ({
  page,
}) => {
  await page.clock.install();
  const s = await model(page);
  await expect(page.locator(".purchase-summary")).toContainText(
    "Tạm tính 450.000 ₫",
  );
  await page.clock.fastForward(31000);
  s.failProduct = true;
  const failedRead = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/v1/products/" + product &&
      response.status() === 503,
  );
  await page.getByRole("link", { name: title, exact: true }).first().click();
  // Establish that the detail route mounted and its stale metadata read actually failed
  // before using the persistent header to navigate back to the cart.
  await expect(page).toHaveURL("/products/" + product);
  await failedRead;
  await expect(
    page.getByRole("alert").filter({ hasText: "Không đọc được sản phẩm" }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("link", { name: "Giỏ hàng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Đọc lại thông tin hàng", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".purchase-summary")).toContainText(
    "Chưa đủ thông tin để tính",
  );
  await expect(page.locator(".cart-store-group")).not.toContainText(
    "Phân loại tiêu chuẩn",
  );
  await expect(page.locator(".cart-store-group")).not.toContainText(
    "Giá hiện tại:",
  );
  s.failProduct = false;
  await page
    .getByRole("button", { name: "Đọc lại thông tin hàng", exact: true })
    .click();
  await expect(page.locator(".purchase-summary")).toContainText(
    "Tạm tính 450.000 ₫",
  );
  expect(
    s.writes.filter((call) => !call.path.startsWith("/auth/")),
  ).toHaveLength(0);
});

test("broken cart thumbnails have an accessible fallback while ordered identity and price remain readable", async ({
  page,
}) => {
  await model(page, { brokenImage: true });
  await expect(
    page.getByRole("img", {
      name: "Không tải được ảnh của " + title,
      exact: true,
    }),
  ).toHaveCount(2);
  await expect(
    page.locator('img[src="https://image.fixture.test/cart-broken.png"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: rowName("Đỏ / M"), exact: true }),
  ).toContainText("OPAQUE-009264");
  await expect(page.locator(".purchase-summary")).toContainText("450.000");
});
