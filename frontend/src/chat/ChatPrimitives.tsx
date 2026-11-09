import { useId, useRef, useState, type FormEvent } from "react";
import {
  ArrowUp,
  LoaderCircle,
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Link2,
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
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readVideoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 8 * 1024 * 1024) {
      alert("Lưu ý: Video có dung lượng lớn hơn 8MB. Nếu mạng chậm hoặc giới hạn payload, khuyến nghị dùng đường dẫn URL video trực tiếp.");
    }
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatComposer({
  label,
  draft,
  onChange,
  onSubmit,
  busy,
  locked = false,
  disabled = false,
  buttonText,
  placeholder,
}: {
  label: string;
  draft: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  locked?: boolean;
  disabled?: boolean;
  buttonText: string;
  placeholder: string;
}) {
  const inputId = useId();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlType, setUrlType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);

  // Extract attached media items from draft
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const videoRegex = /\[video:([^\]]+)\]/g;

  const attachments: MediaAttachment[] = [];
  let match: RegExpExecArray | null;

  const tempImgRegex = new RegExp(imageRegex);
  while ((match = tempImgRegex.exec(draft)) !== null) {
    attachments.push({ type: "image", url: match[2], name: match[1] || "Ảnh đính kèm" });
  }

  const tempVidRegex = new RegExp(videoRegex);
  while ((match = tempVidRegex.exec(draft)) !== null) {
    attachments.push({ type: "video", url: match[1], name: "Video đính kèm" });
  }

  const cleanText = draft
    .replace(imageRegex, "")
    .replace(videoRegex, "")
    .trimStart();

  const handleTextChange = (newText: string) => {
    const mediaTags = attachments
      .map((item) =>
        item.type === "image"
          ? `\n![${item.name || "Hình ảnh"}](${item.url})`
          : `\n[video:${item.url}]`,
      )
      .join("");
    onChange(newText + mediaTags);
  };

  const removeAttachment = (indexToRemove: number) => {
    const newAttachments = attachments.filter((_, idx) => idx !== indexToRemove);
    const mediaTags = newAttachments
      .map((item) =>
        item.type === "image"
          ? `\n![${item.name || "Hình ảnh"}](${item.url})`
          : `\n[video:${item.url}]`,
      )
      .join("");
    onChange(cleanText.trim() + mediaTags);
  };

  const addAttachment = (item: MediaAttachment) => {
    const tag =
      item.type === "image"
        ? `\n![${item.name || "Hình ảnh"}](${item.url})`
        : `\n[video:${item.url}]`;
    onChange((draft.trim() ? draft.trim() + tag : tag).trim());
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const dataUrl = await compressImageFile(file);
      addAttachment({ type: "image", url: dataUrl, name: file.name });
    } catch {
      alert("Không thể đọc tệp ảnh. Vui lòng thử tệp khác.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const dataUrl = await readVideoFile(file);
      addAttachment({ type: "video", url: dataUrl, name: file.name });
    } catch {
      alert("Không thể đọc tệp video. Vui lòng thử tệp khác.");
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    addAttachment({ type: urlType, url: trimmed });
    setUrlInput("");
    setShowUrlModal(false);
  };

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        if (busy || disabled || uploading) {
          event.preventDefault();
          return;
        }
        onSubmit(event);
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageFile}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={handleVideoFile}
      />

      {/* Attachments Preview Strip */}
      {attachments.length > 0 && (
        <div className="chat-composer-attachments">
          {attachments.map((item, idx) => (
            <div key={idx} className="chat-composer-attachment-pill">
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt="Ảnh xem trước"
                  className="chat-composer-thumb"
                />
              ) : (
                <div className="chat-composer-video-thumb">
                  <Play size={12} className="text-white fill-white" />
                </div>
              )}
              <span className="chat-composer-attachment-label">
                {item.type === "image" ? "Ảnh" : "Video"} #{idx + 1}
              </span>
              <button
                type="button"
                className="chat-composer-attachment-remove"
                onClick={() => removeAttachment(idx)}
                title="Gỡ bỏ"
                aria-label="Gỡ bỏ đính kèm"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-composer-box">
        <label className="chat-sr-only" htmlFor={inputId}>
          {label}
        </label>
        <textarea
          id={inputId}
          rows={2}
          maxLength={2000}
          value={cleanText}
          placeholder={uploading ? "Đang xử lý media..." : placeholder}
          disabled={busy || locked || uploading}
          onChange={(event) => handleTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (
                !busy &&
                !locked &&
                !disabled &&
                !uploading &&
                draft.trim()
              )
                event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          aria-label={buttonText}
          title={buttonText}
          disabled={busy || disabled || uploading || !draft.trim()}
        >
          {busy || uploading ? (
            <LoaderCircle size={18} className="chat-spinner" />
          ) : (
            <ArrowUp size={19} />
          )}
        </button>
      </div>

      {/* Shopee-style Bottom Actions & Media Toolbar */}
      <div className="chat-composer-toolbar flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500">
          <button
            type="button"
            className="chat-toolbar-btn"
            title="Gửi hình ảnh"
            aria-label="Gửi hình ảnh"
            disabled={busy || locked || uploading}
            onClick={() => imageInputRef.current?.click()}
          >
            <ImageIcon size={16} />
            <span>Ảnh</span>
          </button>
          <button
            type="button"
            className="chat-toolbar-btn"
            title="Thêm video"
            aria-label="Thêm video"
            disabled={busy || locked || uploading}
            onClick={() => videoInputRef.current?.click()}
          >
            <VideoIcon size={16} />
            <span>Video</span>
          </button>
          <button
            type="button"
            className="chat-toolbar-btn"
            title="Thêm liên kết ảnh hoặc video"
            aria-label="Thêm liên kết media"
            disabled={busy || locked || uploading}
            onClick={() => setShowUrlModal(true)}
          >
            <Link2 size={16} />
            <span>URL</span>
          </button>
        </div>
        <div className="chat-composer-help">
          <span className="chat-sr-only">Enter để gửi · Shift + Enter xuống dòng</span>
          <span>{draft.length}/2000</span>
        </div>
      </div>

      {/* URL Input Modal */}
      {showUrlModal && (
        <div
          className="chat-url-modal-backdrop"
          onClick={() => setShowUrlModal(false)}
        >
          <div
            className="chat-url-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-slate-800 mb-2">
              Chèn liên kết Media
            </h4>
            <div className="flex items-center gap-3 mb-3 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  checked={urlType === "image"}
                  onChange={() => setUrlType("image")}
                />
                <span>Hình ảnh</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="mediaType"
                  checked={urlType === "video"}
                  onChange={() => setUrlType("video")}
                />
                <span>Video</span>
              </label>
            </div>
            <input
              type="url"
              className="chat-url-input"
              placeholder={
                urlType === "image"
                  ? "https://example.com/image.jpg"
                  : "https://example.com/video.mp4"
              }
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                className="chat-url-cancel-btn"
                onClick={() => setShowUrlModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="chat-url-confirm-btn"
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
              >
                Chèn
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
