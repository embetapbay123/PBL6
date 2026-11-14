import { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  ChatMessageContent,
  ChatPages,
  chatDate,
} from "./ChatPrimitives";

import { useChat, conversationEntry } from "./ChatProvider";
import {mediaCapabilities} from './chat-media';
import {ChatAttachmentView,ChatUploadTray} from './ChatMedia';

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
  const [urlParams,setUrlParams]=useSearchParams();
  const searchInputId=useId();
  const routeSearch=compact?'':(urlParams.get('q')??'').slice(0,200);
  const routePage=compact?1:Math.max(1,Math.min(1000000,Math.floor(Number(urlParams.get('page'))||1)));
  const [listPage, setListPage] = useState(routePage),
    [searchDraft,setSearchDraft]=useState(routeSearch),[search,setSearch]=useState(routeSearch),
    [compactArchived,setCompactArchived]=useState(false),[archiveBusy,setArchiveBusy]=useState(false),[archiveBlocked,setArchiveBlocked]=useState(false),[archiveError,setArchiveError]=useState<unknown>(),[readError,setReadError]=useState<unknown>(),[readRetry,setReadRetry]=useState(0),[visible,setVisible]=useState(()=>document.visibilityState==='visible'),
    [messagePages, setMessagePages] = useState<Record<string, number>>({});
  const cache=useQueryClient(),navigate=useNavigate(),marked=useRef('');
  useEffect(()=>{
    if(compact)return;
    setSearch(routeSearch);setSearchDraft(routeSearch);setListPage(routePage);
  },[compact,routeSearch,routePage]);
  function applySearch(value:string){
    const q=value.trim();setSearch(q);setListPage(1);
    if(!compact)setUrlParams(previous=>{const next=new URLSearchParams(previous);if(q)next.set('q',q);else next.delete('q');next.delete('page');return next;},{replace:true});
  }
  useEffect(()=>{
    if(searchDraft.trim()===search)return;
    const timer=setTimeout(()=>applySearch(searchDraft),300);
    return()=>clearTimeout(timer);
  },[searchDraft,search,compact,setUrlParams]);
  function changeListPage(page:number){
    setListPage(page);
    if(!compact)setUrlParams(previous=>{const next=new URLSearchParams(previous);if(page>1)next.set('page',String(page));else next.delete('page');return next;});
  }
  const showArchived=scope==='STORE' && (compact ? compactArchived : urlParams.get('archived')==='true');
  useEffect(()=>{const update=()=>setVisible(document.visibilityState==='visible');document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
  const conversationKey = scope + ":" + id,
    messagePage = messagePages[conversationKey] ?? 1;
  const setMessagePage = (page: number) =>
    setMessagePages((current) => ({ ...current, [conversationKey]: page }));
  const chat = useChat(),
    entry = conversationEntry(chat.entries, scope, id),
    { draft, busy, error, notice, pending, order } = entry;
  const setDraft = (draft: string) => chat.patch(scope + ":" + id, { draft });
  const uploads=chat.uploads.entries[conversationKey]??[];
  const capability=useQuery({queryKey:['chat-media-capabilities',scope,id],enabled:allowed&&active&&!!id,retry:false,staleTime:60000,queryFn:({signal})=>mediaCapabilities(scope,id!,signal)});
  const base = scope === "CUSTOMER" ? "/customer/messages" : "/seller/messages";
  const threads = useQuery({
    queryKey: ["conversations", scope, listPage, search, showArchived],
    enabled: allowed && active,
    refetchInterval: active ? 10000 : false,
    queryFn: ({signal}) =>
      scope === "CUSTOMER"
        ? callOperation("listOwnConversations", {
            query: { page: listPage, size: 20, ...(search?{q:search}:{}) },
          }, {signal})
        : callOperation("listStoreConversations", {
            query: { page: listPage, size: 20, ...(search?{q:search}:{}),...(showArchived?{archived:true}:{}) },
          }, {signal}),
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
  useEffect(()=>{
    const newest=messages.data?.items[0]?.id;
    if(scope!=='STORE'||!id||!active||!visible||messagePage!==1||!newest||messages.error||!following.current||threads.data?.unread_total===undefined)return;
    const key=id+':'+newest+':'+readRetry;if(marked.current===key)return;marked.current=key;let alive=true;
    callOperation('markStoreConversationRead',{path:{id},body:{message_id:newest}}).then(()=>{if(!alive)return;setReadError(undefined);void cache.invalidateQueries({queryKey:['conversations','STORE']});void cache.invalidateQueries({queryKey:['store-unread']});}).catch(error=>{if(alive)setReadError(error);});
    return()=>{alive=false;};
  },[scope,id,active,visible,messagePage,messages.data,messages.error,threads.data?.unread_total,readRetry,newMessages,cache]);
  useEffect(()=>{setArchiveError(undefined);setArchiveBlocked(false);setReadError(undefined);},[id]);
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
  const selectedThread=threads.data?.items.find(thread=>thread.id===id);
  const standalone = scope === "CUSTOMER" && !id && !search && !searchDraft.trim() && (!threads.data || threads.data.total === 0);
  async function archiveThread(){
    if(!id||!selectedThread||archiveBusy||archiveBlocked)return;setArchiveBusy(true);setArchiveError(undefined);
    try{await callOperation('archiveStoreConversation',{path:{id},body:{archived:!selectedThread.archived}});await Promise.all([cache.invalidateQueries({queryKey:['conversations','STORE']}),cache.invalidateQueries({queryKey:['store-unread']})]);onSelect?onSelect(''):navigate(base);}
    catch(error){setArchiveError(error);setArchiveBlocked(true);}finally{setArchiveBusy(false);}
  }
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
      <div className={"market-messages chat-shell" + (standalone ? " chat-shell-standalone" : "")}>
        {standalone ? (
          <div className="chat-welcome chat-standalone">
            {threads.error ? (
              <ErrorView error={threads.error} onRetry={() => void threads.refetch()} retryBusy={threads.isFetching} />
            ) : !threads.data ? (
              <Loading label="Đang tải hội thoại…" />
            ) : (
              <>
                <span className="chat-welcome-icon"><MessageSquare size={26} aria-hidden="true" /></span>
                <h2>Chưa có hội thoại</h2>
                <p>Mở một sản phẩm và chọn Nhắn tin gian hàng để bắt đầu.</p>
                <Link className="ui-button ui-button-primary" to="/" onClick={() => chat.closeChat()}>
                  Khám phá sản phẩm
                </Link>
              </>
            )}
          </div>
        ) : <>
        <aside className="chat-sidebar" aria-label="Danh sách hội thoại">
          <div className="chat-sidebar-heading">
            <h2>Hội thoại</h2>
            <span>{threads.data?.total ?? "—"}</span>
          </div>
          <form className="chat-contact-search" onSubmit={event=>{event.preventDefault();applySearch(searchDraft);}}>
            <label htmlFor={searchInputId}>{scope==='STORE'?'Tìm khách hàng':'Tìm hội thoại'}</label>
            <div><input id={searchInputId} type="search" maxLength={200} value={searchDraft} onChange={event=>setSearchDraft(event.target.value)} placeholder={scope==='STORE'?'Tên, email hoặc tin nhắn':'Tên gian hàng hoặc tin nhắn'}/><button type="submit">Tìm</button>{searchDraft&&<button type="button" onClick={()=>{setSearchDraft('');applySearch('');}}>Xóa lọc</button>}</div>
          </form>
          {scope==='STORE'&&threads.data?.unread_total!==undefined&&<button type="button" className="chat-archive-toggle" aria-pressed={showArchived} onClick={()=>{setListPage(1);if(compact){setCompactArchived(value=>!value);onSelect?.('');return;}const next=new URLSearchParams(urlParams);if(showArchived)next.delete('archived');else next.set('archived','true');setUrlParams(next);}}>{showArchived?'Xem hội thoại đang hoạt động':'Xem hội thoại đã lưu trữ'}</button>}
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
                  <p>{search?'Không tìm thấy hội thoại phù hợp.':'Chưa có hội thoại.'}</p>
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
                        to={base + "/" + thread.id + (compact ? '' : urlParams.toString() ? '?'+urlParams.toString() : '')}
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
                          {scope==='STORE' && thread.last_product_mention && <small className="chat-order-reference">Khách nhắc sản phẩm: {thread.last_product_mention}</small>}
                          {thread.last_order_id && <small className="chat-order-reference">Đơn được nhắc tới: #{thread.last_order_id.slice(-8).toUpperCase()}</small>}
                          {scope==='STORE'&&!!thread.unread_count&&<span className="chat-unread-badge" aria-label={thread.unread_count+' tin nhắn chưa đọc'}>{thread.unread_count>99?'99+':thread.unread_count}</span>}
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
              onPage={changeListPage}
            />
          )}
          {scope === "STORE" && <p className="chat-sidebar-note">Hội thoại trong phạm vi Store hiện tại.</p>}
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
                  {scope === "STORE" && <p>Hỗ trợ khách hàng</p>}
                </div>
                {scope==='STORE'&&selectedThread?.archived!==undefined&&<button type="button" disabled={archiveBusy||archiveBlocked} onClick={()=>void archiveThread()}>{archiveBusy?'Đang cập nhật…':selectedThread.archived?'Mở lại hội thoại':'Lưu trữ hội thoại'}</button>}
              </header>
              {archiveError!=null&&<ErrorView error={archiveError}/>}
              {archiveBlocked&&<button type="button" disabled={archiveBusy} onClick={()=>{setArchiveBusy(true);void threads.refetch().then(result=>{if(result.error)throw result.error;setArchiveBlocked(false);setArchiveError(undefined);}).catch(setArchiveError).finally(()=>setArchiveBusy(false));}}>Đọc lại hội thoại trước khi tiếp tục</button>}
              {readError!=null&&<div role="status">Chưa cập nhật trạng thái đã đọc. <button type="button" onClick={()=>setReadRetry(value=>value+1)}>Thử lại</button></div>}
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
                          <ChatMessageContent content={message.content} />
                          {!!message.attachments?.length&&<div className="chat-private-media-list">{message.attachments.map(asset=><ChatAttachmentView key={asset.id} scope={scope} id={id!} asset={asset}/>)}</div>}
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
                    Bỏ liên kết
                  </button>
                </section>
              )}
              <ChatComposer
                label="Nội dung tin nhắn"
                draft={pending?.content ?? draft}
                onChange={setDraft}
                onSubmit={send}
                busy={busy}
                hasAttachments={!!uploads.length}
                mediaSlot={(capability.data?.enabled||uploads.length>0)&&<ChatUploadTray items={uploads} locked={busy||!!pending||!!messages.error||messages.isLoading} onSelect={files=>{try{chat.uploads.select(scope,id!,files);chat.patch(conversationKey,{error:undefined});}catch(error){chat.patch(conversationKey,{error});}}} onRemove={item=>{void chat.uploads.remove(scope,id!,item).catch(error=>chat.patch(conversationKey,{error}));}} onRetry={item=>void chat.uploads.retry(scope,id!,item)}/>}
                retry={!!pending}
                locked={!!pending || !!messages.error || messages.isLoading}
                disabled={
                  !!messages.error ||
                  messages.isLoading ||
                  (!pending && ((!draft.trim()&&!uploads.length)||uploads.some(item=>item.stage!=='READY')))
                }
                buttonText={
                  busy ? "Đang gửi…" : pending ? "Thử gửi" : "Gửi"
                }
                placeholder="Viết tin nhắn…"
              />
              {pending && !busy && error !== undefined && (
                <p className="chat-send-note" role="note">
                  Chưa rõ kết quả. Thử gửi lại tin này.
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
        </>}
      </div>
    </section>
  );
}
