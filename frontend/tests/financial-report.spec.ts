import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const id = (n: number) =>
  "7c000000-0000-4000-8000-" + String(n).padStart(12, "0");
async function model(
  page: Page,
  scope: "STORE" | "ADMIN" | "SELLER" = "STORE",
  { entriesFail = false, summaryMissing = false, noPermission = false } = {},
) {
  const reads: string[] = [],
    requests: any[] = [],
    store = id(1);
  const summary = {
    period_start: "2026-10-31T17:00:00Z",
    period_end: "2026-11-01T17:00:00Z",
    order_count: 0,
    order_value_vnd: 0,
    completed_goods_revenue_vnd: 0,
    shipping_fee_vnd: 0,
    collected_vnd: 120000,
    refunded_vnd: 120000,
    timezone: "Asia/Ho_Chi_Minh",
    unresolved_collected_vnd: 25000,
    unresolved_refunded_vnd: 0,
    cash_series: [
      {
        bucket_start: "2026-10-31T17:00:00Z",
        collected_vnd: 120000,
        refunded_vnd: 120000,
      },
    ],
  };
  const entries = Array.from({ length: 21 }, (_, n) => ({
    id: id(100 + n),
    order_id: id(200 + n),
    payment_id: id(300 + n),
    store_id: store,
    kind: n ? "COLLECTION" : "REFUND",
    amount_vnd: n ? 6000 : 120000,
    occurred_at: "2026-10-31T17:15:00Z",
    recorded_at: "2026-11-02T01:00:00Z",
    source_type: n ? "PAYMENT_CALLBACK" : "COD_REFUND_RECEIPT",
    source_id: "RECEIPT-" + n,
    time_source: n ? "SYSTEM_RECEIVED" : "OWNER_ATTESTED",
  }));
  const gaps = Array.from({ length: 25 }, (_, n) => ({
    order_id: id(400 + n),
    payment_id: id(500 + n),
    store_id: store,
    kind: "COLLECTION",
    amount_vnd: 1000,
    payment_method: "COD",
    reconciliation_reason: "MISSING_VERIFIED_EVENT_TIME",
  }));
  const context = {
    user_id: id(2),
    roles:
      scope === "ADMIN"
        ? ["ADMIN"]
        : scope === "SELLER"
          ? ["CUSTOMER", "SELLER"]
          : ["CUSTOMER", "STORE_OWNER"],
    role_permissions:
      scope === "ADMIN" && !noPermission ? ["platform.admin"] : [],
    token_version: 0,
    ...(scope !== "ADMIN"
      ? {
          store_membership: {
            store_id: store,
            role: scope === "SELLER" ? "SELLER" : "OWNER",
            status: "ACTIVE",
            permissions: ["order.store.read_status_cancel"],
          },
        }
      : {}),
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
    if (path === "/store/reports" || path === "/admin/reports") {
      reads.push(path + url.search);
      requests.push({ path, params: Object.fromEntries(url.searchParams) });
      const data = {
        ...summary,
        ...(path.startsWith("/store")
          ? {
              store_id: store,
              best_selling_product_ids: [],
              low_stock_variant_ids: [],
              revenue_series: [],
            }
          : url.searchParams.get("store_id")
            ? { store_id: url.searchParams.get("store_id") }
            : {}),
      };
      if (summaryMissing) {
        delete (data as any).unresolved_collected_vnd;
        delete (data as any).unresolved_refunded_vnd;
        delete (data as any).cash_series;
      }
      return route.fulfill({ json: data });
    }
    if (
      path.endsWith("/reports/money") ||
      path.endsWith("/reports/unresolved-money")
    ) {
      reads.push(path + url.search);
      requests.push({ path, params: Object.fromEntries(url.searchParams) });
      const unresolved = path.endsWith("/unresolved-money");
      if (entriesFail && !unresolved)
        return route.fulfill({
          status: 503,
          json: { code: "MONEY_READ_FAILED", message: "Chưa đọc được sổ tiền" },
        });
      const p = Number(url.searchParams.get("page") ?? 1),
        size = Number(url.searchParams.get("size") ?? 20),
        all = unresolved ? gaps : entries;
      return route.fulfill({
        json: {
          items: all.slice((p - 1) * size, p * size),
          page: p,
          size,
          total: all.length,
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { code: "NOT_FOUND", message: "Fixture chưa cấu hình" },
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
  return { reads, requests, entries, gaps, store, summary };
}
test("Owner sees event cash separately from zero orders created in period and can inspect source and both timestamps", async ({
  page,
}, info) => {
  const m = await model(page);
  await page.goto("/seller/reports?from=2026-11-01&to=2026-11-02");
  await expect(page.locator(".financial-summary-table")).toContainText(
    "Tiền xác nhận thu trong kỳ",
  );
  await expect(page.locator(".financial-summary-table")).toContainText("120.000 ₫");
  await expect(
    page
      .locator('.financial-summary-table th[scope="row"]')
      .filter({ hasText: "Số đơn tạo trong kỳ" })
      .locator(".."),
  ).toContainText("0");
  await page.getByRole("navigation", {name:"Nội dung báo cáo"}).getByRole("button", {name:"Giao dịch",exact:true}).click();
  const events = page.getByRole("region", {
    name: "Sự kiện tiền đã xác nhận",
    exact: true,
  });
  await expect(events).toContainText("00:15:00 1/11/2026");
  await expect(events).toContainText("không phải ngân hàng kiểm chứng");
  await events.locator("details").first().locator("summary").click();
  await expect(events).toContainText("RECEIPT-0");
  await expect(events).toContainText("Hệ thống ghi nhận lúc");
  await expect(
    events.getByRole("link", {
      name: "Đối chiếu đơn #" + m.entries[0].order_id.slice(-8).toUpperCase(),
      exact: true,
    }),
  ).toHaveAttribute("href", "/seller/orders?q=" + m.entries[0].order_id);
  for (const width of process.env.CORE_FIX_DESKTOP_ONLY === "1"
    ? [1440]
    : [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath("financial-report-" + width + ".png"),
      fullPage: true,
    });
  }
});

test("cash chart and CSV use the selected event period rather than order creation or wallet income", async ({
  page,
}) => {
  const m = await model(page);
  await page.goto("/seller/reports?from=2026-11-01&to=2026-11-02");
  await page.getByRole("button", {name:"Thu / hoàn theo kỳ",exact:true}).click();
  await page.locator(".report-chart-disclosure summary").click();
  await expect(
    page.getByRole("img", {
      name: "Biểu đồ cột tiền đã thu và hoàn theo kỳ. Số tiền chính xác nằm trong bảng bên dưới.",
    }),
  ).toBeVisible();
  await expect(page.locator(".cash-chart title")).toContainText(
    "đã thu 120.000 ₫, đã hoàn 120.000 ₫",
  );
  await page.getByRole("button", {name:"Tổng hợp",exact:true}).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Xuất tổng hợp CSV", exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("bao-cao-2026-11-01-2026-11-02.csv");
  const content = readFileSync((await file.path())!, "utf8");
  expect(content).toContain("Asia/Ho_Chi_Minh");
  expect(content).toContain(m.store);
  expect(content).toContain('"Tiền xác nhận thu trong kỳ","120000"');
  expect(content).toContain('"Số đơn tạo trong kỳ","0"');
  expect(content).toContain('"1/11/2026","120000","120000"');
  expect(content).not.toContain("ví");
});
test("historical unknown dates are lazy, outside selected period and independently paginated beyond20", async ({
  page,
}) => {
  const m = await model(page);
  await page.goto("/seller/reports?from=2026-11-01&to=2026-11-02");
  await page.getByRole("button", {name:"Khoản chưa rõ ngày",exact:true}).click();
  await expect(
    page.getByText("Đã thu chưa rõ ngày: 25.000 ₫", { exact: false }),
  ).toBeVisible();
  expect(m.reads.some((path) => path.includes("unresolved-money"))).toBe(false);
  await page.getByRole("button", {name:"Khoản chưa rõ ngày",exact:true}).click();
  await page
    .getByRole("button", { name: "Xem khoản chưa rõ ngày", exact: true })
    .click();
  const gaps = page.getByRole("region", {
    name: "Khoản lịch sử chưa rõ ngày",
    exact: true,
  });
  await expect(gaps.getByRole("link")).toHaveCount(20);
  await gaps.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(gaps.getByRole("link")).toHaveCount(5);
  const request = m.requests
    .filter((row) => row.path.endsWith("unresolved-money"))
    .at(-1);
  expect(request.params.page).toBe("2");
  expect(request.params).not.toHaveProperty("from");
  expect(request.params).not.toHaveProperty("to");
  await expect(gaps).not.toContainText("2026-11-01");
});
test("Admin scope and Vietnam half-open range are sent consistently to summary and journal and survive reload", async ({
  page,
}) => {
  const m = await model(page, "ADMIN");
  await page.goto("/admin?tab=reports&from=2026-11-01&to=2026-11-02");
  await page
    .getByRole("textbox", {
      name: "Mã Store (để trống xem toàn sàn)",
      exact: true,
    })
    .fill(m.store);
  await page
    .getByRole("combobox", { name: "Nhóm theo", exact: true })
    .selectOption("MONTH");
  await page.getByRole("button", { name: "Xem báo cáo", exact: true }).click();
  await expect
    .poll(() =>
      m.requests.some(
        (row) =>
          row.path === "/admin/reports" &&
          row.params.store_id === m.store &&
          row.params.granularity === "MONTH",
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      m.requests.some(
        (row) =>
          row.path === "/admin/reports/money" &&
          row.params.store_id === m.store &&
          row.params.from === "2026-11-01T00:00:00+07:00" &&
          row.params.to === "2026-11-02T00:00:00+07:00",
      ),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("textbox", {
      name: "Mã Store (để trống xem toàn sàn)",
      exact: true,
    }),
  ).toHaveValue(m.store);
  await expect(
    page.getByRole("combobox", { name: "Nhóm theo", exact: true }),
  ).toHaveValue("MONTH");
  await page.getByRole("button", {name:"Khoản chưa rõ ngày",exact:true}).click();
  await page
    .getByRole("button", { name: "Xem khoản chưa rõ ngày", exact: true })
    .click();
  await expect
    .poll(() =>
      m.requests.some(
        (row) =>
          row.path === "/admin/reports/unresolved-money" &&
          row.params.store_id === m.store &&
          !row.params.from,
      ),
    )
    .toBe(true);
});
test("GET journal failure remains an error while the actual summary stays available", async ({
  page,
}) => {
  await model(page, "STORE", { entriesFail: true });
  await page.goto("/seller/reports?from=2026-11-01&to=2026-11-02");
  await expect(page.locator(".financial-summary-table")).toContainText("120.000 ₫");
  await page.getByRole("button", {name:"Giao dịch",exact:true}).click();
  await expect(
    page
      .getByRole("region", { name: "Sự kiện tiền đã xác nhận", exact: true })
      .getByRole("alert"),
  ).toContainText("Chưa đọc được sổ tiền");
  await expect(
    page.getByText("Không có sự kiện tiền đã xác nhận trong khoảng này.", {
      exact: true,
    }),
  ).toHaveCount(0);
});
test("missing legacy gap or series fields are not silently reported as zero or empty confirmed activity", async ({
  page,
}) => {
  await model(page, "STORE", { summaryMissing: true });
  await page.goto("/seller/reports?from=2026-11-01&to=2026-11-02");
  await page.getByRole('button',{name:'Khoản chưa rõ ngày',exact:true}).click();
  await expect(
    page.getByText("Đã thu chưa rõ ngày: Chưa có dữ liệu", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", {name:"Thu / hoàn theo kỳ",exact:true}).click();
  await expect(
    page.getByText("Bản đọc chưa cung cấp chuỗi sự kiện tiền.", {
      exact: true,
    }),
  ).toBeVisible();
});
test("invalid deep-linked dates cannot issue a report query or show stale financial totals", async ({
  page,
}) => {
  const m = await model(page);
  await page.goto("/seller/reports?from=invalid&to=2026-11-01");
  await expect(page.getByRole("alert")).toContainText("Cần khoảng ngày hợp lệ");
  expect(m.requests).toEqual([]);
  await expect(page.locator(".financial-summary-table")).toHaveCount(0);
});
test("Seller and Admin without platform permission cannot read financial reports", async ({
  page,
  browser,
}) => {
  const m = await model(page, "SELLER");
  await page.goto("/seller/reports");
  await expect(page.locator(".financial-summary-table")).toHaveCount(0);
  expect(m.requests).toEqual([]);
  const context = await browser.newContext();
  try {
    const admin = await context.newPage(),
      a = await model(admin, "ADMIN", { noPermission: true });
    await admin.goto("/admin?tab=reports");
    await expect(admin.getByRole("alert")).toContainText(
      "Cần quyền quản trị báo cáo",
    );
    expect(a.requests).toEqual([]);
  } finally {
    await context.close();
  }
});

test("submitting unchanged report filters reloads the summary and source pages after new money arrives", async ({
  page,
}) => {
  const m = await model(page);
  await page.goto("/seller/reports?from=2026-11-01&to=2026-11-02");
  await expect(page.locator(".financial-summary-table")).toContainText("120.000 ₫");
  const previous = m.requests.filter((r) => r.path === "/store/reports").length;
  m.summary.collected_vnd = 240000;
  m.summary.cash_series[0].collected_vnd = 240000;
  m.entries.push({ ...m.entries[1], id: id(999), amount_vnd: 120000 });
  await page.getByRole("button", { name: "Xem báo cáo", exact: true }).click();
  await expect
    .poll(() => m.requests.filter((r) => r.path === "/store/reports").length)
    .toBeGreaterThan(previous);
  await expect(
    page
      .locator('.financial-summary-table th[scope="row"]')
      .filter({ hasText: "Tiền xác nhận thu trong kỳ" })
      .locator(".."),
  ).toContainText("240.000 ₫");
  await page.getByRole("button", {name:"Giao dịch",exact:true}).click();
  await expect(
    page.getByRole("region", { name: "Sự kiện tiền đã xác nhận", exact: true }),
  ).toContainText("22 kết quả");
});

test("CR014 default month/day uses Vietnam dates at month and year boundaries regardless of browser timezone", async ({
  browser,
}) => {
  for (const [zone, instant, from, to] of [
    ["America/Los_Angeles", "2026-10-31T17:01:00Z", "2026-11-01", "2026-11-02"],
    ["UTC", "2026-10-31T23:59:00Z", "2026-11-01", "2026-11-02"],
    ["Asia/Ho_Chi_Minh", "2026-12-31T17:01:00Z", "2027-01-01", "2027-01-02"],
  ]) {
    const context = await browser.newContext({
      baseURL: process.env.WEB_TEST_URL ?? "http://127.0.0.1:3109",
      timezoneId: zone,
    });
    try {
      const p = await context.newPage();
      await p.clock.setFixedTime(new Date(instant));
      const m = await model(p);
      m.summary.period_start = new Date(from + "T00:00:00+07:00").toISOString();
      m.summary.period_end = new Date(to + "T00:00:00+07:00").toISOString();
      m.summary.collected_vnd =
        m.summary.refunded_vnd =
        m.summary.unresolved_collected_vnd =
          0;
      m.summary.cash_series.length = 0;
      m.entries.length = 0;
      m.gaps.length = 0;
      await p.goto("/seller/reports");
      await expect(
        p.getByLabel("Từ ngày (bao gồm)", { exact: true }),
      ).toHaveValue(from);
      await expect(
        p.getByLabel("Đến trước ngày (không bao gồm)", { exact: true }),
      ).toHaveValue(to);
      await expect
        .poll(() =>
          m.requests.some(
            (r) =>
              r.path === "/store/reports" &&
              r.params.from === from + "T00:00:00+07:00" &&
              r.params.to === to + "T00:00:00+07:00",
          ),
        )
        .toBe(true);
    } finally {
      await context.close();
    }
  }
});
