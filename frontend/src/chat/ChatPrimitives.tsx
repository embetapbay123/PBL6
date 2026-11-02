import { useId, type FormEvent } from "react";
import { ArrowUp, LoaderCircle, MessageSquare } from "lucide-react";
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
export function ChatPages(props: Parameters<typeof Pagination>[0]) {
  return props.total > props.size ? <Pagination {...props} /> : null;
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
  return (
    <form className="chat-composer" onSubmit={onSubmit}>
      <div className="chat-composer-box">
        <label className="chat-sr-only" htmlFor={inputId}>
          {label}
        </label>
        <textarea
          id={inputId}
          rows={2}
          required
          maxLength={2000}
          value={draft}
          placeholder={placeholder}
          disabled={busy || locked}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          aria-label={buttonText}
          title={buttonText}
          disabled={busy || disabled}
        >
          {busy ? (
            <LoaderCircle size={18} className="chat-spinner" />
          ) : (
            <ArrowUp size={19} />
          )}
        </button>
      </div>
      <div className="chat-composer-help">
        <span>Enter để gửi · Shift + Enter xuống dòng</span>
        <span>{draft.length}/2000</span>
      </div>
    </form>
  );
}
