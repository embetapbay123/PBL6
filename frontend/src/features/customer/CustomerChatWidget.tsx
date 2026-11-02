import {
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUpRight,
  Bot,
  Gift,
  LoaderCircle,
  MessageSquare,
  Plus,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../api/auth-context";
import { ApiError } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  createChatSession,
  listOwnChatSessions,
  sendChatMessage,
} from "../../api/recommendationsChat";
import { ErrorView, Loading } from "../../bootstrap/components";
import {
  ChatAvatar,
  ChatComposer,
  ChatPages,
  chatDate,
} from "../../chat/ChatPrimitives";

type Message = OperationOutputs["sendChatMessage"];
type Session = OperationOutputs["createChatSession"];
const prompts = [
  { icon: Gift, title: "Tìm quà tặng", text: "Tôi muốn tìm quà tặng" },
  {
    icon: Wallet,
    title: "Chọn theo ngân sách",
    text: "Giúp tôi chọn sản phẩm theo ngân sách",
  },
];
function fallbackText(reason: Message["fallback_reason"]) {
  if (reason === "PROVIDER_INVALID_RESPONSE")
    return "Phản hồi của model chưa đạt yêu cầu kiểm chứng. Các gợi ý bên trên được lấy trực tiếp từ catalog.";
  if (reason === "PROVIDER_NOT_CONFIGURED")
    return "Model chưa được cấu hình. Đang dùng gợi ý từ catalog.";
  if (reason === "NO_MATCH")
    return "Chưa tìm thấy sản phẩm phù hợp; hãy thử mô tả khác hoặc đổi ngân sách.";
  return "Chưa nhận được phản hồi model phù hợp. Đang dùng gợi ý từ catalog.";
}
export function AiChatPanel({ active }: { active: boolean }) {
  const { session } = useAuth(),
    customer = !!session?.context?.roles.includes("CUSTOMER");
  const [draft, setDraft] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [current, setCurrent] = useState<Session>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const [history, setHistory] =
      useState<OperationOutputs["listOwnChatSessions"]>(),
    [page, setPage] = useState(1),
    [messagePage, setMessagePage] = useState(1),
    [messageTotal, setMessageTotal] = useState(0),
    [reload, setReload] = useState(0),
    [historyError, setHistoryError] = useState<unknown>();
  const [titles, setTitles] = useState<Record<string, string>>({}),
    [showLatest, setShowLatest] = useState(false);
  const alive = useRef(true),
    flight = useRef(false),
    log = useRef<HTMLDivElement>(null),
    following = useRef(true),
    view = useRef("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!customer || !active) return;
    let current = true;
    setHistoryError(undefined);
    listOwnChatSessions({ page, size: 20 })
      .then((v) => {
        if (current) setHistory(v);
      })
      .catch((e) => {
        if (current) setHistoryError(e);
      });
    return () => {
      current = false;
    };
  }, [customer, active, page, reload]);
  useLayoutEffect(() => {
    const element = log.current,
      key = current?.id + ":" + messagePage;
    if (!element) return;
    if (following.current || view.current !== key) {
      element.scrollTop = element.scrollHeight;
      following.current = true;
      setShowLatest(false);
    } else setShowLatest(true);
    view.current = key;
  }, [messages, busy, current?.id, messagePage]);
  function followLatest() {
    if (log.current) {
      log.current.scrollTop = log.current.scrollHeight;
      following.current = true;
      setShowLatest(false);
    }
  }
  async function choose(id: string, p = 1) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await listOwnChatSessions({
        session_id: id,
        page: 1,
        size: 20,
        message_page: p,
        message_size: 20,
      });
      const selected = result.items.find((v) => v.id === id);
      if (!selected)
        throw new ApiError(
          404,
          "NOT_FOUND",
          "Không tìm thấy phiên chat của bạn.",
        );
      if (alive.current) {
        setCurrent(selected);
        setMessages(selected.messages?.items ?? []);
        setMessagePage(p);
        setMessageTotal(selected.messages?.total ?? 0);
        if (p === 1) {
          const first = selected.messages?.items.find(
            (message) => message.role === "USER",
          );
          if (first) setTitles((t) => ({ ...t, [id]: first.content }));
        }
      }
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      let selected = current;
      if (!selected) {
        selected = await createChatSession();
        if (!alive.current) return;
        setCurrent(selected);
      }
      if (!customer && !selected.anonymous_key)
        throw new ApiError(
          503,
          "CHAT_KEY_MISSING",
          "Không thể xác minh phiên Guest. Hãy bắt đầu phiên mới.",
        );
      const answer = await sendChatMessage(
        selected.id,
        content,
        customer ? undefined : selected.anonymous_key,
      );
      if (alive.current) {
        setTitles((t) => ({ ...t, [selected.id]: t[selected.id] ?? content }));
        setMessages((v) => [...v, { content, role: "USER" }, answer]);
        setDraft("");
        setMessageTotal(0);
        setReload((n) => n + 1);
        following.current = true;
      }
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function newSession() {
    setCurrent(undefined);
    setMessages([]);
    setMessageTotal(0);
    setMessagePage(1);
    setDraft("");
    setError(undefined);
  }
  return (
    <div
      className={
        "ai-chat-panel chat-shell" + (!customer ? " chat-shell-guest" : "")
      }
    >
      {customer && (
        <section className="chat-sidebar" aria-label="Lịch sử chat">
          <div className="chat-sidebar-heading">
            <h3>Lịch sử của bạn</h3>
            <span>{history?.total ?? "—"}</span>
          </div>
          <button
            type="button"
            className="chat-new-session"
            disabled={busy}
            onClick={newSession}
          >
            <Plus size={16} />
            Phiên mới
          </button>
          <div className="chat-thread-list">
            {historyError ? (
              <ErrorView
                error={historyError}
                onRetry={() => setReload((n) => n + 1)}
              />
            ) : !history ? (
              <Loading />
            ) : !history.items.length ? (
              <div className="chat-sidebar-empty">
                <MessageSquare size={24} />
                <p>Chưa có phiên chat.</p>
                <small>Các cuộc trò chuyện sẽ xuất hiện ở đây.</small>
              </div>
            ) : (
              history.items.map((s) => (
                <button
                  type="button"
                  className="chat-session-row"
                  key={s.id}
                  disabled={busy}
                  aria-current={s.id === current?.id ? "true" : undefined}
                  onClick={() => void choose(s.id)}
                >
                  <MessageSquare size={16} />
                  <span>
                    <strong>{titles[s.id] ?? "Tư vấn mua sắm"}</strong>
                    <small>
                      {chatDate(s.created_at, true)} · #
                      {s.id.slice(-4).toUpperCase()}
                    </small>
                  </span>
                </button>
              ))
            )}
          </div>
          {history && (
            <ChatPages
              page={page}
              size={history.size}
              total={history.total}
              onPage={setPage}
            />
          )}
          <p className="chat-sidebar-note">Lịch sử riêng của tài khoản bạn.</p>
        </section>
      )}
      <div className="chat-thread">
        <header className="chat-thread-header">
          <ChatAvatar ai />
          <div>
            <h2>Trợ lý mua sắm</h2>
            <p>Tìm sản phẩm theo nhu cầu của bạn</p>
          </div>
          {!customer && (
            <button
              type="button"
              className="chat-icon-button"
              title="Phiên mới"
              aria-label="Phiên mới"
              disabled={busy}
              onClick={newSession}
            >
              <Plus size={18} />
            </button>
          )}
        </header>
        <div
          ref={log}
          className="chat-transcript ai-transcript"
          role="log"
          aria-label="Nội dung chat AI"
          aria-live="polite"
          tabIndex={0}
          onScroll={(event) => {
            const el = event.currentTarget;
            following.current =
              el.scrollHeight - el.clientHeight - el.scrollTop < 40;
            if (following.current) setShowLatest(false);
          }}
        >
          {!messages.length && !busy && (
            <div className="chat-welcome">
              <span className="chat-welcome-icon">
                <ShoppingBag size={28} />
              </span>
              <span className="chat-overline">TRỢ LÝ PBL6</span>
              <h2>
                Bạn đang tìm
                <br />
                sản phẩm gì?
              </h2>
              <p>
                Kể một chút về món bạn cần.
                <br />
                Mình sẽ giúp bạn tìm trong gian hàng.
              </p>
              <div className="chat-prompt-grid">
                {prompts.map(({ icon: Icon, title, text }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => {
                      setDraft(text);
                      log.current?.parentElement
                        ?.querySelector("textarea")
                        ?.focus();
                    }}
                  >
                    <Icon size={18} />
                    <span>{title}</span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <article
              key={(m.id ?? "message") + ":" + i}
              className={
                "chat-message " +
                (m.role === "USER"
                  ? "chat-message-own"
                  : "chat-message-assistant")
              }
            >
              <span className="chat-speaker">
                {m.role === "USER" ? (
                  "Bạn"
                ) : (
                  <>
                    <Bot size={14} />
                    Trợ lý PBL6
                  </>
                )}
              </span>
              <div className="chat-bubble">
                <p>{m.content}</p>
              </div>
              {!!m.product_cards?.length && (
                <div className="chat-product-cards">
                  {m.product_cards.map((card) => (
                    <Link
                      key={card.product_id}
                      to={"/products/" + card.product_id}
                    >
                      <span className="chat-product-icon">
                        <ShoppingBag size={18} />
                      </span>
                      <span>
                        <strong>
                          {card.current_price_vnd.toLocaleString("vi-VN")} ₫
                        </strong>
                        <small>
                          {card.status === "PUBLISHED"
                            ? "Đang bán"
                            : "Xem tình trạng sản phẩm"}
                        </small>
                      </span>
                      <span className="chat-product-link">
                        Xem sản phẩm
                        <ArrowUpRight size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {m.fallback && (
                <p className="chat-fallback" role="status">
                  {fallbackText(m.fallback_reason)}
                </p>
              )}
            </article>
          ))}
          {busy && (
            <p className="chat-thinking" role="status">
              <LoaderCircle size={16} className="chat-spinner" />
              Đang tải phản hồi…
            </p>
          )}
        </div>
        {showLatest && (
          <button
            type="button"
            className="chat-scroll-latest"
            onClick={followLatest}
          >
            <ArrowDown size={14} />
            Xem tin mới
          </button>
        )}
        {error != null && <ErrorView error={error} />}
        {customer && current && (
          <ChatPages
            page={messagePage}
            size={20}
            total={messageTotal}
            onPage={(p) => void choose(current.id, p)}
          />
        )}
        <ChatComposer
          label="Câu hỏi"
          draft={draft}
          onChange={setDraft}
          onSubmit={send}
          busy={busy}
          disabled={!draft.trim()}
          buttonText={busy ? "Đang trả lời…" : "Gửi câu hỏi"}
          placeholder="Bạn muốn tìm món gì?"
        />
        <p className="chat-disclaimer">
          Gợi ý có hỗ trợ AI. Kiểm tra thông tin sản phẩm trước khi mua.
        </p>
      </div>
    </div>
  );
}
export function CustomerChatWidget() {
  const { session } = useAuth();
  return <AiChatPanel key={session?.context?.user_id ?? "guest"} active />;
}
