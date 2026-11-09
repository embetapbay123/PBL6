import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../api/auth-context";
import { ApiError, isUncertainMutation } from "../../api/client";
import {
  getPersonalizationConsent,
  updatePersonalizationConsent,
  type PersonalizationConsentView,
} from "../../api/consent";
import { ErrorView, Loading } from "../../bootstrap/components";
import { Button } from "../../components/ui/Button";

export function ConsentSettings() {
  const { session } = useAuth();
  return <Consent key={session?.context?.user_id ?? "guest"} />;
}

function Consent() {
  const [data, setData] = useState<PersonalizationConsentView>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  const flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(undefined);
    setError(undefined);
    getPersonalizationConsent()
      .then(value => {
        if (active) {
          setData(value);
          setStale(false);
        }
      })
      .catch(cause => { if (active) setError(cause); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const enabled = data?.status === "GRANTED";
  async function toggle() {
    if (!data || stale || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const value = await updatePersonalizationConsent({
        status: enabled ? "WITHDRAWN" : "GRANTED",
        expected_version: data.version,
      });
      if (alive.current) setData(value);
    } catch (cause) {
      if (alive.current) {
        setError(cause);
        if (isUncertainMutation(cause) || (cause instanceof ApiError && cause.status === 409)) setStale(true);
      }
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <section className="boot-card personalization-settings">
      <div className="personalization-heading">
        <h2>Gợi ý cá nhân hóa</h2>
        {data && (
          <span className={"market-badge" + (enabled && !stale ? " is-success" : "")} role="status">
            {stale ? "Chưa xác nhận" : enabled ? "Đang bật" : "Đang tắt"}
          </span>
        )}
      </div>
      <p>Khi bật, hệ thống lưu lịch sử tìm kiếm và dùng các sản phẩm bạn xem, thêm vào giỏ hoặc mua để cá nhân hóa gợi ý.</p>
      {loading && <Loading />}
      {error != null && <ErrorView error={error} onRetry={() => setRetry(value => value + 1)} />}
      {stale && data && <p>Đọc lại trạng thái trước khi thay đổi tiếp.</p>}
      {data && !loading && (
        <>
          {enabled && !stale && <p>Tắt cá nhân hóa sẽ xóa lịch sử dùng để gợi ý.</p>}
          <Button variant={enabled ? "secondary" : "primary"} loading={busy} disabled={stale} onClick={() => void toggle()}>
            {enabled ? "Tắt cá nhân hóa" : "Cho phép cá nhân hóa"}
          </Button>
          <details className="personalization-support">
            <summary>Thông tin kỹ thuật</summary>
            <dl>
              <div><dt>Trạng thái</dt><dd><code>{data.status}</code></dd></div>
              <div><dt>Phiên bản</dt><dd>{data.version}</dd></div>
            </dl>
          </details>
        </>
      )}
    </section>
  );
}

export default ConsentSettings;
