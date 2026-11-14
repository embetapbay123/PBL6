import { test, expect, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
const f = JSON.parse(
  readFileSync(
    new URL("../src/api/fixtures.generated.json", import.meta.url),
    "utf8",
  ),
);
const user = "c4000000-0000-4000-8000-000000000001",
  thread = "c4000000-0000-4000-8000-000000000002";
const auth = {
  ...f.login.response,
  context: {
    user_id: user,
    roles: ["CUSTOMER"],
    role_permissions: [],
    token_version: 0,
  },
};
async function routes(
  page: Page,
  { delayRestore = false, restoreFails = false, fallback = false } = {},
) {
  let restore: Route | undefined;
  const messages: any[] = [],
    sends: any[] = [];
  let attempts = 0;
  await page.route("**/api/v1/**", async (r) => {
    const req = r.request(),
      p = new URL(req.url()).pathname.replace("/api/v1", "");
    if (p === "/auth/refresh") {
      if (delayRestore) {
        restore = r;
        return;
      }
      return r.fulfill(
        restoreFails
          ? {
              status: 401,
              json: { code: "UNAUTHENTICATED", message: "Expired" },
            }
          : { json: auth },
      );
    }
    if (p === "/auth/login")
      return r.fulfill({
        json: auth,
        headers: { "set-cookie": "pbl6_csrf=fixture; Path=/; SameSite=Strict" },
      });
    if (p === "/me/chat/sessions")
      return r.fulfill({ json: { items: [], page: 1, size: 20, total: 0 } });
    if (p === "/chat/sessions")
      return r.fulfill({
        status: 201,
        json: {
          id: thread,
          created_at: "2026-11-03T00:00:00Z",
          anonymous_key: "fixture-key",
        },
      });
    if (p === "/chat/sessions/" + thread + "/messages")
      return r.fulfill({
        json: {
          id: thread,
          role: "ASSISTANT",
          content: fallback
            ? "Gợi ý từ catalog"
            : "Áo cotton phù hợp với nhu cầu của bạn.",
          fallback,
          fallback_reason: fallback
            ? "PROVIDER_INVALID_RESPONSE"
            : "MODEL_GENERATED",
          product_cards: [],
        },
      });
    if (p === "/me/conversations")
      return r.fulfill({
        json: {
          items: [
            {
              id: thread,
              store_name: "Gian hàng thử nghiệm",
              store_id: user,
              last_message: "Chào bạn",
            },
          ],
          page: 1,
          size: 20,
          total: 1,
        },
      });
    if (
      p === "/me/conversations/" + thread + "/messages" &&
      req.method() === "POST"
    ) {
      attempts++;
      sends.push(req.postDataJSON());
      if (attempts === 1)
        return r.fulfill({
          status: 503,
          json: { code: "LOST_ACK", message: "Chưa rõ kết quả gửi" },
        });
      messages.push({
        id: thread,
        sender_side: "CUSTOMER",
        content: sends[0].content,
        created_at: "2026-11-03T00:00:00Z",
      });
      return r.fulfill({ json: messages[0] });
    }
    if (p === "/me/conversations/" + thread + "/messages")
      return r.fulfill({
        json: {
          items: messages,
          page: 1,
          size: 20,
          total: messages.length,
          conversation_id: thread,
          conversation: { id: thread, store_name: "Gian hàng thử nghiệm" },
        },
      });
    return r.fulfill({
      json: { items: [], page: 1, size: 20, total: 0, unread: 0 },
    });
  });
  return { sends, restore: () => restore };
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

test("AI waits beyond the ordinary API timeout for a valid model response", async ({
  page,
}) => {
  await page.clock.install();
  await routes(page);
  await login(page);
  let waiting: Route | undefined;
  await page.route("**/api/v1/chat/sessions/*/messages", (route) => {
    waiting = route;
  });
  await page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Câu hỏi", exact: true })
    .fill("Tìm áo cotton");
  await dialog
    .getByRole("button", { name: "Gửi câu hỏi", exact: true })
    .click();
  await expect.poll(() => !!waiting).toBe(true);
  await page.clock.fastForward(8000);
  await expect(
    dialog.getByRole("button", { name: "Đang trả lời…", exact: true }),
  ).toBeVisible();
  await waiting!.fulfill({
    json: {
      id: thread,
      role: "ASSISTANT",
      content: "Áo cotton phù hợp với nhu cầu của bạn.",
      fallback: false,
      fallback_reason: "MODEL_GENERATED",
      product_cards: [],
    },
  });
  await expect(dialog.getByRole("log")).toContainText("Áo cotton phù hợp");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});

test("an unresponsive AI turn remains bounded and keeps the question without automatic resend", async ({
  page,
}) => {
  await page.clock.install();
  await routes(page);
  await login(page);
  let sends = 0;
  await page.route("**/api/v1/chat/sessions/*/messages", () => {
    sends++;
  });
  await page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Câu hỏi", exact: true })
    .fill("Tìm áo cotton");
  await dialog
    .getByRole("button", { name: "Gửi câu hỏi", exact: true })
    .click();
  await expect.poll(() => sends).toBe(1);
  await page.clock.fastForward(36000);
  await expect(dialog.getByRole("alert")).toContainText(
    "Không kết nối được API",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Câu hỏi", exact: true }),
  ).toHaveValue("Tìm áo cotton");
  expect(sends).toBe(1);
});
test("chat launcher waits for restore then opens a stable authenticated dialog", async ({
  page,
  context,
}) => {
  const s = await routes(page, { delayRestore: true });
  await context.addCookies([
    {
      name: "pbl6_csrf",
      value: "fixture",
      url:
        (test.info().project.use.baseURL as string) || "http://127.0.0.1:3112",
    },
  ]);
  await page.goto("/");
  await expect.poll(() => !!s.restore()).toBe(true);
  const opener = page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first();
  await expect(opener).toBeDisabled();
  await expect(opener).toHaveAttribute(
    "title",
    "Đang khôi phục phiên đăng nhập…",
  );
  await s.restore()!.fulfill({ json: auth });
  await expect(opener).toBeEnabled();
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Trung tâm chat",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("region", { name: "Lịch sử chat" }),
  ).toContainText("Chưa có phiên chat");
  await page.getByRole("tab", { name: "Gian hàng", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Gian hàng thử nghiệm");
});
test("failed restore enables Guest chat and shows the signed-out Store channel", async ({
  page,
  context,
}) => {
  const s = await routes(page, { delayRestore: true });
  await context.addCookies([
    { name: "pbl6_csrf", value: "fixture", url: process.env.WEB_TEST_URL ?? 'http://localhost:8080' },
  ]);
  await page.goto("/");
  await expect.poll(() => !!s.restore()).toBe(true);
  await s.restore()!.fulfill({
    status: 401,
    json: { code: "UNAUTHENTICATED", message: "Expired" },
  });
  const opener = page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first();
  await expect(opener).toBeEnabled();
  await opener.click();
  await page.getByRole("tab", { name: "Gian hàng", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Đăng nhập để hỏi về sản phẩm",
  );
});
for (const fallback of [false, true])
  test(`AI returns ${fallback ? "an explicit validated fallback" : "a generated response"} and keeps the send result visible`, async ({
    page,
  }) => {
    await routes(page, { fallback });
    await login(page);
    await page
      .getByRole("button", { name: "Mở chat", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Câu hỏi", { exact: true }).fill("Tìm áo cotton");
    await dialog
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await expect(dialog.getByRole("log")).toContainText(
      fallback ? "Gợi ý từ catalog" : "Áo cotton phù hợp",
    );
    if (fallback)
      await expect(dialog).toContainText(
        "Phản hồi của model chưa đạt yêu cầu kiểm chứng",
      );
    await dialog
      .getByRole("button", { name: "Thu nhỏ chat", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole("button", { name: "Khôi phục chat", exact: true })
      .first()
      .click();
    await expect(dialog.getByRole("log")).toContainText(
      fallback ? "Gợi ý từ catalog" : "Áo cotton phù hợp",
    );
  });
test("Store chat keeps drafts through close and retries the same client message ID", async ({
  page,
}) => {
  const s = await routes(page);
  await login(page);
  await page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first()
    .click();
  await page.getByRole("tab", { name: "Gian hàng", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("link", { name: "Gian hàng thử nghiệm", exact: false })
    .click();
  await dialog
    .getByRole("textbox", { name: "Nội dung tin nhắn", exact: true })
    .fill("Tin nhắn kiểm thử");
  await dialog.getByRole("button", { name: "Đóng chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Mở chat", exact: true })
    .first()
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Nội dung tin nhắn", exact: true }),
  ).toHaveValue("Tin nhắn kiểm thử");
  await dialog
    .getByRole("button", { name: "Gửi", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Chưa rõ kết quả gửi");
  await dialog
    .getByRole("button", { name: "Thử gửi", exact: true })
    .click();
  await expect(dialog.getByRole("log")).toContainText("Tin nhắn kiểm thử");
  expect(s.sends).toHaveLength(2);
  expect(s.sends[1]).toEqual(s.sends[0]);
});
