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
async function model(page: Page, owner = false, numericAxis = false) {
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
      ...(numericAxis ? [{ code: "width", name: "Độ rộng", data_type: "NUMBER", required: true, variant_axis: true }] : []),
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
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Cập nhật thông tin thành công",
  );
  expect(s.writes).toEqual([{ path: "/me", body: { phone: "0909999999" } }]);
  await page.getByRole("button", { name: "Thay đổi tên", exact: true }).click();
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tên chưa lưu");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
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
  await expect(dialog.getByLabel("Giá bán (VNĐ) *", { exact: true })).toHaveValue("");
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
  for (const value of ["Đỏ", "Xanh", "Đen", "S", "M", "L", "XL"]) {
    await matrix.getByRole("checkbox", { name: value, exact: true }).check();
  }
  await expect(matrix.getByText("3 màu sắc × 4 kích cỡ = 12 phân loại", { exact: true })).toBeVisible();
  await matrix
    .getByRole("button", { name: "Xem trước tổ hợp", exact: true })
    .click();
  await expect(matrix.locator("tbody tr")).toHaveCount(12);
  const create = dialog.getByRole("button", { name: "Tạo sản phẩm", exact: true });
  const common = dialog.getByLabel("Giá chung (VNĐ)", { exact: true });
  const apply = dialog.getByRole("button", { name: "Áp dụng giá cho các phân loại", exact: true });
  await expect(create).toBeDisabled();
  await common.fill("100000");
  await apply.click();
  await matrix.getByLabel("SKU tổ hợp 12", { exact: true }).fill("CUSTOM-XL");
  await matrix.getByLabel("Giá tổ hợp 12", { exact: true }).fill("95000");
  await common.fill("159000");
  await expect(create).toBeDisabled();
  await expect(dialog.getByText(/Giá mới chưa được áp dụng/)).toBeVisible();
  await expect(matrix.getByLabel("Giá tổ hợp 1", { exact: true })).toHaveValue("100000");
  await apply.click();
  await expect(matrix.getByLabel("Giá tổ hợp 1", { exact: true })).toHaveValue("159000");
  await expect(matrix.getByLabel("Giá tổ hợp 12", { exact: true })).toHaveValue("95000");
  await expect(matrix.getByLabel("Giá tổ hợp 12", { exact: true })).toHaveAccessibleDescription("Giá riêng");
  await expect(dialog.getByText("1 phân loại giữ giá riêng.", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("variant-matrix.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await common.scrollIntoViewIfNeeded();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(apply).toBeInViewport();
  await page.screenshot({ path: info.outputPath("variant-matrix-mobile.png") });
  await dialog
    .getByRole("button", { name: "Tạo sản phẩm", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(s.writes).toHaveLength(1);
  const rows = s.writes[0].body.variants;
  expect(rows).toHaveLength(12);
  expect(rows.slice(0, 11).map((row: any) => row.price_vnd)).toEqual(Array(11).fill(159000));
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
test("matrix explains an invalid free value next to its field before generation", async ({
  page,
}) => {
  const { s } = await model(page, true, true);
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
  await matrix.getByRole("checkbox", { name: "Đỏ", exact: true }).check();
  await matrix.getByRole("checkbox", { name: "M", exact: true }).check();
  const width = matrix.getByRole("textbox", { name: "Độ rộng", exact: true });
  await width.fill("3, rộng");
  await expect(width).toHaveAccessibleDescription(/“rộng” phải là số/);
  await expect(matrix.getByRole("button", { name: "Xem trước tổ hợp", exact: true })).toBeDisabled();
  expect(s.writes).toEqual([]);
  await expect(
    dialog.getByRole("button", { name: "Tạo sản phẩm", exact: true }),
  ).toBeDisabled();
});
test("image actions stay out of the grid until requested and removal requires confirmation", async ({ page }, info) => {
  await model(page, true);
  const productId = id(20);
  const artwork = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" fill="tan"/%3E%3C/svg%3E';
  let images = Array.from({ length: 12 }, (_, index) => ({
    id: id(30 + index), product_id: productId, image_url: artwork + '#' + index, position: index,
  }));
  const removed: string[] = [];
  const reorders: any[] = [];
  const productPath = `/api/v1/store/products/${productId}`;
  await page.route(url => url.pathname === productPath, route => route.fulfill({ json: {
    id: productId, store_id: id(2), product_type_id: id(3), title: 'Áo có 12 ảnh',
    attributes: {}, version: 1, status: 'DRAFT', variants: [], images,
  } }));
  await page.route(url => url.pathname === `${productPath}/images/reorder`, route => {
    const body = route.request().postDataJSON();
    reorders.push(body);
    images = body.image_ids.map((imageId: string, position: number) => ({ ...images.find(image => image.id === imageId)!, position }));
    return route.fulfill({json:{product_id:productId,image_ids:body.image_ids}});
  });
  await page.route(url => url.pathname === `${productPath}/images/${id(31)}`, route => {
    expect(route.request().method()).toBe('DELETE');
    removed.push(id(31));
    images = images.filter(image => image.id !== id(31));
    return route.fulfill({json:{id:id(31),product_id:productId}});
  });
  await page.goto(`/seller/products/${productId}/edit#product-images`);
  const panel = page.locator('#product-images');
  await expect(panel.getByRole('button',{name:'Thêm ảnh',exact:true})).toBeInViewport();
  await expect(panel.getByRole('img')).toHaveCount(12);
  await expect(panel.getByRole('button',{name:/^(Đưa ảnh|Bỏ ảnh sản phẩm)/})).toHaveCount(0);
  await page.screenshot({path:info.outputPath('image-actions-desktop.png')});
  await panel.getByRole('button',{name:'Sắp xếp ảnh',exact:true}).click();
  await panel.getByRole('button',{name:'Đưa ảnh 2 lên trước',exact:true}).click();
  await expect(panel.getByRole('img',{name:'Ảnh sản phẩm 1',exact:true})).toHaveAttribute('src',artwork+'#1');
  expect(reorders[0].expected_image_ids.slice(0,2)).toEqual([id(30),id(31)]);
  expect(reorders[0].image_ids.slice(0,2)).toEqual([id(31),id(30)]);
  await panel.getByRole('button',{name:'Xong sắp xếp',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await panel.getByRole('button',{name:'Thêm ảnh',exact:true}).scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('image-actions-mobile.png')});
  const openRemoval = async () => {
    await panel.getByRole('button',{name:'Thêm thao tác cho ảnh 1',exact:true}).click();
    await panel.getByRole('button',{name:'Bỏ ảnh sản phẩm 1',exact:true}).click();
  };
  await openRemoval();
  const confirm = page.getByRole('dialog',{name:'Bỏ ảnh sản phẩm?',exact:true});
  expect(removed).toEqual([]);
  await confirm.getByRole('button',{name:'Quay lại',exact:true}).click();
  await expect(panel.getByRole('img')).toHaveCount(12);
  await openRemoval();
  await confirm.getByRole('button',{name:'Bỏ ảnh',exact:true}).click();
  await expect(panel.getByRole('img')).toHaveCount(11);
  expect(removed).toEqual([id(31)]);
});

test("bulk price shows an unsaved count and a nearby save while preserving stopped rows", async ({ page }, info) => {
  await model(page, true);
  const productId = id(20);
  const variants = ["Đỏ", "Xanh", "Đen"].flatMap((color, i) => ["S", "M", "L", "XL"].map((size, j) => ({
    id: id(60 + 4 * i + j), sku: `${i}-${j}`, price_vnd: 100000,
    variant_values: {color,size}, status: i === 2 && j === 3 ? 'STOPPED' : 'ACTIVE', is_default: i === 0 && j === 0,
  })));
  let product = { id:productId, store_id:id(2), product_type_id:id(3), title:'Áo 12 phân loại',
    status:'DRAFT', attributes:{color:'Đỏ',size:'S'}, images:[], version:3, variants };
  const writes: any[] = [];
  await page.route(url => url.pathname === `/api/v1/store/products/${productId}`, route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      writes.push(body);
      product = {...product, version:4, variants:body.variants};
    }
    return route.fulfill({json:product});
  });
  await page.goto(`/seller/products/${productId}/edit#product-variants`);
  const editor = page.getByRole('region',{name:'Chỉnh sửa biến thể',exact:true});
  const save = editor.getByRole('button',{name:'Lưu biến thể',exact:true});
  await expect(save).toHaveCount(0);
  await editor.getByLabel('Giá cho các phân loại đang bán (VNĐ)',{exact:true}).fill('159000');
  await editor.getByRole('button',{name:'Áp giá vào bản nháp',exact:true}).click();
  await expect(editor.getByText('11 phân loại đã đổi giá · Chưa lưu',{exact:true})).toBeVisible();
  await expect(save).toBeInViewport();
  expect(writes).toEqual([]);
  await page.screenshot({path:info.outputPath('bulk-price-desktop.png')});
  await save.click();
  await expect(editor.getByText('Đã lưu biến thể.',{exact:true})).toBeVisible();
  await expect(save).toHaveCount(0);
  expect(writes[0].expected_version).toBe(3);
  expect(writes[0].variants).toHaveLength(12);
  expect(writes[0].variants.slice(0,11).map((row: any)=>row.price_vnd)).toEqual(Array(11).fill(159000));
  expect(writes[0].variants[11]).toMatchObject({price_vnd:100000,status:'STOPPED'});
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
    .getByRole("button", { name: "In phiếu", exact: true })
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
