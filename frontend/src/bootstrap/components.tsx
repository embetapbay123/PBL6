import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { rememberAuthReturn } from "../features/customer/auth/auth-return";
import { ApiError } from "../api/client";
import { useAuth } from "../api/auth-context";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { LoadingState, EmptyState } from "../components/ui/Skeleton";
import { CopyButton } from "../components/CopyButton";
export function ErrorView({
  error,
  onRetry,
  retryBusy = false,
}: {
  error: unknown;
  onRetry?: () => void;
  retryBusy?: boolean;
}) {
  const value = error instanceof ApiError ? error : undefined;
  return (
    <Alert level="error" className="ui-error-view">
      <p>{value?.message ?? "Có lỗi xảy ra."}</p>
      {value?.correlationId && (
        <div className="ui-error-support">
          <span>Mã yêu cầu</span>
          <code>{value.correlationId}</code>
          <CopyButton
            value={value.correlationId}
            label="Sao chép mã yêu cầu"
            compact
          />
        </div>
      )}
      {onRetry && (
        <div className="ui-actions">
          <Button
            variant="secondary"
            size="sm"
            loading={retryBusy}
            onClick={onRetry}
          >
            Thử lại
          </Button>
        </div>
      )}
    </Alert>
  );
}
export function Loading(props: {
  label?: string;
  variant?: "inline" | "cards" | "rows";
}) {
  return <LoadingState {...props} />;
}
export function Empty({ children }: { children: ReactNode }) {
  return <EmptyState>{children}</EmptyState>;
}
export function Pagination({
  page,
  size,
  total,
  onPage,
}: {
  page: number;
  size: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="boot-pagination">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Trang trước
      </Button>
      <span>
        Trang {page} · {total} kết quả
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page * size >= total}
        onClick={() => onPage(page + 1)}
      >
        Trang sau
      </Button>
    </div>
  );
}
export function FormPanel({
  title,
  busy,
  disabled = false,
  error,
  onSubmit,
  children,
}: {
  title: string;
  busy: boolean;
  disabled?: boolean;
  error?: unknown;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="boot-card">
      <h2>{title}</h2>
      {children}
      <div className="ui-actions">
        <Button type="submit" loading={busy} disabled={disabled}>
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </div>
      {error != null && <ErrorView error={error} />}
    </form>
  );
}
export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: string[];
  children: ReactNode;
}) {
  const { session } = useAuth(),
    location = useLocation();
  if (!session)
    return (
      <section className="boot-card">
        <p>Đăng nhập để tiếp tục.</p>
        <Link to="/login" onClick={() => rememberAuthReturn(location.pathname)}>
          Đăng nhập
        </Link>
      </section>
    );
  if (roles && !session.context?.roles.some((role) => roles.includes(role)))
    return <PermissionDenied />;
  return <>{children}</>;
}
function PermissionDenied() {
  const { refreshContext } = useAuth(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    alive = useRef(true),
    flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function retry() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await refreshContext();
    } catch (value) {
      if (alive.current) setError(value);
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="boot-card">
      <ErrorView
        error={
          error ??
          new ApiError(403, "FORBIDDEN", "Bạn không có quyền mở trang này.")
        }
        onRetry={() => void retry()}
        retryBusy={busy}
      />
      <p>
        Nếu quyền vừa được cấp lại hoặc Store được mở khóa, thử lại để đọc quyền
        hiện hành.
      </p>
    </section>
  );
}

export function OwnerLanding({
  owner,
  feature,
}: {
  owner: string;
  feature: string;
}) {
  return (
    <section className="boot-card">
      <h2>{feature}</h2>
      <p>{owner} triển khai theo contract và task đã giao.</p>
      <p>Chưa có nghiệp vụ hoạt động tại màn này.</p>
    </section>
  );
}
