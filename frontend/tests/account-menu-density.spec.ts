import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = "a2000000-0000-4000-8000-000000000001";
async function model(page: Page, { failLogout = false } = {}) {
  let signed = true,
    posts = 0;
  await page.route("**/api/v1/**", (r) => {
    const p = new URL(r.request().url()).pathname.replace("/api/v1", "");
    if (p === "/auth/login" || p === "/auth/refresh")
      return signed
        ? r.fulfill({
            json: {
              ...f.login.response,
              context: { user_id: id, roles: ["CUSTOMER"], token_version: 0 },
            },
            headers: {
              "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict",
            },
          })
        : r.fulfill({
            status: 401,
            json: { code: "UNAUTHENTICATED", message: "Signed out" },
          });
    if (p === "/auth/logout") {
      posts++;
      signed = false;
      return failLogout
        ? r.abort("failed")
        : r.fulfill({
            json: { cookie_session_changed: false },
            headers: { "set-cookie": "pbl6_csrf=; Max-Age=0; Path=/" },
          });
    }
    if (p === "/me")
      return r.fulfill({
        json: {
          id,
          email: "demo@example.test",
          display_name: "Người dùng demo",
          phone: "0901234567",
        },
      });
    return r.fulfill({ json: { items: [], page: 1, size: 20, total: 0 } });
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
  return { posts: () => posts };
}
async function menu(page: Page) {
  await page
    .getByRole("button", { name: "Menu tài khoản", exact: true })
    .click();
  return page.getByRole("navigation", { name: "Menu tài khoản", exact: true });
}
test("account menu logs out directly once and exposes Guest links afterwards", async ({
  page,
}) => {
  const s = await model(page);
  const nav = await menu(page);
  await expect(
    nav.getByRole("link", { name: "Quản lý đăng nhập", exact: true }),
  ).toHaveCount(0);
  await nav.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect.poll(() => s.posts()).toBe(1);
  await expect(page).toHaveURL("/");
  const guest = await menu(page);
  await expect(
    guest.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(
    guest.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toHaveCount(0);
});
test("dirty profile can cancel logout without losing edits or contacting the server", async ({
  page,
}) => {
  const s = await model(page);
  await page.goto("/customer/profile");
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Đang nhập dở");
  page.once("dialog", (d) => d.dismiss());
  await (await menu(page))
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .click();
  expect(s.posts()).toBe(0);
  await expect(page.getByLabel("Tên hiển thị", { exact: true })).toHaveValue(
    "Đang nhập dở",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("navigation", { name: "Menu tài khoản", exact: true })
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .click();
  await expect.poll(() => s.posts()).toBe(1);
});
test("network failure keeps local logout and explains unconfirmed server revocation", async ({
  page,
}) => {
  const s = await model(page, { failLogout: true });
  await (await menu(page))
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Menu tài khoản", exact: true })
      .getByRole("alert"),
  ).toContainText("Chưa xác nhận");
  await expect(
    page
      .getByRole("navigation", { name: "Menu tài khoản", exact: true })
      .getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  expect(s.posts()).toBe(1);
});
for (const width of [1440, 390])
  test(`profile and account menu have compact usable controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await model(page);
    await page.goto("/customer/profile");
    const input = page.locator("#profile-email");
    await expect(input).toBeVisible();
    const size = await input.boundingBox();
    expect(size!.width).toBeLessThanOrEqual(625);
    expect(size!.height).toBeLessThanOrEqual(width === 390 ? 45 : 41);
    expect(size!.height).toBeGreaterThanOrEqual(width === 390 ? 44 : 40);
    const nav = await menu(page);
    await expect(
      nav.getByRole("button", { name: "Đăng xuất", exact: true }),
    ).toBeVisible();
    expect((await nav.boundingBox())!.width).toBeLessThanOrEqual(242);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `C:/PBL6/artifacts/account-density/profile-menu-${width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Menu tài khoản", exact: true }),
    ).toBeFocused();
  });
