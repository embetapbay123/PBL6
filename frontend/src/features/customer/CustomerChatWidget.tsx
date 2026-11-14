import {
  type FormEvent,
  useEffect,
  useId,
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
  Trash2,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../api/auth-context";
import { ApiError } from "../../api/client";
import type { OperationOutputs } from "../../api/operations.generated";
import {
  createChatSession,
  listOwnChatSessions,
  deleteOwnChatSession,
  deleteOwnChatHistory,
  sendChatMessage,
} from "../../api/recommendationsChat";
import { ErrorView, Loading } from "../../bootstrap/components";
import {
  ChatAvatar,
  ChatComposer,
  ChatMessageContent,
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
  const [historyMutationError,setHistoryMutationError]=useState<unknown>();
  const [titles, setTitles] = useState<Record<string, string>>({}),
    [showLatest, setShowLatest] = useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const historyId=useId(),searchInput=useRef<HTMLInputElement>(null),historyTrigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(historyOpen&&matchMedia('(max-width:767px)').matches)searchInput.current?.focus();},[historyOpen]);
  const closeHistory=()=>{setHistoryOpen(false);requestAnimationFrame(()=>historyTrigger.current?.focus());};
  const searchKey='pbl6_ai_history_search_'+session?.context?.user_id;
  const [searchDraft,setSearchDraft]=useState(()=>{try{return sessionStorage.getItem(searchKey)?.slice(0,200)??'';}catch{return '';}});
  const [search,setSearch]=useState(searchDraft.trim());
  useEffect(()=>{
    const timer=setTimeout(()=>{const value=searchDraft.trim();if(value!==search){setPage(1);setSearch(value);}try{if(value)sessionStorage.setItem(searchKey,value);else sessionStorage.removeItem(searchKey);}catch{/* Optional preference storage. */}},300);
    return()=>clearTimeout(timer);
  },[searchDraft,search,searchKey]);
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
    const controller=new AbortController();
    setHistory(undefined);
    setHistoryError(undefined);
    listOwnChatSessions({ page, size: 20, ...(search?{q:search}:{}) },{signal:controller.signal})
      .then((v) => {
        if (current) setHistory(v);
      })
      .catch((e) => {
        if (current) setHistoryError(e);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [customer, active, page, reload, search]);
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
  async function choose(id: string, p?: number) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      let result = await listOwnChatSessions({
        session_id: id,
        page: 1,
        size: 20,
        message_page: p ?? 1,
        message_size: 20,
      });
      let selected = result.items.find((v) => v.id === id);
      if (!selected)
        throw new ApiError(
          404,
          "NOT_FOUND",
          "Không tìm thấy phiên chat của bạn.",
        );
      const first = selected.messages?.items.find(
        (message) => message.role === "USER",
      );
      const targetPage =
        p ?? Math.max(1, Math.ceil((selected.messages?.total ?? 0) / 20));
      if (targetPage !== (selected.messages?.page ?? 1)) {
        result = await listOwnChatSessions({
          session_id: id,
          page: 1,
          size: 20,
          message_page: targetPage,
          message_size: 20,
        });
        selected = result.items.find((value) => value.id === id);
        if (!selected)
          throw new ApiError(
            404,
            "NOT_FOUND",
            "Không tìm thấy phiên chat của bạn.",
          );
      }
      if (alive.current) {
        setCurrent(selected);
        setMessages(selected.messages?.items ?? []);
        setMessagePage(targetPage);
        setMessageTotal(selected.messages?.total ?? 0);
        setHistoryOpen(false);
        if(matchMedia('(max-width:767px)').matches)requestAnimationFrame(()=>log.current?.focus());
        if (p === undefined || p === 1) {
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
        const nextTotal = (messageTotal || messages.length) + 2;
        setMessageTotal(nextTotal);
        setReload((n) => n + 1);
        following.current = true;
        if (customer && nextTotal > 20) {
          // The answer is already acknowledged: a history read failure must not resend it.
          try {
            const targetPage = Math.ceil(nextTotal / 20),
              latest = await listOwnChatSessions({
                session_id: selected.id,
                page: 1,
                size: 20,
                message_page: targetPage,
                message_size: 20,
              });
            const saved = latest.items.find(
              (value) => value.id === selected.id,
            );
            if (alive.current && saved?.messages) {
              setMessages(saved.messages.items);
              setMessagePage(targetPage);
              setMessageTotal(saved.messages.total);
            }
          } catch {
            if (alive.current)
              setError(
                new ApiError(
                  503,
                  "CHAT_HISTORY_UNAVAILABLE",
                  "Đã nhận câu trả lời, nhưng chưa tải được trang lịch sử mới nhất. Mở lại phiên để đọc lại; không cần gửi lại câu hỏi.",
                ),
              );
          }
        }
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
  async function removeHistory(sessionId?: string) {
    if (!customer || flight.current) return;
    const confirmation = sessionId ? 'Xóa cuộc trò chuyện này? Không thể khôi phục.' : 'Xóa toàn bộ lịch sử AI của tài khoản? Không thể khôi phục.';
    if (!window.confirm(confirmation)) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    setHistoryMutationError(undefined);
    try {
      try {
        if (sessionId) await deleteOwnChatSession(sessionId);
        else await deleteOwnChatHistory();
      } catch (cause) {
        if (!(sessionId && cause instanceof ApiError && cause.status === 404)) throw cause;
      }
      if (!alive.current) return;
      if (!sessionId || current?.id === sessionId) newSession();
      setTitles(previous => {
        if (!sessionId) return {};
        const next = { ...previous }; delete next[sessionId]; return next;
      });
      setHistory(undefined);
      setPage(sessionId && history?.items.length === 1 ? Math.max(1, page - 1) : sessionId ? page : 1);
      setReload(value => value + 1);
    } catch (cause) {
      if (alive.current) setHistoryMutationError(cause);
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const deleteSession = (sessionId: string) => { void removeHistory(sessionId); };
  const clearAllSessions = () => { void removeHistory(); };
  const visibleSessions = history?.items ?? [];

  return (
    <div
      className={
        "ai-chat-panel chat-shell" + (!customer ? " chat-shell-guest" : "")
      }
      data-history-open={historyOpen}
    >
      {customer && (
        <section id={historyId} className="chat-sidebar" aria-label="Lịch sử chat">
          <div className="chat-sidebar-heading">
            <h3>Lịch sử của bạn</h3>
            <span>{history?.total ?? '—'}</span>
            <button type="button" className="ai-history-close" onClick={closeHistory}>Quay lại chat AI</button>
          </div>
          <button
            type="button"
            className="chat-new-session"
            disabled={busy}
            onClick={()=>{newSession();closeHistory();}}
          >
            <Plus size={16} />
            Phiên mới
          </button>
          <div className="chat-contact-search">
            <label htmlFor="ai-history-search">Tìm lịch sử AI</label>
            <div><input ref={searchInput} id="ai-history-search" type="search" maxLength={200} value={searchDraft} onChange={event=>setSearchDraft(event.target.value)} placeholder="Nội dung đã trò chuyện"/>{searchDraft&&<button type="button" onClick={()=>{setSearchDraft('');setSearch('');setPage(1);}}>Xóa lọc</button>}</div>
          </div>
          {historyMutationError!==undefined&&<div className="history-action-error"><ErrorView error={historyMutationError}/><button type="button" disabled={busy} onClick={()=>{setHistoryMutationError(undefined);setReload(n=>n+1);}}>Đọc lại lịch sử</button></div>}
          <div className="chat-thread-list">
            {historyError ? (
              <ErrorView
                error={historyError}
                onRetry={() => setReload((n) => n + 1)}
              />
            ) : !history ? (
              <Loading />
            ) : !visibleSessions.length ? (
              <div className="chat-sidebar-empty">
                <MessageSquare size={24} />
                <p>{search?'Không tìm thấy phiên phù hợp.':'Chưa có phiên chat.'}</p>
              </div>
            ) : (
              visibleSessions.map((s) => (
                <div
                  key={s.id}
                  className={"chat-session-item-wrap" + (s.id === current?.id ? " is-active" : "")}
                >
                  <button
                    type="button"
                    className="chat-session-row"
                    disabled={busy}
                    aria-current={s.id === current?.id ? "true" : undefined}
                    onClick={() => void choose(s.id)}
                  >
                    <MessageSquare size={16} />
                    <span>
                      <strong>{s.title ?? titles[s.id] ?? "Tư vấn mua sắm"}</strong>
                      <small>
                        {chatDate(s.created_at, true)} · #
                        {s.id.slice(-4).toUpperCase()}
                      </small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="chat-session-delete-btn"
                    title="Xóa phiên chat"
                    aria-label="Xóa phiên chat"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
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

          {!!history && (history.total > 1 || !!search) && (
            <button
              type="button"
              className="chat-clear-all-sessions-btn"
              onClick={clearAllSessions}
              disabled={busy}
              title="Xóa tất cả lịch sử chat"
            >
              <Trash2 size={13} />
              <span>Xóa toàn bộ lịch sử</span>
            </button>
          )}
        </section>
      )}
      <div className="chat-thread">
        {historyMutationError!==undefined&&<div className="history-action-error"><ErrorView error={historyMutationError}/><button type="button" disabled={busy} onClick={()=>{setHistoryMutationError(undefined);setReload(n=>n+1);}}>Đọc lại lịch sử</button></div>}
        <header className="chat-thread-header">
          <ChatAvatar ai />
          <div className="flex-1 min-w-0">
            <h2>Trợ lý mua sắm</h2>
            <p>Tìm sản phẩm theo nhu cầu của bạn</p>
          </div>
          {customer&&<button ref={historyTrigger} type="button" className="ai-history-toggle" aria-label="Lịch sử chat AI" aria-expanded={historyOpen} aria-controls={historyId} onClick={()=>setHistoryOpen(true)}>Lịch sử</button>}
          {(current || messages.length > 0) && (
            <button
              type="button"
              className="chat-thread-delete-btn"
              title="Xóa cuộc trò chuyện hiện tại"
              aria-label="Xóa cuộc trò chuyện hiện tại"
              disabled={busy}
              onClick={() => {
                if (current?.id) {
                  deleteSession(current.id);
                } else {
                  if (window.confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?")) {
                    newSession();
                  }
                }
              }}
            >
              <Trash2 size={14} />
              <span>Xóa phiên</span>
            </button>
          )}
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
                <ChatMessageContent content={m.content} />
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

      </div>
    </div>
  );
}
export function CustomerChatWidget() {
  const { session } = useAuth();
  return <AiChatPanel key={session?.context?.user_id ?? "guest"} active />;
}
