import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixtures = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const user = "c5000000-0000-4000-8000-000000000001",
  first = "c5000000-0000-4000-8000-000000000002",
  second = "c5000000-0000-4000-8000-000000000003";
async function setup(page: Page) {
  const sends: { id: string; content: string }[] = [];
  const sessions = [
    { id: first, created_at: "2026-11-02T12:30:00Z" },
    { id: second, created_at: "2026-11-01T09:20:00Z" },
  ];
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/v1", "");
    if (path === "/auth/login" || path === "/auth/refresh")
      return route.fulfill({
        json: {
          ...fixtures.login.response,
          context: {
            user_id: user,
            roles: ["CUSTOMER"],
            role_permissions: [],
            token_version: 0,
          },
        },
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (path === "/me/chat/sessions") {
      const id = url.searchParams.get("session_id");
      return route.fulfill({
        json: {
          items: id
            ? sessions
                .filter((s) => s.id === id)
                .map((s) => ({
                  ...s,
                  messages: {
                    items: [
                      {
                        id: s.id + "-u",
                        role: "USER",
                        content:
                          s.id === first
                            ? "Tìm quà sinh nhật cho bạn"
                            : "Chọn một chiếc áo cotton",
                      },
                      {
                        id: s.id + "-a",
                        role: "ASSISTANT",
                        content:
                          "Mình có thể giúp bạn tìm trong các sản phẩm hiện có.",
                      },
                    ],
                    page: 1,
                    size: 20,
                    total: 2,
                  },
                }))
            : sessions,
          page: 1,
          size: 20,
          total: id ? 1 : 2,
        },
      });
    }
    if (path.startsWith("/chat/sessions/") && req.method() === "POST") {
      sends.push({
        id: path.split("/")[3],
        content: req.postDataJSON().content,
      });
      return route.fulfill({
        json: {
          id: "answer",
          role: "ASSISTANT",
          content: "Đây là gợi ý theo nhu cầu bạn vừa chọn.",
          fallback: false,
          product_cards: [],
        },
      });
    }
    if (path === "/chat/sessions")
      return route.fulfill({
        status: 201,
        json: { id: "new-session", created_at: "2026-11-03T00:00:00Z" },
      });
    if (path === "/me/conversations")
      return route.fulfill({
        json: {
          items: [
            {
              id: first,
              store_id: user,
              store_name: "An Nhiên Studio",
              customer_name: "Khách demo",
              last_message: "Mẫu áo này có màu kem không?",
              updated_at: "2026-11-03T01:30:00Z",
            },
            {
              id: second,
              store_id: user,
              store_name: "Mây Xanh — Đồ dùng nhà cửa và góc làm việc",
              customer_name: "Khách demo",
              last_message: "Gian hàng đã nhận thông tin và sẽ hỗ trợ bạn.",
              updated_at: "2026-11-02T02:00:00Z",
            },
          ],
          page: 1,
          size: 20,
          total: 2,
        },
      });
    if (path.includes("/conversations/") && path.endsWith("/messages")) {
      const id = path.split("/")[3];
      return route.fulfill({
        json: {
          conversation_id: id,
          conversation: { id, store_name: "An Nhiên Studio" },
          items: [
            {
              id: "m2",
              sender_side: "STORE",
              content:
                "Chào bạn, mẫu áo có màu kem và xanh navy. Bạn đang tìm size nào?",
              created_at: "2026-11-03T01:35:00Z",
            },
            {
              id: "m1",
              sender_side: "CUSTOMER",
              content: "Mẫu áo này có màu kem không?",
              created_at: "2026-11-03T01:30:00Z",
            },
          ],
          page: 1,
          size: 20,
          total: 2,
        },
      });
    }
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
  await page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first()
    .click();
  return sends;
}
test.use({ viewport: { width: 1440, height: 900 } });

test("long AI history opens at the latest page and new answers stay visible after reading an older page", async ({
  page,
}) => {
  await setup(page);
  const dialog = page.getByRole("dialog");
  const messages = Array.from({ length: 44 }, (_, i) => ({
    id: "long-" + i,
    role: i % 2 ? "ASSISTANT" : "USER",
    content: i === 0 ? "Tìm áo làm quà" : "Tin trong phiên dài " + i,
  }));
  await page.route("**/api/v1/me/chat/sessions**", (route) => {
    const url = new URL(route.request().url()),
      id = url.searchParams.get("session_id");
    if (!id) return route.fallback();
    const p = Number(url.searchParams.get("message_page") || 1);
    return route.fulfill({
      json: {
        items: [
          {
            id,
            created_at: "2026-11-03T00:00:00Z",
            messages: {
              items: messages.slice((p - 1) * 20, p * 20),
              total: messages.length,
              page: p,
              size: 20,
            },
          },
        ],
        page: 1,
        size: 20,
        total: 1,
      },
    });
  });
  await page.route("**/api/v1/chat/sessions/*/messages", (route) => {
    const question = route.request().postDataJSON().content,
      answer = {
        id: "new-answer",
        role: "ASSISTANT",
        content: "Câu trả lời mới nhất của phiên dài.",
        fallback: false,
        product_cards: [],
      };
    messages.push(
      { id: "new-question", role: "USER", content: question },
      answer,
    );
    return route.fulfill({ json: answer });
  });
  await dialog
    .getByRole("region", { name: "Lịch sử chat" })
    .getByRole("button", { name: /#0002/ })
    .click();
  await expect(dialog.getByRole("log")).toContainText("Tin trong phiên dài 43");
  await expect(dialog.locator(".boot-pagination").last()).toContainText(
    "Trang 3",
  );
  await dialog
    .getByRole("button", { name: "Trang trước", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Trang trước", exact: true })
    .click();
  await expect(dialog.getByRole("log")).toContainText("Tìm áo làm quà");
  await dialog
    .getByRole("textbox", { name: "Câu hỏi", exact: true })
    .fill("Nhắc lại những lựa chọn cuối cùng");
  await dialog
    .getByRole("button", { name: "Gửi câu hỏi", exact: true })
    .click();
  await expect(dialog.getByRole("log")).toContainText("Câu trả lời mới nhất");
  await expect(dialog.locator(".boot-pagination").last()).toContainText(
    "Trang 3 · 46",
  );
  await expect(dialog.getByRole("log")).not.toContainText("Tìm áo làm quà");
});
test("AI history selection sends to the chosen session and a new session clears the selection", async ({
  page,
}, info) => {
  const sends = await setup(page),
    dialog = page.getByRole("dialog", { name: "Trung tâm chat" }),
    history = dialog.getByRole("region", { name: "Lịch sử chat" });
  await expect(
    history.getByRole("button", { name: /Tư vấn mua sắm/ }),
  ).toHaveCount(2);
  expect(
    await history.getByRole("button", { name: /#0003/ }).evaluate((el) => {
      const r = el.getBoundingClientRect(),
        parent = el.closest("section")!.getBoundingClientRect();
      return r.bottom <= parent.bottom;
    }),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("ai-welcome.png") });
  await history.getByRole("button", { name: /#0003/ }).click();
  await expect(dialog.getByRole("log")).toContainText(
    "Chọn một chiếc áo cotton",
  );
  await expect(
    history.getByRole("button", { name: /Chọn một chiếc áo cotton/ }),
  ).toHaveAttribute("aria-current", "true");
  await dialog
    .getByRole("textbox", { name: "Câu hỏi", exact: true })
    .fill("Tôi muốn màu xanh");
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("log")).toContainText("Đây là gợi ý");
  expect(sends).toEqual([{ id: second, content: "Tôi muốn màu xanh" }]);
  await page.screenshot({ path: info.outputPath("ai-conversation.png") });
  await history.getByRole("button", { name: "Phiên mới", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "Bạn đang tìm sản phẩm gì?" }),
  ).toBeVisible();
  await expect(history.locator("[aria-current=true]")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Tìm quà tặng", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Câu hỏi", exact: true }),
  ).toBeFocused();
  await dialog
    .getByRole("button", { name: "Mở rộng chat", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Câu hỏi", exact: true }),
  ).toHaveValue("Tôi muốn tìm quà tặng");
  await expect(dialog).toHaveClass(/chat-dialog-expanded/);
  await dialog
    .getByRole("button", { name: "Thu gọn chat", exact: true })
    .click();
});
test("Store chat keeps both panes visible and the composer reachable on desktop", async ({
  page,
}, info) => {
  await setup(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Gian hàng", exact: true }).click();
  await dialog.getByRole("link", { name: /An Nhiên Studio/ }).click();
  await expect(
    dialog.getByRole("complementary", { name: "Danh sách hội thoại" }),
  ).toBeVisible();
  await expect(dialog.getByRole("log")).toContainText("xanh navy");
  const composer = dialog.getByRole("textbox", {
    name: "Nội dung tin nhắn",
    exact: true,
  });
  await expect(composer).toBeVisible();
  expect(
    await composer.evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(64);
  await page.screenshot({ path: info.outputPath("store-conversation.png") });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(composer).toBeVisible();
  expect(
    await dialog
      .getByRole("button", { name: "Gửi tin nhắn", exact: true })
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom <= innerHeight && r.right <= innerWidth;
      }),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("store-conversation-1280.png"),
  });
  await dialog.getByRole("button", { name: "Đóng chat", exact: true }).click();
  await page.goto("/customer/messages/" + first);
  await expect(page.getByRole("main").getByRole("log")).toContainText(
    "xanh navy",
  );
  await page.screenshot({ path: info.outputPath("inbox-page.png") });
});
