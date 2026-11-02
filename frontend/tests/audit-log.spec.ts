import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixtures = JSON.parse(
    readFileSync(
      new URL("../src/api/fixtures.generated.json", import.meta.url),
      "utf8",
    ),
  ),
  id = "66000000-0000-4000-8000-000000000001";
async function setup(page: Page, allowed = true) {
  const reads: string[] = [];
  await page.route("**/api/v1/**", (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/v1", "");
    if (path === "/auth/login" || path === "/auth/refresh")
      return route.fulfill({
        json: {
          ...fixtures.login.response,
          context: {
            user_id: id,
            roles: ["ADMIN"],
            role_permissions: allowed ? ["platform.admin"] : [],
            token_version: 0,
          },
        },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (path.startsWith("/admin/audit/")) {
      reads.push(url.pathname + url.search);
      return route.fulfill({
        json: {
          items: [
            {
              id,
              service: path.endsWith("catalog")
                ? "M1"
                : path.endsWith("commerce")
                  ? "M2"
                  : "M3",
              action: url.searchParams.get("action") ?? "CREATE",
              target_type: "Product",
              target_id: id,
              request_id: "audit-trace-fixture",
              created_at: "2026-10-28T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          size: 20,
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: {
        code: "NOT_FOUND",
        message: "Fixture chưa cấu hình",
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
  await page.goto("/admin?tab=audit");
  return reads;
}
test("Admin filters and switches audit sources within a contained table", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({
    width: process.env.CORE_FIX_DESKTOP_ONLY === "1" ? 1440 : 390,
    height: 844,
  });
  const reads = await setup(page);
  await expect(page.getByRole("table")).toContainText("audit-trace-fixture");
  await page.getByLabel("Hành động", { exact: true }).fill("UPDATE");
  await page.getByRole("button", { name: "Áp dụng bộ lọc nhật ký" }).click();
  await expect(page.getByRole("table")).toContainText("UPDATE");
  expect(reads.some((url) => url.includes("action=UPDATE"))).toBe(true);
  for (const [source, label] of [
    ["commerce", "Đơn hàng và thanh toán"],
    ["identity", "Tài khoản và gian hàng"],
  ]) {
    await page
      .getByRole("navigation", { name: "Nguồn nhật ký" })
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect
      .poll(() => reads.some((url) => url.includes("/audit/" + source)))
      .toBe(true);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("audit-desktop.png"),
    fullPage: true,
  });
});
test("an Admin without platform permission cannot issue audit requests", async ({
  page,
}) => {
  const reads = await setup(page, false);
  await expect(page.getByRole("alert")).toContainText(
    "Bạn chưa có quyền đọc nhật ký quản trị.",
  );
  expect(reads).toEqual([]);
});
