import { useId, useState, type FormEvent } from "react";
import {
  ArrowUp,
  LoaderCircle,
  MessageSquare,
  X,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Pagination } from "../bootstrap/components";

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

export interface MediaAttachment {
  type: "image" | "video";
  url: string;
  name?: string;
}

/** Rich content renderer supporting text, images with lightbox, and embedded videos */
export function ChatMessageContent({ content }: { content: string }) {
  const [activeMedia, setActiveMedia] = useState<MediaAttachment | null>(null);

  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const videoRegex = /\[video:([^\]]+)\]/g;

  const images: string[] = [];
  const videos: string[] = [];

  let text = content
    .replace(imageRegex, (_, __, url) => {
      images.push(url);
      return "";
    })
    .replace(videoRegex, (_, url) => {
      videos.push(url);
      return "";
    })
    .trim();

  return (
    <div className="chat-message-content">
      {text && <p className="chat-text-line whitespace-pre-wrap">{text}</p>}

      {images.length > 0 && (
        <div className="chat-media-images-grid">
          {images.map((url, i) => (
            <div
              key={i}
              className="chat-media-img-card"
              onClick={() => setActiveMedia({ type: "image", url })}
              title="Nhấp để xem ảnh lớn"
            >
              <img
                src={url}
                alt="Ảnh đính kèm"
                className="chat-media-img"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="chat-media-videos-grid">
          {videos.map((url, i) => (
            <div key={i} className="chat-media-video-card">
              <video
                src={url}
                controls
                preload="metadata"
                className="chat-media-video"
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeMedia && (
        <div
          className="chat-lightbox-backdrop"
          onClick={() => setActiveMedia(null)}
          role="dialog"
          aria-label="Xem media phóng to"
        >
          <div
            className="chat-lightbox-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="chat-lightbox-close"
              onClick={() => setActiveMedia(null)}
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
            {activeMedia.type === "image" ? (
              <img
                src={activeMedia.url}
                alt="Phóng to"
                className="chat-lightbox-image"
              />
            ) : (
              <video
                src={activeMedia.url}
                controls
                autoPlay
                className="chat-lightbox-video-player"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Helper to compress image down to max dimensions as a lightweight base64 string */
export function ChatComposer({
  label, draft, onChange, onSubmit, busy, locked = false, retry = false, disabled = false, buttonText, placeholder,
}: {
  label: string; draft: string; onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void; busy: boolean; locked?: boolean; retry?: boolean; disabled?: boolean;
  buttonText: string; placeholder: string;
}) {
  const inputId = useId(), limitId = useId();
  const tooLong = draft.length > 2000;
  const cannotSend = busy || (locked && !retry) || disabled || tooLong || !draft.trim();
  return (
    <form className="chat-composer" onSubmit={event => {
      if (cannotSend) { event.preventDefault(); return; }
      onSubmit(event);
    }}>
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
      <div className="chat-composer-toolbar"><small>Chỉ hỗ trợ tin nhắn văn bản.</small><span>{draft.length}/2000</span></div>
    </form>
  );
}
