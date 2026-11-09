import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "b3000000-0000-4000-8000-" + String(n).padStart(12, "0");
async function model(
  page: Page,
  role: "CUSTOMER" | "STORE_OWNER" | "ADMIN" = "CUSTOMER",
  conflict = false,
) {
  const s = {
    writes: [] as { path: string; body: any }[],
    audit: [] as string[],
    profile: {
      user_id: id(1),
      email: "demo@example.test",
      display_name: "Tên đã lưu",
      phone: "0901234567",
    },
    store: {
      id: id(2),
      name: "An Nhiên Studio",
      status: "ACTIVE",
      version: 4,
      shipping_fee_vnd: 25000,
      return_address: {
        recipient_name: "Kho An Nhiên",
        phone: "0909999999",
        line1: "123 Đường A",
        ward: "Phường Hải Châu",
        district: "Hải Châu",
        city: "Đà Nẵng",
      },
    },
    review: {
      id: id(3),
      order_item_id: id(4),
      product_id: id(5),
      rating: 4,
      body: "Đánh giá cần xem xét",
      status: "VISIBLE",
      version: 7,
    },
  };
  const type = {
    id: id(6),
    name: "Áo thun",
    status: "ACTIVE",
    category_id: id(8),
    version: 1,
    attribute_definitions: [
      {
        id: id(7),
        product_type_id: id(6),
        code: "color",
        name: "Màu sắc",
        data_type: "STRING",
        required: true,
        variant_axis: true,
        allowed_values: ["Đỏ", "Xanh"],
        version: 1,
      },
    ],
  };
  const product = {
    id: id(5),
    store_id: id(2),
    product_type_id: id(6),
    title: "Áo cotton",
    description: "Áo cotton thoáng mát",
    status: "ACTIVE",
    moderation_status: "VISIBLE",
    version: 4,
    attributes: {},
    variants: Array.from({ length: 6 }, (_, i) => ({
      id: id(20 + i),
      sku: "SHIRT-" + i,
      price_vnd: 120000 + i * 1000,
      status: "ACTIVE",
      is_default: i === 0,
      variant_values: { color: i % 2 ? "Xanh" : "Đỏ" },
      available_quantity: 10,
    })),
    images: [],
    review_summary: { average: 4, count: 1 },
  };
  const delivery = {
    id: id(30),
    order_id: id(31),
    store_id: id(2),
    status: "OPEN",
    reason: "Khách từ chối nhận",
    version: 1,
    inventory_status: "PENDING",
    payment_method: "COD",
    payment_status: "PENDING",
    amount_vnd: 250000,
    money_settled: false,
    inspection: [],
    items: [
      {
        order_item_id: id(32),
        product_id: id(5),
        variant_id: id(20),
        product_snapshot: { title: "Áo cotton" },
        quantity: 3,
        unit_price_vnd: 120000,
      },
    ],
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = decodeURIComponent(url.pathname.replace("/api/v1", "")),
      method = req.method();
    if (p === "/auth/login" || p === "/auth/refresh")
      return route.fulfill({
        json: {
          ...f.login.response,
          context: {
            user_id: id(1),
            roles:
              role === "ADMIN"
                ? ["ADMIN"]
                : role === "STORE_OWNER"
                  ? ["CUSTOMER", "STORE_OWNER"]
                  : ["CUSTOMER"],
            role_permissions: role === "ADMIN" ? ["platform.admin"] : [],
            token_version: 0,
            ...(role === "STORE_OWNER"
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
    const list = (items: any[], size = 20) =>
      route.fulfill({
        json: {
          items,
          page: Number(url.searchParams.get("page") ?? 1),
          size,
          total: items.length,
        },
      });
    if (p === "/me") {
      if (method === "PATCH") Object.assign(s.profile, req.postDataJSON());
      return route.fulfill({ json: s.profile });
    }
    if (p === "/store") {
      if (method === "PATCH")
        Object.assign(s.store, req.postDataJSON(), { version: 5 });
      return route.fulfill({ json: s.store });
    }
    if (p === "/me/addresses")
      return list(
        [
          {
            id: id(9),
            recipient_name: "Lan",
            phone: "0901111111",
            line1: "123 Đường B",
            ward: "Phường A",
            district: "Quận B",
            city: "Huế",
            is_default: true,
          },
        ],
        100,
      );
    if (p === "/me/notifications")
      return route.fulfill({
        json: { items: [], page: 1, size: 1, total: 0, unread: 3 },
      });
    if (p === "/product-types") return list([type], 100);
    if (p === "/categories")
      return list([{ id: id(8), name: "Thời trang", status: "ACTIVE" }], 100);
    if (p === "/store/products/" + id(5) || p === "/products/" + id(5))
      return route.fulfill({ json: product });
    if (p === "/products" || p === "/store/products" || p === "/admin/products")
      return list([product]);
    if (p.startsWith("/admin/products/") && p.endsWith("/hide"))
      return route.fulfill(
        conflict
          ? {
              status: 409,
              json: {
                code: "VERSION_CONFLICT",
                message: "Sản phẩm vừa được sửa",
              },
            }
          : { json: { ...product, moderation_status: "HIDDEN", version: 5 } },
      );
    if (p === "/admin/reviews") return list([s.review]);
    if (p === "/admin/reviews/" + id(3) + "/hide") {
      if (conflict)
        return route.fulfill({
          status: 409,
          json: { code: "VERSION_CONFLICT", message: "Đánh giá đã thay đổi" },
        });
      s.review.status = "HIDDEN";
      s.review.version = 8;
      return route.fulfill({ json: s.review });
    }
    if (p === "/admin/users")
      return list([
        {
          id: id(1),
          email: "demo@example.test",
          display_name: "Tên đã lưu",
          status: "ACTIVE",
          version: 1,
        },
      ]);
    if (p === "/admin/stores") return list([s.store]);
    if (p.includes("/audit/actors"))
      return route.fulfill({ json: { items: [] } });
    if (p.startsWith("/admin/audit/") || p.startsWith("/store/audit/")) {
      s.audit.push(url.search);
      return list([]);
    }
    if (p === "/store/delivery-returns") return list([delivery]);
    if (p === "/auth/register")
      return route.fulfill({ json: { message: "Đăng ký đã tiếp nhận" } });
    if (p === "/auth/verify-email")
      return route.fulfill({ json: { message: "Verified" } });
    return list([]);
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
test.use({ viewport: { width: 1440, height: 900 } });
test("profile starts read-only, cancel discards the draft and Save changes the displayed result", async ({
  page,
}) => {
  const s = await model(page);
  await page.goto("/customer/profile");
  await expect(
    page.getByRole("region", { name: "Thông tin cá nhân hiện tại" }),
  ).toBeVisible();
  await expect(page.locator("#profile-display-name")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("Tên đã lưu");
  await page
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Bản nháp");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  expect(s.writes).toEqual([]);
  await expect(page.locator("main")).not.toContainText("Bản nháp");
  await page
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tên mới");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.locator("#profile-display-name")).toHaveCount(0);
  await expect(page.locator("main")).toContainText("Tên mới");
  expect(s.writes[0]).toMatchObject({
    path: "/me",
    body: { display_name: "Tên mới", phone: "0901234567" },
  });
});
test("Store view requires explicit edit and cancel does not patch", async ({
  page,
}) => {
  const s = await model(page, "STORE_OWNER");
  await page.goto("/seller/settings");
  await expect(page.getByLabel("Tên gian hàng", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Chỉnh sửa gian hàng", exact: true })
    .click();
  await page.getByLabel("Tên gian hàng", { exact: true }).fill("Không lưu");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  expect(s.writes).toEqual([]);
  await expect(page.locator("main")).toContainText("An Nhiên Studio");
});
test("address form only opens on Add or Edit, with explicit cancel", async ({
  page,
}) => {
  const s = await model(page);
  await page.goto("/customer/addresses");
  await expect(page.getByLabel("Tên người nhận", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Thêm địa chỉ", exact: true }).click();
  await page.getByLabel("Tên người nhận", { exact: true }).fill("Chưa lưu");
  await page
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await expect(page.getByLabel("Tên người nhận", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Sửa địa chỉ", exact: true }).click();
  await expect(page.getByLabel("Tên người nhận", { exact: true })).toHaveValue(
    "Lan",
  );
  await page
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  expect(s.writes).toEqual([]);
});
test("product sections preserve variant drafts while switching and rows stay collapsed until needed", async ({
  page,
}) => {
  await model(page, "STORE_OWNER");
  await page.goto("/seller/products/" + id(5) + "/edit");
  await page
    .getByRole("button", { name: "Biến thể & giá", exact: true })
    .click();
  await expect(page.locator(".variant-accordion")).toHaveCount(6);
  await expect(
    page.locator(".variant-accordion input").first(),
  ).not.toBeVisible();
  await page.locator(".variant-accordion summary").first().click();
  await page.locator(".variant-accordion input").first().fill("SKU-DRAFT");
  await page
    .getByRole("button", { name: "Thông tin chung", exact: true })
    .click();
  await expect(page.getByLabel("Tên sản phẩm", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Biến thể & giá", exact: true })
    .click();
  await expect(page.locator(".variant-accordion input").first()).toHaveValue(
    "SKU-DRAFT",
  );
});
test("product moderation opens a deliberate decision and cancelling sends no command", async ({
  page,
}) => {
  const s = await model(page, "ADMIN");
  await page.goto("/admin?tab=catalog&section=products");
  await expect(
    page.getByLabel("Lý do kiểm duyệt sản phẩm", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ẩn sản phẩm", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Quyết định kiểm duyệt sản phẩm",
    exact: true,
  });
  await dialog
    .getByLabel("Lý do kiểm duyệt sản phẩm", { exact: true })
    .fill("Lý do đang nhập");
  await dialog
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Bỏ lý do chưa gửi?", exact: true })
    .getByRole("button", { name: "Bỏ bản nháp", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(s.writes).toEqual([]);
});
test("review moderation displays stars and submits its exact version in a modal", async ({
  page,
}) => {
  const s = await model(page, "ADMIN");
  await page.goto("/admin?tab=catalog&section=reviews");
  await expect(
    page.getByRole("img", { name: "4 trên 5 sao", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Xem sản phẩm/ }),
  ).toHaveAttribute("target", "_blank");
  await page.getByRole("button", { name: "Ẩn đánh giá", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Quyết định kiểm duyệt đánh giá",
  });
  await dialog
    .getByLabel("Lý do kiểm duyệt", { exact: true })
    .fill("Nội dung không phù hợp");
  await dialog
    .getByRole("button", { name: "Ẩn đánh giá", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(s.writes[0]).toEqual({
    path: "/admin/reviews/" + id(3) + "/hide",
    body: { expected_version: 7, reason: "Nội dung không phù hợp" },
  });
});
test("review conflict freezes the original decision until readback", async ({
  page,
}) => {
  const s = await model(page, "ADMIN", true);
  await page.goto("/admin?tab=catalog&section=reviews");
  await page.getByRole("button", { name: "Ẩn đánh giá", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Quyết định kiểm duyệt đánh giá",
  });
  await dialog
    .getByLabel("Lý do kiểm duyệt", { exact: true })
    .fill("Giữ lý do");
  await dialog
    .getByRole("button", { name: "Ẩn đánh giá", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Đánh giá đã thay đổi");
  await expect(
    dialog.getByLabel("Lý do kiểm duyệt", { exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(s.writes).toHaveLength(1);
});
test("attribute selection is view-only until Create/Edit; choices can be added and removed without saving", async ({
  page,
}) => {
  const s = await model(page, "ADMIN");
  await page.goto("/admin?tab=catalog&section=attributes");
  await page
    .getByLabel("Loại sản phẩm chứa thuộc tính", { exact: true })
    .selectOption(id(6));
  await expect(page.getByLabel("Tên thuộc tính", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByLabel("Thuộc tính cần sửa", { exact: true })
    .selectOption(id(7));
  await page
    .getByRole("button", { name: "Sửa thuộc tính", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Sửa thuộc tính",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Mã thuộc tính", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await dialog.getByLabel("Thêm giá trị cho phép", { exact: true }).fill("Kem");
  await dialog
    .getByRole("button", { name: "Thêm giá trị", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Xóa giá trị Kem", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Xóa giá trị Kem", exact: true })
    .click();
  expect(s.writes).toEqual([]);
});
test("Admin audit has sources, identity lookup and reset; Store audit renders one source at a time", async ({
  page,
}) => {
  const s = await model(page, "ADMIN");
  await page.goto("/admin?tab=audit&action=UPDATE");
  await page.locator(".audit-advanced summary").click();
  await page
    .getByLabel("Tìm người theo tên hoặc email", { exact: true })
    .fill("demo");
  await page
    .getByRole("button", { name: "Tìm người thực hiện", exact: true })
    .click();
  await page
    .locator(".audit-lookup")
    .first()
    .getByRole("button", { name: /Tên đã lưu/ })
    .click();
  await expect(
    page.getByLabel("Mã người thực hiện", { exact: true }),
  ).toHaveValue(id(1));
  await page
    .getByRole("button", { name: "Lọc", exact: true })
    .click();
  await expect(page).toHaveURL(/actor_user_id=/);
  await page
    .getByRole("button", { name: "Đơn hàng và thanh toán", exact: true })
    .click();
  await expect(page).not.toHaveURL(/actor_user_id=/);
  await expect(page.getByLabel("Hành động", { exact: true })).toHaveValue("");
  await page.getByLabel("Hành động", { exact: true }).fill("NEW");
  await page
    .getByRole("button", { name: "Xóa tất cả bộ lọc", exact: true })
    .click();
  await expect(page.getByLabel("Hành động", { exact: true })).toHaveValue("");
  expect(s.audit.length).toBeGreaterThan(0);
});
test("returns list is collapsed and inspection shows running totals with progress", async ({
  page,
}) => {
  await model(page, "STORE_OWNER");
  await page.goto("/seller/delivery-returns");
  const entry = page.locator(".delivery-case-accordion");
  await expect(entry).toHaveCount(1);
  await expect(
    page.getByRole("heading", {
      name: "Biên bản thực nhận và kiểm hàng",
      exact: true,
    }),
  ).not.toBeVisible();
  await entry.locator("summary").first().click();
  await expect(
    page.getByRole("list", { name: "Tiến trình hoàn về" }),
  ).toBeVisible();
  await page.getByLabel("Thực nhận", { exact: true }).fill("3");
  await page.getByLabel("Đủ điều kiện bán lại", { exact: true }).fill("2");
  await page.getByLabel("Hỏng / không bán lại", { exact: true }).fill("1");
  await expect(page.locator(".inspection-totals")).toContainText(
    "Thực nhận 3/3",
  );
  await expect(page.locator(".inspection-totals")).toContainText("Bán lại 2");
});
test("header shows real unread badge and the catalog only shows supplied ratings", async ({
  page,
}) => {
  await model(page);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Thông báo, 3 chưa đọc", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".catalog-rating").first()).toContainText(
    "1 đánh giá",
  );
  await page
    .getByRole("button", { name: "Menu tài khoản", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Menu tài khoản", exact: true })
      .getByRole("link", { name: "Cài đặt", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Menu tài khoản", exact: true })
      .getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
});
test("password visibility preserves input and registration then verification guide the next page", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (r) => {
    const p = new URL(r.request().url()).pathname;
    if (p.endsWith("/auth/register") || p.endsWith("/auth/verify-email"))
      return r.fulfill({ json: { message: "Accepted" } });
    return r.fulfill({ json: { items: [], total: 0, page: 1, size: 20 } });
  });
  await page.goto("/register");
  const pass = page.getByLabel("Mật khẩu", { exact: true });
  await pass.fill("Sample-password-123");
  await page
    .getByRole("button", { name: "Hiện mật khẩu", exact: true })
    .click();
  await expect(pass).toHaveAttribute("type", "text");
  await expect(pass).toHaveValue("Sample-password-123");
  await page.getByLabel("Email", { exact: true }).fill("sample@example.test");
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  await expect(page).toHaveURL("/verify-email");
  await expect(page.getByRole("status")).toContainText("Kiểm tra email");
  await page.getByLabel("Mã xác thực", { exact: true }).fill("fixture-token");
  await page
    .getByRole("button", { name: "Xác thực email", exact: true })
    .click();
  await expect(page).toHaveURL("/login");
  await expect(
    page.getByRole("status").filter({ hasText: "Email đã được xác thực" }),
  ).toBeVisible();
});
test("desktop profile and product editor screenshots show focused content without horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await model(page, "STORE_OWNER");
  await page.goto("/customer/profile");
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "C:/PBL6/artifacts/ui-round3/profile-desktop.png",
  });
  await page.goto("/seller/products/" + id(5) + "/edit");
  await page
    .getByRole("button", { name: "Biến thể & giá", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "C:/PBL6/artifacts/ui-round3/variants-desktop.png",
  });
  expect(errors).toEqual([]);
});

test("Store save sends the loaded version and read mode reflects the updated values", async ({
  page,
}) => {
  const s = await model(page, "STORE_OWNER");
  await page.goto("/seller/settings");
  await page
    .getByRole("button", { name: "Chỉnh sửa gian hàng", exact: true })
    .click();
  await page.getByLabel("Tên gian hàng", { exact: true }).fill("Studio đã sửa");
  await page
    .getByRole("button", { name: "Lưu thông tin", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Chỉnh sửa gian hàng", exact: true }),
  ).toBeVisible();
  expect(s.writes[0]).toMatchObject({
    path: "/store",
    body: {
      name: "Studio đã sửa",
      expected_version: 4,
      shipping_fee_vnd: 25000,
    },
  });
  await expect(page.locator("main")).toContainText("Studio đã sửa");
});
test("attribute edit preserves identity/version and submits the actual list of choices", async ({
  page,
}) => {
  const s = await model(page, "ADMIN");
  await page.goto("/admin?tab=catalog&section=attributes");
  await page
    .getByLabel("Loại sản phẩm chứa thuộc tính", { exact: true })
    .selectOption(id(6));
  await page
    .getByLabel("Thuộc tính cần sửa", { exact: true })
    .selectOption(id(7));
  await page
    .getByRole("button", { name: "Sửa thuộc tính", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "Sửa thuộc tính",
    exact: true,
  });
  await modal.getByLabel("Thêm giá trị cho phép", { exact: true }).fill("Kem");
  await modal
    .getByRole("button", { name: "Thêm giá trị", exact: true })
    .click();
  await modal
    .getByRole("button", { name: "Lưu thuộc tính", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  expect(s.writes[0]).toMatchObject({
    path: "/admin/attribute-definitions/" + id(7),
    body: {
      expected_version: 1,
      allowed_values: ["Đỏ", "Xanh", "Kem"],
      name: "Màu sắc",
    },
  });
  expect(s.writes[0].body.code).toBeUndefined();
});
test("readiness anchors reveal the corresponding hidden editor without losing a general draft", async ({
  page,
}) => {
  await model(page, "STORE_OWNER");
  await page.goto("/seller/products/" + id(5) + "/edit");
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Tên đang nhập");
  await page.locator(".product-readiness-disclosure>summary").click();
  await page
    .getByRole("link", { name: "Kiểm tra phân loại", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Chỉnh sửa biến thể", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Thông tin chung", exact: true })
    .click();
  await expect(page.getByLabel("Tên sản phẩm", { exact: false })).toHaveValue(
    "Tên đang nhập",
  );
});
test("Store audit source switching keeps one query and one result area", async ({
  page,
}) => {
  const s = await model(page, "STORE_OWNER");
  await page.goto("/seller/audit");
  await page
    .getByRole("button", { name: "Đơn hàng và thanh toán", exact: true })
    .click();
  await expect(page).toHaveURL(/source=commerce/);
  await expect(
    page.getByRole("heading", { name: "Nhật ký Store", exact: true }),
  ).toBeVisible();
  expect(s.audit.length).toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Đơn hàng và thanh toán", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
