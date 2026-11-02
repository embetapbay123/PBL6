import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "b5000000-0000-4000-8000-" + String(n).padStart(12, "0");
test.use({ viewport: { width: 1440, height: 900 } });
async function model(page: Page, owner = false) {
  const s = {
    writes: [] as { path: string; body: any }[],
    profile: {
      user_id: id(1),
      email: "fixture@example.test",
      display_name: "Tên nguyên bản",
      phone: "0901234567",
    },
    products: [] as any[],
    member: {
      id: id(5),
      user_id: id(6),
      email: "staff@example.test",
      permissions: ["product.store.read_write"],
      status: "ACTIVE",
      version: 3,
    },
  };
  const context = {
    user_id: id(1),
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
  };
  const type = {
    id: id(3),
    name: "Áo thun",
    status: "ACTIVE",
    category_id: id(4),
    version: 1,
    attribute_definitions: [
      {
        code: "color",
        name: "Màu sắc",
        data_type: "STRING",
        required: true,
        variant_axis: true,
        allowed_values: ["Đỏ", "Xanh", "Đen"],
      },
      {
        code: "size",
        name: "Kích cỡ",
        data_type: "STRING",
        required: true,
        variant_axis: true,
        allowed_values: ["S", "M", "L", "XL"],
      },
    ],
  };
  const order = {
    ...f.getOwnOrder.response,
    id: id(10),
    store_id: id(2),
    status: "SHIPPED",
    payment_method: "COD",
    payment_status: "PENDING",
    version: 3,
    address_snapshot: {
      recipient_name: "Nguyễn Người Nhận",
      phone: "0901234567",
      line1: "123 Đường kiểm thử",
      ward: "Phường A",
      district: "Quận B",
      city: "Đà Nẵng",
    },
    items: [
      {
        id: id(11),
        product_id: id(12),
        variant_id: id(13),
        sku_snapshot: "SKU-ĐỎ-M",
        product_snapshot: {
          title: "Áo đúng lúc đặt <script>unsafe</script>",
          variant_values: { color: "Đỏ", size: "M" },
        },
        quantity: 2,
        unit_price_vnd: 50000,
        line_total_vnd: 100000,
      },
    ],
    amounts: {
      goods_vnd: 100000,
      shipping_vnd: 20000,
      store_discount_vnd: 0,
      platform_discount_vnd: 0,
      payable_vnd: 120000,
    },
    created_at: "2026-11-01T01:00:00Z",
    timeline: [
      {
        status: "PENDING",
        actor_kind: "CUSTOMER",
        occurred_at: "2026-11-01T01:00:00Z",
      },
      {
        status: "SHIPPED",
        actor_kind: "STORE",
        occurred_at: "2026-11-02T01:00:00Z",
      },
    ],
  };
  await page.route("**/api/v1/**", (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/v1", "");
    if (path === "/auth/login" || path === "/auth/refresh")
      return route.fulfill({
        json: { ...f.login.response, context },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (path === "/me/context") return route.fulfill({ json: context });
    if (path === "/me") {
      if (req.method() === "PATCH") {
        const body = req.postDataJSON();
        s.writes.push({ path, body });
        Object.assign(s.profile, body);
      }
      return route.fulfill({ json: s.profile });
    }
    if (path === "/product-types")
      return route.fulfill({
        json: { items: [type], total: 1, page: 1, size: 100 },
      });
    if (path === "/store/products") {
      if (req.method() === "POST") {
        const body = req.postDataJSON();
        s.writes.push({ path, body });
        const product = {
          ...body,
          id: id(20),
          store_id: id(2),
          version: 1,
          moderation_status: "VISIBLE",
        };
        s.products.push(product);
        return route.fulfill({ status: 201, json: product });
      }
      return route.fulfill({
        json: {
          items: s.products,
          page: 1,
          size: 20,
          total: s.products.length,
        },
      });
    }
    if (path === "/store/staff")
      return route.fulfill({
        json: { items: [s.member], page: 1, size: 20, total: 1 },
      });
    if (path === "/store/staff/" + s.member.id && req.method() === "PATCH") {
      s.writes.push({ path, body: req.postDataJSON() });
      Object.assign(s.member, req.postDataJSON());
      return route.fulfill({ json: s.member });
    }
    if (path === "/me/orders" || path === "/store/orders")
      return route.fulfill({
        json: { items: [order], page: 1, size: 20, total: 1 },
      });
    if (
      path === "/me/orders/" + order.id ||
      path === "/store/orders/" + order.id
    )
      return route.fulfill({ json: order });
    if (path === "/stores/" + id(2))
      return route.fulfill({ json: { id: id(2), name: "Store hiện tại" } });
    if (path === "/store/staff/invitations")
      return route.fulfill({
        json: { items: [], total: 0, page: 1, size: 20 },
      });
    return route.fulfill({
      status: 404,
      json: {
        code: "NOT_FOUND",
        message: "Không có dữ liệu phụ trong fixture",
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
    page.getByRole("heading", { name: "Đã đăng nhập", exact: true }),
  ).toBeVisible();
  return { s, order };
}
test("editing just a phone does not send the name, and cancellation restores saved data", async ({
  page,
}) => {
  const { s } = await model(page);
  await page.goto("/customer/profile");
  await page
    .getByRole("button", { name: "Thay đổi số điện thoại", exact: true })
    .click();
  await expect(page.getByLabel("Tên hiển thị", { exact: true })).toHaveCount(0);
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0909999999");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Cập nhật thông tin thành công",
  );
  expect(s.writes).toEqual([{ path: "/me", body: { phone: "0909999999" } }]);
  await page.getByRole("button", { name: "Thay đổi tên", exact: true }).click();
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tên chưa lưu");
  await page.getByRole("button", { name: "Hủy thay đổi", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Thông tin cá nhân hiện tại" }),
  ).toContainText("Tên nguyên bản");
  expect(s.writes).toHaveLength(1);
});
test("matrix previews twelve variants, submits their exact prices and SKUs without setting stock", async ({
  page,
}, info) => {
  const { s } = await model(page, true);
  await page.goto("/seller/products");
  await page
    .getByRole("button", { name: "Thêm sản phẩm mới", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Thêm sản phẩm mới",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: "Loại sản phẩm *", exact: true })
    .selectOption(id(3));
  await dialog.getByLabel("Tạo nhiều phân loại theo ma trận").check();
  await dialog
    .getByLabel("Tên sản phẩm *", { exact: true })
    .fill("Áo 12 phân loại");
  await dialog
    .getByLabel("Tiền tố SKU cho các tổ hợp *", { exact: true })
    .fill("MATRIX");
  const matrix = dialog.getByRole("region", {
    name: "Ma trận phân loại",
    exact: true,
  });
  await matrix.getByLabel("Màu sắc", { exact: false }).fill("Đỏ, Xanh, Đen");
  await matrix.getByLabel("Kích cỡ", { exact: false }).fill("S, M, L, XL");
  await matrix
    .getByRole("button", { name: "Xem trước tổ hợp", exact: true })
    .click();
  await expect(matrix.locator("tbody tr")).toHaveCount(12);
  await matrix.getByLabel("SKU tổ hợp 12", { exact: true }).fill("CUSTOM-XL");
  await matrix.getByLabel("Giá tổ hợp 12", { exact: true }).fill("95000");
  await page.screenshot({ path: info.outputPath("variant-matrix.png") });
  await dialog
    .getByRole("button", { name: "Tạo sản phẩm", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(s.writes).toHaveLength(1);
  const rows = s.writes[0].body.variants;
  expect(rows).toHaveLength(12);
  expect(s.writes[0].body.attributes).toEqual({ color: "Đỏ", size: "S" });
  expect(rows.filter((r: any) => r.is_default)).toHaveLength(1);
  expect(rows[11]).toMatchObject({
    sku: "CUSTOM-XL",
    price_vnd: 95000,
    variant_values: { color: "Đen", size: "XL" },
  });
  expect(
    rows.every(
      (r: any) =>
        r.available_quantity === undefined && r.quantity === undefined,
    ),
  ).toBe(true);
});
test("matrix rejects unsupported axis values before generating rows", async ({
  page,
}) => {
  const { s } = await model(page, true);
  await page.goto("/seller/products");
  await page
    .getByRole("button", { name: "Thêm sản phẩm mới", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Loại sản phẩm *", exact: true })
    .selectOption(id(3));
  await dialog.getByLabel("Tạo nhiều phân loại theo ma trận").check();
  await dialog
    .getByLabel("Tiền tố SKU cho các tổ hợp *", { exact: true })
    .fill("MATRIX");
  const matrix = dialog.getByRole("region", { name: "Ma trận phân loại" });
  await matrix.getByLabel("Màu sắc", { exact: false }).fill("Giá trị lạ");
  await matrix.getByLabel("Kích cỡ", { exact: false }).fill("M");
  await matrix
    .getByRole("button", { name: "Xem trước tổ hợp", exact: true })
    .click();
  await expect(matrix.getByRole("alert")).toContainText("chưa đúng cấu hình");
  expect(s.writes).toEqual([]);
  await expect(
    dialog.getByRole("button", { name: "Tạo sản phẩm", exact: true }),
  ).toBeDisabled();
});
test("permission preset is a draft until explicit save and contains only actual inventory permission", async ({
  page,
}) => {
  const { s } = await model(page, true);
  await page.goto("/seller/staff");
  await page.getByRole("button", { name: "Sửa quyền", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Sửa quyền nhân viên" });
  await dialog.getByRole("button", { name: "Kho", exact: true }).click();
  await expect(
    dialog.getByLabel("Xem và điều chỉnh kho", { exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByLabel("Quản lý sản phẩm", { exact: true }),
  ).not.toBeChecked();
  expect(s.writes).toEqual([]);
  await dialog.getByRole("button", { name: "Lưu quyền", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(s.writes[0].body).toEqual({
    expected_version: 3,
    permissions: ["inventory.store.read_adjust"],
  });
});
test("customer detail has two desktop columns while timeline and item identity remain real", async ({
  page,
}, info) => {
  const { s, order } = await model(page);
  await page.goto("/customer/orders/" + order.id);
  await expect(page.locator(".order-detail-layout")).toBeVisible();
  const main = await page.locator(".order-detail-main").boundingBox(),
    side = await page.locator(".order-detail-sidebar").boundingBox();
  expect(side!.x).toBeGreaterThan(main!.x + main!.width);
  await expect(
    page.getByRole("region", { name: "Diễn biến đơn hàng" }),
  ).toContainText("Đã bàn giao giao hàng");
  await expect(
    page.getByRole("region", { name: "Địa chỉ giao hàng đã chốt" }),
  ).toContainText("Nguyễn Người Nhận");
  await expect(page.locator(".order-detail-items")).toContainText(
    "Áo đúng lúc đặt <script>unsafe</script>",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(s.writes).toEqual([]);
  await page.screenshot({
    path: info.outputPath("customer-order-detail.png"),
    fullPage: true,
  });
});
test("packing print uses order snapshots as text and does not collect money or transition the order", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.printRequested = "1";
    };
  });
  const { s } = await model(page, true);
  await page.goto("/seller/orders");
  await page.getByRole("button", { name: "Xem đơn", exact: true }).click();
  await page
    .getByRole("button", { name: "In phiếu đóng gói", exact: true })
    .click();
  const slip = page.frameLocator('iframe[title="Bản in phiếu đóng gói"]');
  await expect(slip.locator("body")).toContainText("SKU-ĐỎ-M");
  await expect(slip.locator("body")).toContainText("COD cần thu: 120.000 ₫");
  await expect(slip.locator("script")).toHaveCount(0);
  await expect(slip.locator("td").first()).toContainText(
    "<script>unsafe</script>",
  );
  expect(s.writes).toEqual([]);
  await page.screenshot({ path: info.outputPath("packing-source.png") });
});
test("settings categories survive reload and lead only to supported account flows", async ({
  page,
}) => {
  const { s } = await model(page);
  await page.goto("/customer/settings?section=security");
  const nav = page.getByRole("navigation", { name: "Danh mục cài đặt" });
  await expect(
    nav.getByRole("link", { name: "Bảo mật", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .locator(".account-settings-layout")
      .getByRole("link", { name: "Đổi mật khẩu" }),
  ).toHaveAttribute("href", "/change-password");
  await nav.getByRole("link", { name: "Thông báo", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Mở thông báo", exact: true }),
  ).toHaveAttribute("href", "/customer/notifications");
  expect(s.writes).toEqual([]);
});
