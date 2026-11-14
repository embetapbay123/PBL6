import { useId, type FormEvent } from "react";
import {
  ArrowUp,
  LoaderCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


export function ChatAvatar({
  name,
  ai = false,
}: {
  name?: string;
  ai?: boolean;
}) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={"chat-avatar" + (ai ? " chat-avatar-ai" : "")}
      aria-hidden="true"
    >
      {ai ? (
        <MessageSquare size={18} />
      ) : (
        initials || <MessageSquare size={18} />
      )}
    </span>
  );
}

export function chatDate(value?: string, withTime = false) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "";
  return new Intl.DateTimeFormat(
    "vi-VN",
    withTime
      ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" },
  ).format(new Date(value));
}

export function ChatPages({
  page,
  size,
  total,
  onPage,
  disabled = false,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (p: number) => void;
  disabled?: boolean;
  showTotal?: boolean;
}) {
  const totalPages = Math.ceil(total / size);
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    if (page <= 3) {
      pages.push(1, 2, 3, "...", totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  const pages = getPages();

  return (
    <nav className="chat-numbered-pagination" aria-label="Phân trang danh sách">
      <button
        type="button"
        className="chat-page-nav-btn"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
        title="Trang trước"
        aria-label="Trang trước"
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="chat-page-dots">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`chat-page-num-btn ${p === page ? "is-active" : ""}`}
            disabled={disabled || p === page}
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className="chat-page-nav-btn"
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
        title="Trang sau"
        aria-label="Trang sau"
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}

/** Only server-owned attachments are rendered as media. Text never fetches arbitrary URLs. */
export function ChatMessageContent({content}:{content:string}) {
  return content ? <div className="chat-message-content"><p className="chat-text-line whitespace-pre-wrap">{content}</p></div> : null;
}

export function ChatComposer({
  label, draft, onChange, onSubmit, busy, locked = false, retry = false, disabled = false, hasAttachments = false, mediaSlot, buttonText, placeholder,
}: {
  label: string; draft: string; onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void; busy: boolean; locked?: boolean; retry?: boolean; disabled?: boolean;
  buttonText: string; placeholder: string; hasAttachments?: boolean; mediaSlot?: import("react").ReactNode;
}) {
  const inputId = useId(), limitId = useId();
  const tooLong = draft.length > 2000;
  const cannotSend = busy || (locked && !retry) || disabled || tooLong || (!draft.trim() && !hasAttachments);
  return (
    <form className="chat-composer" onSubmit={event => {
      if (cannotSend) { event.preventDefault(); return; }
      onSubmit(event);
    }}>
      {mediaSlot}
      <div className="chat-composer-box">
        <label className="chat-sr-only" htmlFor={inputId}>{label}</label>
        <textarea id={inputId} rows={2} maxLength={2000} value={draft} placeholder={placeholder}
          disabled={busy || locked} aria-invalid={tooLong || undefined} aria-describedby={tooLong ? limitId : undefined}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!cannotSend) event.currentTarget.form?.requestSubmit();
            }
          }} />
        <button type="submit" aria-label={buttonText} title={buttonText} disabled={cannotSend}>
          {busy ? <LoaderCircle size={18} className="chat-spinner" /> : <ArrowUp size={19} />}
        </button>
      </div>
      {tooLong && <p id={limitId} role="alert">Tin nhắn tối đa 2.000 ký tự.</p>}
      <div className="chat-composer-toolbar">{!mediaSlot && <small>Chỉ hỗ trợ tin nhắn văn bản.</small>}<span>{draft.length}/2000</span></div>
    </form>
  );
}
