import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../api/auth-context";
import { ApiError } from "../api/client";
import { callOperation } from "../api/operations";
import { ErrorView, Loading } from "../bootstrap/components";
import {
  ArrowDown,
  ArrowLeft,
  MessageSquare,
  Package,
  Store,
} from "lucide-react";
import {
  ChatAvatar,
  ChatComposer,
  ChatPages,
  chatDate,
} from "./ChatPrimitives";

import { useChat, conversationEntry } from "./ChatProvider";

type Scope = "CUSTOMER" | "STORE";
export function MessagesWorkspace({
  scope,
  id,
  onSelect,
  active = true,
  compact = false,
}: {
  scope: Scope;
  id?: string;
  onSelect?: (id: string) => void;
  active?: boolean;
  compact?: boolean;
}) {
  const { session } = useAuth();
  const member = session?.context?.store_membership;
  const allowed =
    scope === "CUSTOMER"
      ? !!session?.context?.roles.includes("CUSTOMER")
      : !!member &&
        member.status === "ACTIVE" &&
        (member.role === "OWNER" ||
          !!member.permissions?.includes("order.store.read_status_cancel"));
  const [listPage, setListPage] = useState(1),
    [messagePages, setMessagePages] = useState<Record<string, number>>({});
  const conversationKey = scope + ":" + id,
    messagePage = messagePages[conversationKey] ?? 1;
  const setMessagePage = (page: number) =>
    setMessagePages((current) => ({ ...current, [conversationKey]: page }));
  const chat = useChat(),
    entry = conversationEntry(chat.entries, scope, id),
    { draft, busy, error, notice, pending, order } = entry;
  const setDraft = (draft: string) => chat.patch(scope + ":" + id, { draft });
  const base = scope === "CUSTOMER" ? "/customer/messages" : "/seller/messages";
  const threads = useQuery({
    queryKey: ["conversations", scope, listPage],
    enabled: allowed && active,
    refetchInterval: active ? 10000 : false,
    queryFn: () =>
      scope === "CUSTOMER"
        ? callOperation("listOwnConversations", {
            query: { page: listPage, size: 20 },
          })
        : callOperation("listStoreConversations", {
            query: { page: listPage, size: 20 },
          }),
  });
  const messages = useQuery({
    queryKey: ["conversation-messages", scope, id, messagePage],
    enabled: allowed && active && !!id,
    refetchInterval: active && messagePage === 1 ? 10000 : false,
    refetchOnWindowFocus: messagePage === 1,
    queryFn: async () => {
      const result =
        scope === "CUSTOMER"
          ? await callOperation("listOwnConversationMessages", {
              path: { id: id! },
              query: { page: messagePage, size: 20 },
            })
          : await callOperation("listStoreConversationMessages", {
              path: { id: id! },
              query: { page: messagePage, size: 20 },
            });
      if (
        result.conversation_id !== id ||
        (result.conversation && result.conversation.id !== id)
      )
        throw new ApiError(
          503,
          "CONVERSATION_CONTEXT_INVALID",
          "Kết quả không khớp hội thoại đã chọn. Hãy đọc lại trước khi gửi.",
        );
      return result;
    },
  });
  const log = useRef<HTMLDivElement>(null),
    following = useRef(true),
    position = useRef<{ key: string; latest?: string }>(undefined);
  const [newMessages, setNewMessages] = useState(false),
    historyKey = conversationKey + ":" + messagePage;
  useLayoutEffect(() => {
    const element = log.current;
    if (!element || !messages.data) return;
    const latest = messages.data.items[0]?.id,
      changed = position.current?.key !== historyKey;
    if (changed || following.current) {
      element.scrollTop = element.scrollHeight;
      following.current = true;
      setNewMessages(false);
    } else if (position.current?.latest !== latest) setNewMessages(true);
    position.current = { key: historyKey, latest };
  }, [historyKey, messages.data]);
  function followLatest() {
    const element = log.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
      following.current = true;
      setNewMessages(false);
    }
  }
  function send(event: FormEvent) {
    event.preventDefault();
    if (id && !messages.error && !messages.isLoading) {
      setMessagePage(1);
      void chat.send(scope, id);
    }
  }
  if (!allowed)
    return (
      <ErrorView
        error={
          new ApiError(
            403,
            "FORBIDDEN",
            "Bạn chưa có quyền truy cập tin nhắn của gian hàng.",
          )
        }
      />
    );
  const selected =
      (!messages.error ? messages.data?.conversation : undefined) ??
      threads.data?.items.find((thread) => thread.id === id),
    rememberedName =
      scope === "CUSTOMER" && chat.ui.conversationId === id
        ? chat.ui.conversationName
        : undefined;
  const orderPath = (orderId: string) =>
    (scope === "CUSTOMER" ? "/customer/orders/" : "/seller/orders?q=") +
    encodeURIComponent(orderId);
  const name = selected
    ? scope === "CUSTOMER"
      ? selected.store_name
      : selected.customer_name
    : (rememberedName ?? "Hội thoại");
  return (
    <section
      className={
        "conversation-workspace" +
        (compact ? " conversation-compact" : "") +
        (id ? " has-selection" : "")
      }
    >
      {!compact && (
        <div className="chat-page-heading">
          <div>
            <h1>
              {scope === "CUSTOMER"
                ? "Tin nhắn với gian hàng"
                : "Tin nhắn khách hàng"}
            </h1>
            <p>Trao đổi về sản phẩm, đơn hàng và hỗ trợ sau mua.</p>
          </div>
          <MessageSquare size={25} />
        </div>
      )}
      <div className="market-messages chat-shell">
        <aside className="chat-sidebar" aria-label="Danh sách hội thoại">
          <div className="chat-sidebar-heading">
            <h2>Hội thoại</h2>
            <span>{threads.data?.total ?? "—"}</span>
          </div>
          <div className="chat-thread-list">
            {threads.isLoading && <Loading />}
            {threads.error && (
              <ErrorView
                error={threads.error}
                onRetry={() => void threads.refetch()}
              />
            )}
            {threads.data &&
              (!threads.data.items.length ? (
                <div className="chat-sidebar-empty">
                  <MessageSquare size={24} />
                  <p>Chưa có hội thoại.</p>
                  <small>
                    Mở sản phẩm hoặc gian hàng rồi chọn Nhắn tin gian hàng để
                    bắt đầu.
                  </small>
                  {scope === "CUSTOMER" && (
                    <Link to="/" onClick={() => chat.closeChat()}>
                      Khám phá sản phẩm →
                    </Link>
                  )}
                </div>
              ) : (
                <nav aria-label="Hội thoại">
                  {threads.data.items.map((thread) => {
                    const title =
                      scope === "CUSTOMER"
                        ? thread.store_name
                        : thread.customer_name;
                    return (
                      <Link
                        className="chat-contact-row"
                        key={thread.id}
                        onClick={(event) => {
                          if (onSelect) {
                            event.preventDefault();
                            onSelect(thread.id);
                            setMessagePage(1);
                          }
                        }}
                        to={base + "/" + thread.id}
                        aria-current={thread.id === id ? "page" : undefined}
                      >
                        <ChatAvatar name={title} />
                        <span>
                          <span className="chat-contact-top">
                            <strong>{title}</strong>
                            <time
                              dateTime={thread.updated_at}
                              title={
                                thread.updated_at
                                  ? new Date(thread.updated_at).toLocaleString(
                                      "vi-VN",
                                    )
                                  : undefined
                              }
                            >
                              {chatDate(thread.updated_at, true)}
                            </time>
                          </span>
                          <span className="chat-contact-preview">
                            {thread.last_message ?? "Bắt đầu cuộc trò chuyện"}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              ))}
          </div>
          {threads.data && (
            <ChatPages
              page={listPage}
              size={threads.data.size}
              total={threads.data.total}
              onPage={setListPage}
            />
          )}
          <p className="chat-sidebar-note">
            {scope === "CUSTOMER"
              ? "Tin nhắn giữa bạn và gian hàng."
              : "Hội thoại trong phạm vi Store hiện tại."}
          </p>
        </aside>
        <div className="chat-thread">
          {!id ? (
            <div className="chat-welcome">
              <span className="chat-welcome-icon">
                <Store size={28} />
              </span>
              <span className="chat-overline">KẾT NỐI GIAN HÀNG</span>
              <h2>
                Mọi trao đổi,
                <br />ở cùng một nơi.
              </h2>
              <p>Chọn hội thoại để xem và gửi tin nhắn.</p>
            </div>
          ) : (
            <>
              <header className="chat-thread-header">
                {compact && (
                  <button
                    type="button"
                    className="chat-back-button chat-icon-button"
                    aria-label="Quay lại hội thoại"
                    onClick={() => onSelect?.("")}
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <ChatAvatar name={name} />
                <div>
                  <h2>{name}</h2>
                  <p>
                    {scope === "CUSTOMER"
                      ? "Trao đổi trực tiếp với gian hàng"
                      : "Hỗ trợ khách hàng"}
                  </p>
                </div>
              </header>
              {messages.isLoading && <Loading />}
              {messages.error && (
                <ErrorView
                  error={messages.error}
                  onRetry={() => void messages.refetch()}
                />
              )}
              {messages.data && (
                <>
                  <div
                    ref={log}
                    tabIndex={0}
                    role="log"
                    aria-label="Nội dung hội thoại"
                    aria-live="polite"
                    className="market-message-log chat-transcript"
                    onScroll={(event) => {
                      const element = event.currentTarget;
                      following.current =
                        element.scrollHeight -
                          element.clientHeight -
                          element.scrollTop <=
                        32;
                      if (following.current) setNewMessages(false);
                    }}
                  >
                    {!messages.data.items.length && (
                      <div className="chat-conversation-empty">
                        <MessageSquare size={28} />
                        <h3>Bắt đầu lời chào</h3>
                        <p>Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.</p>
                      </div>
                    )}
                    {[...messages.data.items].reverse().map((message) => (
                      <article
                        key={message.id}
                        className={
                          "chat-message " +
                          (message.sender_side === scope
                            ? "message-own chat-message-own"
                            : "")
                        }
                      >
                        <span className="chat-speaker">
                          {message.sender_side === scope
                            ? "Bạn"
                            : scope === "CUSTOMER"
                              ? "Gian hàng"
                              : "Khách hàng"}
                          <time
                            dateTime={message.created_at}
                            title={new Date(message.created_at).toLocaleString(
                              "vi-VN",
                            )}
                          >
                            {chatDate(message.created_at, true)}
                          </time>
                        </span>
                        <div className="chat-bubble">
                          <p>{message.content}</p>
                          {message.order_id && (
                            <div className="message-order-actions">
                              <Link
                                to={orderPath(message.order_id)}
                                onClick={() => chat.closeChat()}
                              >
                                <Package size={14} />
                                Xem đơn #
                                {message.order_id.slice(-8).toUpperCase()}
                              </Link>
                              <button
                                type="button"
                                disabled={busy || !!pending}
                                onClick={() =>
                                  chat.chooseOrder(scope, id!, {
                                    order_id: message.order_id!,
                                  })
                                }
                              >
                                Trả lời về đơn này
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {newMessages && (
                    <p role="status">
                      <button
                        type="button"
                        className="chat-scroll-latest"
                        onClick={followLatest}
                      >
                        <ArrowDown size={14} />
                        Có tin nhắn mới · Xem cuối hội thoại
                      </button>
                    </p>
                  )}
                  <ChatPages
                    page={messagePage}
                    size={messages.data.size}
                    total={messages.data.total}
                    onPage={setMessagePage}
                  />
                </>
              )}
              {order && (
                <section
                  className="message-order-reference"
                  aria-label="Đơn hàng tham chiếu khi gửi"
                >
                  <p>
                    <Package size={15} />
                    Đang trao đổi về{" "}
                    <Link
                      to={orderPath(order.order_id)}
                      onClick={() => chat.closeChat()}
                    >
                      đơn #{order.order_id.slice(-8).toUpperCase()}
                    </Link>
                    {order.title && <> · {order.title}</>}
                  </p>
                  <p>
                    Chỉ gắn tham chiếu khi bạn gửi nội dung. Chưa tự gửi tin
                    nhắn.
                  </p>
                  <button
                    type="button"
                    disabled={busy || !!pending}
                    onClick={() =>
                      chat.chooseOrder(scope, id!, undefined, true)
                    }
                  >
                    Bỏ tham chiếu đơn
                  </button>
                </section>
              )}
              <ChatComposer
                label="Nội dung tin nhắn"
                draft={draft}
                onChange={setDraft}
                onSubmit={send}
                busy={busy}
                locked={!!pending || !!messages.error || messages.isLoading}
                disabled={
                  !!messages.error ||
                  messages.isLoading ||
                  (!pending && !draft.trim())
                }
                buttonText={
                  busy ? "Đang gửi…" : pending ? "Thử gửi lại" : "Gửi tin nhắn"
                }
                placeholder="Viết tin nhắn…"
              />
              {pending && !busy && error !== undefined && (
                <p className="chat-send-note" role="note">
                  Chưa xác định được kết quả. Thử gửi lại sẽ dùng cùng mã và nội
                  dung tin nhắn.
                </p>
              )}
              {error !== undefined && <ErrorView error={error} />}{" "}
              {notice && (
                <p className="chat-send-note" role="status">
                  {notice}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
