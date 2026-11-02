import {useEffect, useState} from 'react';

export const sellerPermissions = [
  ['product.store.read_write', 'Quản lý sản phẩm'],
  ['inventory.store.read_adjust', 'Xem và điều chỉnh kho'],
  ['order.store.read_status_cancel', 'Xem và xử lý đơn hàng'],
  ['cod.store.collect', 'Ghi nhận thu COD'],
] as const;

export const invitationLabels: Record<string, string> = {
  PENDING: 'Đang chờ chấp nhận', ACCEPTED: 'Đã chấp nhận', REVOKED: 'Đã thu hồi', EXPIRED: 'Đã hết hạn',
};
export function invitationStatus(item: {status?: string; expires_at?: string}, now: number) {
  if (item.status === 'PENDING' && (!item.expires_at || !Number.isFinite(Date.parse(item.expires_at)))) return 'UNKNOWN';
  return item.status === 'PENDING' && Date.parse(item.expires_at!) <= now ? 'EXPIRED' : item.status ?? 'UNKNOWN';
}
export function invitationTime(value?: string) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'}) + ' (UTC+7)'
    : 'Chưa có thời điểm hợp lệ';
}
/** Disable an expired invitation even if the page stays open; the API remains authoritative. */
export function useInvitationClock(items: {status?: string; expires_at?: string}[]) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const current = Date.now(); setNow(current);
      const deadlines = items.filter(i => i.status === 'PENDING').map(i => Date.parse(i.expires_at ?? '')).filter(t => t > current);
      if (deadlines.length) timer = setTimeout(update, Math.min(2147483647, Math.max(1, Math.min(...deadlines) - current)));
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {clearTimeout(timer); document.removeEventListener('visibilitychange', update);};
  }, [items]);
  return now;
}
