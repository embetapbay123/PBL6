import { test, expect, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = "d1000000-0000-4000-8000-000000000001";
async function routes(
  page: Page,
  {
    owner = false,
    productError = false,
    slow = false,
    paymentUnknown = false,
  } = {},
) {
  let pending: Route | undefined,
    products = 0,
    attempts = 0,
    failProducts = productError;
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      p = new URL(req.url()).pathname.replace("/api/v1", "");
    if (p === "/auth/login" || p === "/auth/refresh")
      return route.fulfill({
        json: {
          ...f.login.response,
          context: {
            user_id: id,
            roles: owner ? ["CUSTOMER", "STORE_OWNER"] : ["CUSTOMER"],
            token_version: 0,
            ...(owner
              ? {
                  store_membership: {
                    store_id: id,
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
    if (p === "/products") {
      products++;
      if (slow) {
        pending = route;
        return;
      }
      if (failProducts)
        return route.fulfill({
          status: 503,
          json: {
            code: "UNAVAILABLE",
            message: "Danh mục tạm thời chưa tải được.",
            correlation_id: "audit-support-20261103",
          },
        });
      return route.fulfill({
        json: { items: [], page: 1, size: 20, total: 0 },
      });
    }
    if (p === "/me/orders/" + id)
      return route.fulfill({
        json: {
          ...f.getOwnOrder.response,
          id,
          status: "AWAITING_PAYMENT",
          payment_status: paymentUnknown ? "UNKNOWN" : "PENDING",
          payment_method: "SANDBOX",
          version: 3,
          amounts: {
            goods_vnd: 100000,
            store_discount_vnd: 0,
            platform_discount_vnd: 0,
            shipping_vnd: 0,
            payable_vnd: 100000,
          },
        },
      });
    if (p.endsWith("/payment-attempts")) {
      attempts++;
      return route.fulfill({
        status: 503,
        json: { code: "NOT_EXPECTED", message: "Không được tạo attempt mới." },
      });
    }
    return route.fulfill({
      json: { items: [], total: 0, page: 1, size: 20, unread: 0 },
    });
  });
  return {
    pending: () => pending,
    attempts: () => attempts,
    recover: () => {
      failProducts = false;
    },
  };
}
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill("Fixture-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Đã đăng nhập", exact: true }),
  ).toBeVisible();
}
test.use({ viewport: { width: 1440, height: 900 } });

test("API error exposes a copyable support ID and retry recovers to a visible empty state", async ({
  page,
}, info) => {
  const state = await routes(page, { productError: true });
  await page.goto("/?q=khong-co");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Danh mục tạm thời chưa tải được.");
  await expect(alert.locator("code")).toHaveText("audit-support-20261103");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).copiedSupport = value;
        },
      },
    }),
  );
  await alert
    .getByRole("button", { name: "Sao chép mã yêu cầu", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => (window as any).copiedSupport)).toBe(
    "audit-support-20261103",
  );
  await expect(alert.getByRole("status")).toContainText("Đã sao chép");
  await page.screenshot({ path: info.outputPath("api-error.png") });
  state.recover();
  await alert.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".ui-empty")).toBeVisible();
  await page.screenshot({ path: info.outputPath("empty.png") });
});
test("initial catalog loading has a visible skeleton with reduced-motion support", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = await routes(page, { slow: true });
  await page.goto("/?q=ao");
  await expect(page.getByRole("status")).toContainText("Đang tải sản phẩm");
  await expect(page.locator(".ui-skeleton-picture")).toHaveCount(4);
  expect(
    await page
      .locator(".ui-skeleton-picture")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.screenshot({ path: info.outputPath("catalog-loading.png") });
  await state
    .pending()!
    .fulfill({ json: { items: [], total: 0, page: 1, size: 20 } });
  await expect(page.locator(".ui-skeleton-picture")).toHaveCount(0);
});
test("UNKNOWN payment is a warning and only offers read-only recovery", async ({
  page,
}, info) => {
  const state = await routes(page, { paymentUnknown: true });
  await login(page);
  await page.goto("/orders/" + id + "/pay");
  const warning = page.getByTestId("payment-unknown");
  await expect(warning).toHaveClass(/ui-alert-warning/);
  await expect(warning).toContainText("Đừng thanh toán lại");
  await expect(warning.locator("svg")).toBeVisible();
  await warning
    .getByRole("button", {
      name: "Kiểm tra",
      exact: true,
    })
    .click();
  await expect(warning).toBeVisible();
  expect(state.attempts()).toBe(0);
  await page.screenshot({ path: info.outputPath("payment-unknown.png") });
});
test("Owner portal links are grouped separately and the current brand tokens agree", async ({
  page,
}, info) => {
  await routes(page, { owner: true });
  await login(page);
  await page.goto("/");
  const nav = page.getByRole("navigation", {
    name: "Điều hướng chính",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "Quản lý Store", exact: true }),
  ).toHaveAttribute("href", "/seller");
  await expect(
    nav.getByRole("link", { name: "Store Portal", exact: true }),
  ).toHaveCount(0);
  expect(
    await nav
      .locator(".market-portal-links")
      .evaluate((el) => getComputedStyle(el).borderLeftStyle),
  ).toBe("solid");
  expect(
    await page
      .locator(".live-market")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--accent").trim(),
      ),
  ).toBe("#c64220");
  await page.screenshot({ path: info.outputPath("owner-header.png") });
});
