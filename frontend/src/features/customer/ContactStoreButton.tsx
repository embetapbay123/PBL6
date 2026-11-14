import { Button as UiButton } from "../../components/ui/Button";
import { ApiError } from "../../api/client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../api/auth-context";
import { callOperation } from "../../api/operations";
import { ErrorView } from "../../bootstrap/components";
import { MessageCircle } from "lucide-react";
import { useChat } from "../../chat/ChatProvider";

export function ContactStoreButton({
  storeId,
  orderId,
  product,
  compact = false,
  className,
}: {
  storeId: string;
  orderId?: string;
  product?: { id: string; title: string };
  compact?: boolean;
  className?: string;
}) {
  const { session } = useAuth(),
    chat = useChat();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  if (!session)
    return (
      <Link
        className={compact ? "order-header-chat-btn" : "ui-button ui-button-secondary"}
        to="/login"
      >
        Đăng nhập
      </Link>
    );
  if (!session.context?.roles.includes("CUSTOMER")) return null;

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await callOperation("startStoreConversation", {
        body: { store_id: storeId, ...(orderId ? { order_id: orderId } : {}) },
      });
      if (
        orderId &&
        (!result.order_context ||
          result.order_context.order_id !== orderId ||
          result.order_context.store_id !== storeId)
      )
        throw new ApiError(
          503,
          "ORDER_CONTEXT_UNAVAILABLE",
          "Chưa đọc được ngữ cảnh đúng đơn hàng. Không gửi tin nhắn; vui lòng thử lại.",
        );
      if (orderId && result.order_context) {
        chat.chooseOrder("CUSTOMER", result.id, {
          order_id: result.order_context.order_id,
          title:
            result.order_context.items
              .slice(0, 3)
              .map((item) => (item.title ?? "Món đơn cũ") + " × " + item.quantity)
              .join(" · ") +
            (result.order_context.items.length > 3
              ? " · Còn " + (result.order_context.items.length - 3) + " dòng khác"
              : ""),
        });
      }
      if (product) {
        const key = "CUSTOMER:" + result.id,
          entry = chat.entries[key];
        if (!entry?.draft.trim() && !entry?.busy && !entry?.pending && !entry?.order)
          chat.patch(key, {
            draft: `Sản phẩm: ${product.title}\n${window.location.origin}/products/${encodeURIComponent(product.id)}\n\n`,
            notice:
              "Đã thêm thông tin sản phẩm vào bản nháp. Bạn có thể sửa trước khi gửi.",
          });
        else
          chat.patch(key, {
            notice:
              "Bản nháp trước được giữ nguyên. Hãy gửi hoặc xóa bản nháp trước khi hỏi về sản phẩm khác.",
          });
      }
      chat.openChat({
        tab: "store",
        conversationId: result.id,
        conversationName: result.store_name,
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <div className="order-chat-contact">
      <button
        type="button"
        className={className || "order-header-chat-btn"}
        disabled={busy}
        onClick={() => void start()}
        title="Chat với gian hàng"
        aria-label={busy ? 'Đang mở tin nhắn' : 'Nhắn tin'}
      >
        <MessageCircle size={13} className="text-[#ee4d2d]" />
        <span>{busy ? "..." : "Chat"}</span>
      </button>
      {error !== undefined && <ErrorView error={error} />}
      </div>
    );
  }

  return (
    <div>
      <UiButton
        variant="secondary"
        type="button"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? "Đang mở…" : "Nhắn tin"}
      </UiButton>
      {error !== undefined && <ErrorView error={error} />}
    </div>
  );
}
