import { test, expect, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "a1000000-0000-4000-8000-" + String(n).padStart(12, "0");
const image =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="tan"/%3E%3C/svg%3E';
async function setup(
  page: Page,
  { owner = false, rows = 2, quoteSeconds = 300 } = {},
) {
  const product = {
    ...f.getProduct.response,
    id: id(1),
    store_id: id(2),
    title: "Áo cotton màu kem",
    status: "ACTIVE",
    moderation_status: "VISIBLE",
    images: [{ id: id(3), image_url: image, position: 0 }],
    variants: [
      {
        id: id(4),
        sku: "COTTON-KEM-M",
        variant_values: { color: "Kem", size: "M" },
        price_vnd: 120000,
        status: "ACTIVE",
        is_default: true,
        available_quantity: 99,
      },
    ],
    review_summary: { average: 4.5, count: 2 },
  };
  const s = {
    cart: Array.from({ length: rows }, (_, i) => ({
      id: id(100 + i),
      product_id: id(1),
      variant_id: id(4),
      store_id: id(2),
      quantity: 1,
    })),
    addresses: [
      {
        id: id(5),
        recipient_name: "Lan Nguyễn",
        phone: "0901234567",
        line1: "Tầng 10, tòa nhà phía cuối đường, cổng nhận hàng B",
        ward: "Phường Hải Châu",
        district: "Hải Châu",
        city: "Thành phố Đà Nẵng",
        is_default: true,
      },
      {
        id: id(6),
        recipient_name: "Mai Trần",
        phone: "0911234567",
        line1: "456 Đường Trần Phú, lối vào phía sau",
        ward: "Phường Hải Châu",
        district: "Hải Châu",
        city: "Thành phố Đà Nẵng",
      },
    ],
    writes: [] as { path: string; body: any }[],
    batchReads: 0,
    detailReads: 0,
    quotes: [] as any[],
    timeOffset: 0,
    holdValidation: false,
    validation: undefined as Route | undefined,
    holdConfirm: false,
    confirmation: undefined as Route | undefined,
    member: {
      id: id(7),
      user_id: id(8),
      email: "staff@example.test",
      status: "ACTIVE",
      version: 2,
      permissions: ["product.store.read_write"],
    },
    reviewQueries: [] as URLSearchParams[],
    readAll: false,
  };
  const voucher = {
    ...f.createStoreVoucher.response,
    id: id(10),
    code: "GIAM10",
    scope: "STORE",
    store_id: id(2),
    discount_type: "PERCENT",
    discount_value: 10,
    min_goods_vnd: 100000,
    max_discount_vnd: 50000,
    starts_at: "2026-01-01T00:00:00Z",
    ends_at: "2027-01-01T00:00:00Z",
    usage_limit: 100,
    per_customer_limit: 1,
    status: "ACTIVE",
    version: 1,
    usage_summary:{voucher_id:id(10),redeemed_count:2,reserved_count:1,remaining_count:97},
  };
  const quote = (body: any) => ({
    quote_id: id(20),
    payable_total_vnd: s.cart.length * 120000,
    expires_at: new Date(
      Date.now() + s.timeOffset + quoteSeconds * 1000,
    ).toISOString(),
    stores: [
      {
        store_id: id(2),
        amounts: {
          goods_vnd: s.cart.length * 120000,
          store_discount_vnd: 0,
          platform_discount_vnd: 0,
          shipping_vnd: 0,
          payable_vnd: s.cart.length * 120000,
        },
        items: s.cart.map((item) => ({
          ...item,
          product_title: product.title,
          variant_values: { color: "Kem", size: "M" },
          sku: "COTTON-KEM-M",
          unit_price_vnd: 120000,
          line_total_vnd: 120000,
        })),
      },
    ],
  });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      p = decodeURIComponent(u.pathname.replace("/api/v1", "")),
      method = req.method();
    if (p === "/auth/login" || p === "/auth/refresh")
      return route.fulfill({
        json: {
          ...f.login.response,
          context: {
            user_id: id(9),
            roles: owner ? ["CUSTOMER", "STORE_OWNER"] : ["CUSTOMER"],
            role_permissions: [],
            token_version: 0,
            ...(owner
              ? {
                  store_membership: {
                    store_id: id(2),
                    role: "OWNER",
                    status: "ACTIVE",
                    permissions: [],
                  },
                }
              : {}),
          },
        },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (method !== "GET")
      s.writes.push({
        path: p,
        body: req.postData() ? req.postDataJSON() : undefined,
      });
    if (p === "/products") {
      s.batchReads++;
      const ids = u.searchParams.get("ids");
      return route.fulfill({
        json: {
          items: !ids || ids.split(",").includes(id(1)) ? [product] : [],
          page: 1,
          size: 100,
          total: 1,
        },
      });
    }
    if (p === "/products/" + id(1)) {
      s.detailReads++;
      return route.fulfill({ json: product });
    }
    if (p === "/cart/items")
      return route.fulfill({
        json: { items: s.cart, page: 1, size: 100, total: s.cart.length },
      });
    if (p === "/me/addresses")
      return route.fulfill({
        json: {
          items: s.addresses,
          page: 1,
          size: 100,
          total: s.addresses.length,
        },
      });
    if (p.startsWith("/me/addresses/") && method === "DELETE") {
      s.addresses = s.addresses.filter((a) => a.id !== p.split("/").at(-1));
      return route.fulfill({ status: 204 });
    }
    if (p === "/checkout/quotes") {
      const body = req.postDataJSON();
      s.quotes.push(body);
      return route.fulfill({ json: quote(body) });
    }
    if (p === "/vouchers/validate") {
      if (s.holdValidation) {
        s.validation = route;
        return;
      }
      return route.fulfill({ json: quote(req.postDataJSON()) });
    }
    if (p === "/orders/batches") {
      if (s.holdConfirm) {
        s.confirmation = route;
        return;
      }
      return route.fulfill({
        json: {
          purchase_group_id: id(21),
          orders: [
            {
              ...f.getOwnOrder.response,
              id: id(22),
              store_id: id(2),
              status: "PENDING",
              payment_method: "COD",
              amounts: quote({}).stores[0].amounts,
            },
          ],
        },
      });
    }
    if (p === "/me/vouchers" || p === "/store/vouchers")
      return route.fulfill({
        json: { items: [voucher], page: 1, size: 12, total: 1 },
      });
    if (p === "/store/staff")
      return route.fulfill({
        json: { items: [s.member], page: 1, size: 20, total: 1 },
      });
    if (p === "/store/staff/" + id(7) && method === "PATCH") {
      Object.assign(s.member, req.postDataJSON(), { version: 3 });
      return route.fulfill({ json: s.member });
    }
    if (p === "/store/staff/invitations")
      return route.fulfill({
        json: {
          items: [
            {
              id: id(12),
              invited_email: "new@example.test",
              permissions: [],
              status: "PENDING",
              expires_at: "2099-01-01T00:00:00Z",
            },
          ],
          page: 1,
          size: 20,
          total: 1,
        },
      });
    if (p === "/store/staff/invitations/" + id(12) + "/revoke")
      return route.fulfill({ json: { id: id(12), status: "REVOKED" } });
    if (p === "/me/notifications/read-all") {
      s.readAll = true;
      return route.fulfill({ json: { updated: 1 } });
    }
    if (p === "/me/notifications")
      return route.fulfill({
        json: {
          items: [
            {
              id: "ORDER_STATUS:" + id(22),
              kind: "ORDER_STATUS",
              order_id: id(22),
              event_status: "SHIPPED",
              created_at: "2026-11-01T00:00:00Z",
              read: s.readAll,
            },
          ],
          page: 1,
          size: 20,
          total: 1,
          unread: s.readAll ? 0 : 1,
        },
      });
    if (p === "/products/" + id(1) + "/reviews") {
      s.reviewQueries.push(u.searchParams);
      return route.fulfill({
        json: { items: [], page: 1, size: 20, total: 0 },
      });
    }
    if (p === "/me/orders")
      return route.fulfill({
        json: {
          items: [
            {
              ...f.getOwnOrder.response,
              id: id(22),
              store_id: id(2),
              status: "COMPLETED",
              items: [
                {
                  id: id(23),
                  product_id: id(1),
                  product_snapshot: { title: product.title },
                  quantity: 1,
                },
              ],
            },
          ],
          page: 1,
          size: 20,
          total: 1,
        },
      });
    if (p === "/me/reviews" && method === "POST")
      return route.fulfill({
        status: 201,
        json: {
          id: id(24),
          product_id: id(1),
          order_item_id: id(23),
          ...req.postDataJSON(),
          status: "VISIBLE",
          version: 0,
        },
      });
    if (p === "/stores/" + id(2))
      return route.fulfill({
        json: {
          id: id(2),
          name: "An Nhiên Studio",
          shipping_fee_vnd: 0,
          status: "ACTIVE",
        },
      });
    return route.fulfill({ json: { items: [], page: 1, size: 20, total: 0 } });
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
  s.writes = [];
  return s;
}
async function checkout(page: Page) {
  await page.goto("/cart");
  await page
    .getByRole("button", { name: "Tiến hành thanh toán", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận đặt hàng", exact: true }),
  ).toBeEnabled();
}
test("cart uses batch metadata once, bounds rows and keeps selection over pages", async ({
  page,
}) => {
  const s = await setup(page, { rows: 26 });
  await page.goto("/cart");
  await expect(page.getByRole("group", { name: /Dòng giỏ/ })).toHaveCount(25);
  await expect(page.getByText("Tổng số lượng: 26")).toBeVisible();
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.getByRole("group", { name: /Dòng giỏ/ })).toHaveCount(1);
  expect(s.batchReads).toBe(1);
  expect(s.detailReads).toBe(0);
  await expect(page.getByText("Tổng số lượng: 26")).toBeVisible();
});
test("checkout exposes full addresses, separate payment and picker with server-validated codes", async ({
  page,
}) => {
  const s = await setup(page);
  await checkout(page);
  const address = page.locator("#checkout-address");
  await address.getByRole("radio").nth(1).check();
  await expect.poll(() => s.quotes.at(-1)?.address_id).toBe(id(6));
  await expect(address).toContainText("lối vào phía sau");
  await expect(
    page.locator("#checkout-items").getByRole("combobox"),
  ).toHaveCount(0);
  await expect(
    page.locator("#checkout-payment").getByRole("combobox"),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Chọn mã ưu đãi", exact: true })
    .click();
  await page.getByRole("button", { name: "Chọn GIAM10", exact: true }).click();
  await expect(
    page.getByLabel("Voucher cửa hàng " + id(2), { exact: true }),
  ).toHaveValue("GIAM10");
  await page
    .getByRole("button", { name: "Áp dụng ưu đãi", exact: true })
    .click();
  await expect
    .poll(() => s.quotes.at(-1)?.store_vouchers?.[id(2)])
    .toBe("GIAM10");
  expect(s.writes.some((w) => w.path === "/vouchers/validate")).toBe(true);
});
test("pending voucher validation blocks confirmation and ignores a stale address response", async ({
  page,
}) => {
  const s = await setup(page);
  await checkout(page);
  s.holdValidation = true;
  await page.getByLabel("Voucher toàn sàn", { exact: true }).fill("FIRST");
  await page
    .getByRole("button", { name: "Áp dụng ưu đãi", exact: true })
    .click();
  await expect.poll(() => !!s.validation).toBe(true);
  await expect(
    page.getByRole("button", { name: "Xác nhận đặt hàng", exact: true }),
  ).toBeDisabled();
  await page.locator("#checkout-address").getByRole("radio").nth(1).check();
  await s.validation!.fulfill({ json: { ...f.quoteCheckout.response } });
  await expect(page.getByRole("alert")).toContainText(
    "Thông tin đặt hàng vừa thay đổi",
  );
  expect(s.writes.some((w) => w.path === "/orders/batches")).toBe(false);
  expect(s.quotes.at(-1).platform_voucher_code).toBeUndefined();
});
test("expiring quote requires an explicit refresh without creating an order", async ({
  page,
}) => {
  await page.clock.install();
  const s = await setup(page, { quoteSeconds: 5 });
  await checkout(page);
  s.timeOffset = 6000;
  await page.clock.runFor(6000);
  await expect(
    page.getByRole("button", { name: "Xác nhận đặt hàng", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("timer")).toContainText("đã hết hạn");
  await page
    .getByRole("button", { name: "Tính lại báo giá", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận đặt hàng", exact: true }),
  ).toBeEnabled();
  expect(s.writes.some((w) => w.path === "/orders/batches")).toBe(false);
});
test("success distinguishes a recorded COD order from money collected", async ({
  page,
}) => {
  await setup(page);
  await checkout(page);
  await page
    .getByRole("button", { name: "Xác nhận đặt hàng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đã tạo nhóm đơn hàng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Mỗi cửa hàng xử lý một đơn riêng.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Xem chi tiết đơn", exact: true }),
  ).toHaveAttribute("href", "/customer/orders/" + id(22));
  await expect(page.locator(".checkout-success")).not.toContainText(
    "đã thanh toán",
  );
});
test("address delete needs a decision and Escape restores the opener without sending DELETE", async ({
  page,
}) => {
  const s = await setup(page);
  await page.goto("/customer/addresses");
  const remove = page
    .getByRole("article", { name: "Địa chỉ Lan Nguyễn", exact: true })
    .getByRole("button", { name: "Xóa", exact: true });
  await remove.click();
  await expect(
    page.getByRole("dialog", { name: "Xóa địa chỉ?", exact: true }),
  ).toContainText("Tầng 10");
  expect(s.writes).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(remove).toBeFocused();
  await remove.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xóa địa chỉ", exact: true })
    .click();
  await expect.poll(() => s.addresses.length).toBe(1);
  expect(
    s.writes.filter((w) => w.path.startsWith("/me/addresses/")),
  ).toHaveLength(1);
});
test("address suggestions are local, keep typed historic data and do not reset other fields", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/customer/addresses");
  await page
    .getByRole("button", { name: "Sửa địa chỉ", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Tỉnh/thành phố", { exact: true })).toHaveValue(
    "Thành phố Đà Nẵng",
  );
  const wards = page.locator("datalist").nth(1);
  await expect(wards.locator("option")).not.toHaveCount(0);
  await page
    .getByLabel("Tỉnh/thành phố", { exact: true })
    .fill("Địa chỉ lịch sử");
  await expect(page.getByLabel("Phường/xã", { exact: true })).toHaveValue(
    "Phường Hải Châu",
  );
  await expect(page.getByLabel("Số điện thoại", { exact: true })).toHaveValue(
    "0901234567",
  );
});
test("staff permission checkboxes stay local until Save; lock and revoke require confirmation", async ({
  page,
}) => {
  const s = await setup(page, { owner: true });
  await page.goto("/seller/staff");
  await page.getByRole("button", { name: "Sửa quyền", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Sửa quyền nhân viên",
    exact: true,
  });
  await editor
    .getByRole("checkbox", { name: "Xem và điều chỉnh kho", exact: true })
    .check();
  expect(s.writes).toEqual([]);
  await editor.getByRole("button", { name: "Lưu quyền", exact: true }).click();
  await expect(editor).toHaveCount(0);
  expect(s.writes[0].body).toMatchObject({
    expected_version: 2,
    permissions: ["product.store.read_write", "inventory.store.read_adjust"],
  });
  await page
    .getByRole("button", { name: "Khóa nhân viên", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Quay lại", exact: true })
    .click();
  expect(s.member.status).toBe("ACTIVE");
  await page.getByRole("button", { name: "Lời mời (1)", exact: true }).click();
  await page.getByRole("button", { name: "Thu hồi", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Thu hồi lời mời?", exact: true }),
  ).toContainText("new@example.test");
  expect(s.writes).toHaveLength(1);
});
test("notification read-all updates through one owner-scoped request", async ({
  page,
}) => {
  const s = await setup(page);
  await page.goto("/customer/notifications");
  await page
    .getByRole("button", { name: "Đánh dấu tất cả đã đọc", exact: true })
    .click();
  await expect(
    page.getByText("0 thông báo chưa đọc", { exact: true }),
  ).toBeVisible();
  expect(
    s.writes.filter((w) => w.path === "/me/notifications/read-all"),
  ).toHaveLength(1);
  await expect(
    page.getByRole("complementary", { name: "Điều hướng tài khoản" }),
  ).toBeVisible();
});
test("star picker uses keyboard-capable radio inputs and review filtering is sent to server", async ({
  page,
}) => {
  const s = await setup(page);
  await page.goto("/products/" + id(1));
  await expect(
    page.getByRole("img", { name: "4,5 trên 5 sao, 2 đánh giá" }),
  ).toBeVisible();
  await page.getByLabel("Lọc số sao", { exact: true }).selectOption("2");
  await page
    .getByLabel("Sắp xếp đánh giá", { exact: true })
    .selectOption("rating_asc");
  await expect
    .poll(() => s.reviewQueries.at(-1)?.get("sort"))
    .toBe("rating_asc");
  expect(s.reviewQueries.at(-1)?.get("rating")).toBe("2");
  await page.getByLabel("Mục đơn hàng", { exact: true }).selectOption(id(23));
  await page.getByRole("radio", { name: "3 sao", exact: true }).check();
  await page
    .getByLabel("Nội dung đánh giá", { exact: true })
    .fill("Áo đúng phân loại đã mua");
  await page.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
  await expect
    .poll(() => s.writes.find((w) => w.path === "/me/reviews")?.body.rating)
    .toBe(3);
});
for (const width of [1440, 390])
  test(`checkout layout remains readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await checkout(page);
    await page
      .getByRole("button", { name: "Chọn mã ưu đãi", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `C:/PBL6/artifacts/ui-review-fixes/checkout-vouchers-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `C:/PBL6/artifacts/ui-review-fixes/checkout-${width}.png`,
      fullPage: true,
    });
  });

test('inventory sections preserve a variant deep link without stacking all workspaces',async({page})=>{
 await setup(page,{owner:true});await page.goto('/seller/inventory?variant_id='+id(4)+'#stock-history');await expect(page.getByRole('heading',{name:'Lịch sử biến động kho',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Đối chiếu tồn thương mại theo kỳ',exact:true})).toHaveCount(0);await page.getByRole('link',{name:'Tồn có thể bán',exact:true}).click();await expect(page).toHaveURL(new RegExp('variant_id='+id(4)+'.*view=inventory'));await expect(page.getByRole('heading',{name:'Lịch sử biến động kho',exact:true})).toHaveCount(0);
});
test('voucher editor is a drawer with an illustrative preview and deliberate discard',async({page})=>{
 const s=await setup(page,{owner:true});await page.goto('/seller/vouchers');await expect(page.getByText(/Còn 97 lượt/)).toBeVisible();await page.getByRole('button',{name:'Tạo voucher mới',exact:true}).click();const drawer=page.getByRole('dialog',{name:'Tạo voucher mới',exact:true});await expect(drawer.getByRole('heading',{name:'Thử mức giảm',exact:true})).toBeVisible();await drawer.getByRole('spinbutton',{name:'Tiền hàng ví dụ (VND)',exact:true}).fill('250000');await expect(drawer.locator('.voucher-preview')).toContainText('10.000');await drawer.getByRole('textbox',{name:'Mã voucher',exact:true}).fill('CHUALUU');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Bỏ thay đổi voucher?',exact:true}).getByRole('button',{name:'Quay lại',exact:true}).click();await expect(drawer.getByRole('textbox',{name:'Mã voucher',exact:true})).toHaveValue('CHUALUU');expect(s.writes).toEqual([]);
});
