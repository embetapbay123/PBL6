import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Minus,
  X,
  Bot,
  Store,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useChat } from "./ChatProvider";
import { useAuth } from "../api/auth-context";
import { callOperation } from "../api/operations";
import { AiChatPanel } from "../features/customer/CustomerChatWidget";
import { MessagesWorkspace } from "./ConversationWorkspace";

function ShopeeChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shopee-chat-svg"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M8.5 12a3.5 3.5 0 0 0 7 0" />
    </svg>
  );
}

export function ChatCenter() {
  const chat = useChat(),
    { ui } = chat,
    { session } = useAuth(),
    location = useLocation(),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:767px)").matches,
  );
  const [expanded, setExpanded] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [visible, setVisible] = useState(
    () => document.visibilityState === "visible",
  );
  const customer = !!session?.context?.roles.includes("CUSTOMER"),
    excluded =
      /^\/(seller|admin|customer\/messages)(\/|$)/.test(location.pathname) ||
      (!!session && !customer);
  const open = ui.status === "open" && !excluded;

  const conversationsQuery = useQuery({
    queryKey: ["conversations", "CUSTOMER", 1, "", false],
    enabled: customer && !excluded,
    refetchInterval: open ? 10000 : 30000,
    queryFn: () => callOperation("listOwnConversations", { query: { page: 1, size: 20 } }),
  });
  const unreadTotal = conversationsQuery.data?.unread_total ?? 0;

  useEffect(() => {
    const media = matchMedia("(max-width:767px)"),
      change = () => setMobile(media.matches),
      visibility = () => setVisible(document.visibilityState === "visible");
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (element.open) element.close();
    if (open) {
      if (!opener.current)
        opener.current =
          document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body
            ? document.activeElement
            : (Array.from(
                document.querySelectorAll<HTMLElement>("[data-chat-opener]"),
              ).find((element) => element.getClientRects().length > 0) ?? null);
      if (mobile) element.showModal();
      else element.show();
    } else if (opener.current) {
      const target =
        opener.current.isConnected && opener.current.getClientRects().length > 0
          ? opener.current
          : Array.from(
              document.querySelectorAll<HTMLElement>("[data-chat-opener]"),
            ).find((element) => element.getClientRects().length > 0);
      target?.focus();
      opener.current = null;
    }
  }, [open, mobile]);
  useEffect(() => {
    if (!mobile || !window.visualViewport) return;
    const viewport = window.visualViewport,
      update = () => {
        dialog.current?.style.setProperty(
          "--chat-viewport-height",
          viewport.height + "px",
        );
        dialog.current?.style.setProperty(
          "--chat-viewport-top",
          viewport.offsetTop + "px",
        );
      };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      dialog.current?.style.removeProperty("--chat-viewport-height");
      dialog.current?.style.removeProperty("--chat-viewport-top");
    };
  }, [mobile]);
  const close = () => chat.closeChat();
  return (
    <div
      className={
        "chat-center" +
        (/^\/(cart|checkout|products)(\/|$)/.test(location.pathname)
          ? " chat-center-purchase"
          : "")
      }
      hidden={excluded}
    >
      {/* Shopee-style Bottom Right Docked Chat Tab */}
      {!open && (
        <div className={`shopee-chat-dock ${dockCollapsed ? "is-collapsed" : ""}`}>
          <button
            type="button"
            className="shopee-chat-tab-btn"
            onClick={() => chat.openChat()}
            aria-label="Mở cửa sổ Chat"
            title="Chat với Shop và Trợ lý AI"
            data-chat-opener
          >
            <div className="shopee-chat-icon-box">
              <ShopeeChatIcon size={20} />
              {unreadTotal > 0 && (
                <span className="shopee-chat-badge">
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </span>
              )}
            </div>
            {!dockCollapsed && <span className="shopee-chat-tab-text">Chat</span>}
          </button>
          <button
            type="button"
            className="shopee-chat-collapse-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setDockCollapsed((v) => !v);
            }}
            title={dockCollapsed ? "Mở rộng thanh Chat" : "Thu gọn thanh Chat"}
            aria-label={dockCollapsed ? "Mở rộng thanh Chat" : "Thu gọn thanh Chat"}
          >
            {dockCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      <dialog
        id="chat-center-dialog"
        ref={dialog}
        className={"chat-dialog" + (expanded ? " chat-dialog-expanded" : "")}
        aria-label="Trung tâm chat"
        aria-modal={open && mobile ? true : undefined}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        <header className="chat-header">
          <div className="flex items-center gap-2">
            <ShopeeChatIcon size={19} />
            <strong>Chat</strong>
            {unreadTotal > 0 && (
              <span className="shopee-chat-header-badge">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </div>
          <div className="chat-header-actions">
            {customer && (
              <Link
                to="/customer/messages"
                onClick={close}
                className="chat-header-btn"
                title="Mở toàn màn hình"
                aria-label="Mở toàn màn hình"
              >
                <ExternalLink size={15} />
              </Link>
            )}
            <button
              type="button"
              className="chat-header-btn"
              aria-label={expanded ? "Thu gọn kích thước" : "Mở rộng kích thước"}
              title={expanded ? "Thu gọn kích thước" : "Mở rộng kích thước"}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              className="chat-header-btn"
              aria-label="Thu nhỏ chat"
              title="Thu nhỏ chat"
              onClick={() => chat.minimizeChat()}
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              className="chat-header-btn chat-close-btn"
              aria-label="Đóng chat"
              title="Đóng"
              onClick={close}
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div
          className="chat-tabs"
          role="tablist"
          aria-label="Kênh trò chuyện"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const tab =
              event.key === "Home"
                ? "ai"
                : event.key === "End"
                  ? "store"
                  : ui.tab === "ai"
                    ? "store"
                    : "ai";
            chat.openChat({ tab });
            document.getElementById("chat-tab-" + tab)?.focus();
          }}
        >
          <button
            id="chat-tab-ai"
            role="tab"
            tabIndex={ui.tab === "ai" ? 0 : -1}
            aria-controls="chat-ai"
            aria-selected={ui.tab === "ai"}
            onClick={() => chat.openChat({ tab: "ai" })}
          >
            <Bot size={17} />
            <span>Trợ lý AI</span>
          </button>
          <button
            id="chat-tab-store"
            role="tab"
            tabIndex={ui.tab === "store" ? 0 : -1}
            aria-controls="chat-store"
            aria-selected={ui.tab === "store"}
            onClick={() => chat.openChat({ tab: "store" })}
          >
            <Store size={17} />
            <span>Gian hàng</span>
            {unreadTotal > 0 && (
              <span className="shopee-chat-tab-badge">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>
        </div>
        <section
          role="tabpanel"
          id="chat-ai"
          aria-labelledby="chat-tab-ai"
          hidden={ui.tab !== "ai"}
        >
          <AiChatPanel active={open && visible && ui.tab === "ai"} />
        </section>
        <section
          role="tabpanel"
          id="chat-store"
          aria-labelledby="chat-tab-store"
          hidden={ui.tab !== "store"}
        >
          {customer ? (
            <MessagesWorkspace
              scope="CUSTOMER"
              id={ui.conversationId}
              compact
              active={open && visible && ui.tab === "store"}
              onSelect={(conversationId) =>
                chat.openChat({ tab: "store", conversationId })
              }
            />
          ) : (
            <div className="chat-signin">
              <Store size={32} />
              <h2>Trao đổi với gian hàng</h2>
              <p>Đăng nhập để hỏi về sản phẩm và xem các hội thoại của bạn.</p>
              <Link
                className="ui-button ui-button-primary"
                to="/login"
                onClick={close}
              >
                Đăng nhập để nhắn tin
              </Link>
            </div>
          )}
        </section>
      </dialog>
    </div>
  );
}
